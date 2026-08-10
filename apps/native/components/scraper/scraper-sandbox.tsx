import {
  type BridgeMessage,
  buildAutoScrapeScript,
  buildBundleScript,
  buildParseScript,
  nextRequestId,
  parseBridgeMessage,
} from "@/lib/scraper/bridge-protocol";
import {
  HTTP_ERROR_GRACE_MS,
  PARSER_HTML,
  PARSER_READY_TIMEOUT_MS,
  PARSE_TIMEOUT_MS,
  RENDER_TIMEOUT_MS,
} from "@/lib/scraper/constants";
import { type SandboxParseResult, registerSandboxBridge } from "@/lib/scraper/sandbox-bridge";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

/**
 * Two hidden WebViews behind the on-device scraper:
 *
 *  - `parser` stays on a blank page with the extractor bundle evaluated, and
 *    parses HTML that tier 1 fetched — a real DOM without a page load.
 *  - `browser` mounts only for a tier-2 scrape and navigates to the target
 *    itself, so the site sees a stock engine on the user's own connection.
 *
 * Mounted once from the root layout; renders nothing visible.
 */

type BrowserTask = { id: string; url: string };

type PendingRequest = {
  resolve: (value: SandboxParseResult) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

export function ScraperSandbox() {
  const parserRef = useRef<WebView>(null);
  const pendingRef = useRef(new Map<string, PendingRequest>());
  const parserReadyRef = useRef(false);
  const readyWaitersRef = useRef<(() => void)[]>([]);
  const queueRef = useRef<BrowserTask[]>([]);
  const [browserTask, setBrowserTask] = useState<BrowserTask | null>(null);
  const [mounted, setMounted] = useState(false);

  // Instantiating a WebView is native work; keep it off the first frames.
  useEffect(() => {
    const handle = InteractionManager.runAfterInteractions(() => setMounted(true));
    return () => handle.cancel();
  }, []);

  // --- Request tracking ----------------------------------------------------

  const trackRequest = useCallback(
    (id: string, timeoutMs: number, onTimeout?: () => void) =>
      new Promise<SandboxParseResult>((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingRef.current.delete(id);
          onTimeout?.();
          reject(new Error("sandbox_timeout"));
        }, timeoutMs);
        pendingRef.current.set(id, { resolve, reject, timer });
      }),
    [],
  );

  const settleRequest = useCallback((message: BridgeMessage) => {
    const id = message.id;
    if (!id) return;
    const pending = pendingRef.current.get(id);
    if (!pending) return;

    pendingRef.current.delete(id);
    clearTimeout(pending.timer);

    if (message.type === "scrape-result" && message.product && message.quality) {
      pending.resolve({ product: message.product, quality: message.quality });
      return;
    }
    pending.reject(new Error(message.error ?? "scrape_failed"));
  }, []);

  // --- Browser task queue --------------------------------------------------

  const startNextBrowserTask = useCallback(() => {
    setBrowserTask(queueRef.current.shift() ?? null);
  }, []);

  const finishBrowserTask = useCallback(
    (message: BridgeMessage) => {
      settleRequest(message);
      startNextBrowserTask();
    },
    [settleRequest, startNextBrowserTask],
  );

  const dropBrowserTask = useCallback(
    (id: string) => {
      queueRef.current = queueRef.current.filter((task) => task.id !== id);
      setBrowserTask((current) => (current?.id === id ? null : current));
      startNextBrowserTask();
    },
    [startNextBrowserTask],
  );

  // Let the in-page extractor finish before reporting a transport failure: a
  // page that renders despite a 403/429 should not be thrown away.
  const failBrowserTaskAfterGrace = useCallback(
    (id: string, error: string) => {
      setTimeout(() => {
        if (!pendingRef.current.has(id)) return;
        finishBrowserTask({ type: "scrape-error", id, error });
      }, HTTP_ERROR_GRACE_MS);
    },
    [finishBrowserTask],
  );

  // --- Parser readiness ----------------------------------------------------

  const waitForParser = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        if (parserReadyRef.current) {
          resolve();
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("parser_sandbox_unavailable"));
        }, PARSER_READY_TIMEOUT_MS);

        readyWaitersRef.current.push(() => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve();
        });
      }),
    [],
  );

  const markParserReady = useCallback(() => {
    parserReadyRef.current = true;
    const waiters = readyWaitersRef.current;
    readyWaitersRef.current = [];
    for (const waiter of waiters) waiter();
  }, []);

  // --- Bridge --------------------------------------------------------------

  const bridge = useMemo(
    () => ({
      parseHtml: async (html: string, url: string) => {
        await waitForParser();
        const id = nextRequestId("parse");
        const promise = trackRequest(id, PARSE_TIMEOUT_MS);
        parserRef.current?.injectJavaScript(buildParseScript(id, url, html));
        return promise;
      },

      renderAndScrape: (url: string) => {
        const task: BrowserTask = { id: nextRequestId("render"), url };
        const promise = trackRequest(task.id, RENDER_TIMEOUT_MS, () => dropBrowserTask(task.id));

        setBrowserTask((current) => {
          if (!current) return task;
          queueRef.current.push(task);
          return current;
        });
        return promise;
      },
    }),
    [dropBrowserTask, trackRequest, waitForParser],
  );

  useEffect(() => {
    registerSandboxBridge(bridge);
    return () => {
      registerSandboxBridge(null);
      for (const pending of pendingRef.current.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("sandbox_unmounted"));
      }
      pendingRef.current.clear();
    };
  }, [bridge]);

  // --- Message handlers ----------------------------------------------------

  const handleParserMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseBridgeMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === "scrape-ready") {
        markParserReady();
        return;
      }
      settleRequest(message);
    },
    [markParserReady, settleRequest],
  );

  const handleBrowserMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseBridgeMessage(event.nativeEvent.data);
      if (!message || message.type === "scrape-ready") return;
      finishBrowserTask(message);
    },
    [finishBrowserTask],
  );

  if (!mounted) return null;

  return (
    <View
      style={styles.hidden}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <WebView
        ref={parserRef}
        source={{ html: PARSER_HTML }}
        injectedJavaScript={buildBundleScript()}
        onMessage={handleParserMessage}
        javaScriptEnabled
        originWhitelist={["*"]}
      />
      {browserTask ? (
        <BrowserWebView
          task={browserTask}
          onMessage={handleBrowserMessage}
          onFail={finishBrowserTask}
          onHttpError={failBrowserTaskAfterGrace}
        />
      ) : null}
    </View>
  );
}

