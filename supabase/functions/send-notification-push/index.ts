type NotificationRecord = {
  id: string;
  receiver_id: string;
  text: string | null;
  type: number | null;
  entity_id: string | null;
};

type WebhookPayload = {
  record?: NotificationRecord;
};

type ExpoPushMessage = {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data: {
    notificationId: string;
    type: number | null;
    entityId: string | null;
    url: string | null;
  };
};

type ExpoPushTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: {
    error?: string;
  };
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_PUSH_CHUNK_SIZE = 100;

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function getNotificationUrl(record: NotificationRecord) {
  switch (record.type) {
    case 1:
      return record.entity_id ? `/wishlists/${record.entity_id}` : null;
    case 2:
      return "/friends";
    case 0:
      return "/secret-santa";
    default:
      return null;
  }
}

function getSupabaseRestHeaders() {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function getPushTokens(record: NotificationRecord) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");

  const response = await fetch(
    `${supabaseUrl}/rest/v1/notification_push_tokens?select=expo_push_token&user_id=eq.${record.receiver_id}&enabled=is.true`,
    {
      headers: getSupabaseRestHeaders(),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load push tokens: ${response.status}`);
  }

  const rows = (await response.json()) as { expo_push_token?: string }[];
  return rows.map((row) => row.expo_push_token).filter((token): token is string => Boolean(token));
}

async function disablePushToken(expoPushToken: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");

  await fetch(
    `${supabaseUrl}/rest/v1/notification_push_tokens?expo_push_token=eq.${encodeURIComponent(expoPushToken)}`,
    {
      method: "PATCH",
      headers: {
        ...getSupabaseRestHeaders(),
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        enabled: false,
        updated_at: new Date().toISOString(),
      }),
    },
  );
}

async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  let sent = 0;
  let disabled = 0;

  for (const chunk of chunkArray(messages, EXPO_PUSH_CHUNK_SIZE)) {
    const response = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chunk),
    });

    if (!response.ok) {
      throw new Error(`Expo push request failed: ${response.status}`);
    }

    const result = (await response.json()) as { data?: ExpoPushTicket[] };
    const tickets = result.data ?? [];
    sent += tickets.filter((ticket) => ticket.status === "ok").length;

    await Promise.all(
      tickets.map(async (ticket, index) => {
        if (ticket.details?.error !== "DeviceNotRegistered") return;

        await disablePushToken(chunk[index].to);
        disabled += 1;
      }),
    );
  }

  return { sent, disabled };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const expectedSecret = Deno.env.get("NOTIFICATION_PUSH_WEBHOOK_SECRET");
  const receivedSecret = request.headers.get("x-notification-webhook-secret");

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const payload = (await request.json()) as WebhookPayload | NotificationRecord;
  const record = "record" in payload ? payload.record : payload;

  if (!record?.id || !record.receiver_id) {
    return jsonResponse(400, { error: "Invalid notification payload" });
  }

  const tokens = await getPushTokens(record);
  if (tokens.length === 0) {
    return jsonResponse(200, { sent: 0, disabled: 0 });
  }

  const body = record.text?.trim() || "You have a new notification.";
  const url = getNotificationUrl(record);
  const messages = tokens.map((token) => ({
    to: token,
    sound: "default" as const,
    title: "Wishlane",
    body,
    data: {
      notificationId: record.id,
      type: record.type,
      entityId: record.entity_id,
      url,
    },
  }));

  const result = await sendExpoPushMessages(messages);
  return jsonResponse(200, result);
});