function BrowserWebView({
  task,
  onMessage,
  onFail,
  onHttpError,
}: {
  task: BrowserTask;
  onMessage: (event: WebViewMessageEvent) => void;
  onFail: (message: BridgeMessage) => void;
  onHttpError: (id: string, error: string) => void;
}) {
  const script = buildAutoScrapeScript(task.id);

  return (
    <WebView
      key={task.id}
      source={{ uri: task.url }}
      // Before content load so pages that never finish loading still get
      // scraped; again at load end as a safety net. The loop only runs once.
      injectedJavaScriptBeforeContentLoaded={script}
      injectedJavaScript={script}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled
      thirdPartyCookiesEnabled
      cacheEnabled
      incognito={false}
      originWhitelist={["http://*", "https://*"]}
      onShouldStartLoadWithRequest={(request) =>
        request.url.startsWith("http://") || request.url.startsWith("https://")
      }
      onError={(event) => {
        if (!isMainFrame(event.nativeEvent.url, task.url)) return;
        onFail({ type: "scrape-error", id: task.id, error: "webview_error" });
      }}
      onHttpError={(event) => {
        if (!isMainFrame(event.nativeEvent.url, task.url)) return;
        onHttpError(task.id, `http_${event.nativeEvent.statusCode}`);
      }}
    />
  );
}

/** Error events do not flag the frame, so compare origins instead. */
function isMainFrame(errorUrl: string | undefined, taskUrl: string): boolean {
  if (!errorUrl) return true;
  try {
    return new URL(errorUrl).origin === new URL(taskUrl).origin;
  } catch {
    return true;
  }
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 0,
    height: 0,
    opacity: 0,
    overflow: "hidden",
  },
});
