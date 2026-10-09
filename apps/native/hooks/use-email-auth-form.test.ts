// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loginWithEmail, registerWithEmail } from "@/api/login";
import { hapticError, hapticSuccess } from "@/lib/haptics";
import { useEmailAuthForm } from "./use-email-auth-form";

vi.mock("@/api/login", () => ({ loginWithEmail: vi.fn(), registerWithEmail: vi.fn() }));
vi.mock("@/lib/haptics", () => ({ hapticError: vi.fn(), hapticSuccess: vi.fn() }));
vi.mock("gt-react-native", () => ({ useGT: () => (message: string) => message }));

describe("email auth form", () => {
  let root: Root;
  let form: ReturnType<typeof useEmailAuthForm>;
  let container: HTMLDivElement;

  function Harness({ isLogin }: { isLogin: boolean }) {
    form = useEmailAuthForm(isLogin);
    return createElement(
      "form",
      {
        "data-submitting": form.formState.isSubmitting,
        "data-errors": Object.keys(form.formState.errors).join(","),
      },
      ...(["email", "password", "confirmPassword"] as const).map((name) =>
        createElement("input", { key: name, ...form.register(name) }),
      ),
    );
  }

  function render(isLogin = true) {
    act(() => root.render(createElement(Harness, { isLogin })));
  }

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    vi.resetAllMocks();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    render();
    act(() => {
      form.setValue("email", " review@example.com ");
      form.setValue("password", "password");
      form.setValue("confirmPassword", "password");
    });
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it.each([true, false])("blocks overlapping submissions in login mode %s", async (isLogin) => {
    render(isLogin);
    const api = isLogin ? loginWithEmail : registerWithEmail;
    let complete!: () => void;
    vi.mocked(api).mockReturnValue(new Promise<void>((resolve) => (complete = resolve)));
    let pending!: Promise<void>;
    await act(async () => {
      pending = form.submit();
      await form.submit();
    });
    expect(api).toHaveBeenCalledExactlyOnceWith("review@example.com", "password");
    expect(form.formState.isSubmitting).toBe(true);
    await act(async () => form.submit());
    expect(api).toHaveBeenCalledTimes(1);
    expect(form.formState.isSubmitting).toBe(true);
    await act(async () => {
      complete();
      await pending;
    });
    expect(form.formState.isSubmitting).toBe(false);
    expect(hapticSuccess).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["email", "", "Enter your email."],
    ["email", "invalid", "Please enter a valid email address."],
    ["password", "", "Enter your password."],
    ["password", "short", "Password must be at least 6 characters."],
    ["confirmPassword", "different", "Passwords do not match."],
  ] as const)("validates and focuses %s with value %s", async (field, value, message) => {
    render(false);
    act(() => form.setValue(field, value));
    await act(async () => form.submit());
    expect(form.formState.errors[field]?.message).toBe(message);
    expect(document.activeElement).toBe(container.querySelector(`[name="${field}"]`));
    expect(loginWithEmail).not.toHaveBeenCalled();
    expect(registerWithEmail).not.toHaveBeenCalled();
    expect(hapticError).toHaveBeenCalledTimes(1);
    expect(form.formState.isSubmitting).toBe(false);
    // Correcting the field must also release the submission lock.
    act(() => form.setValue(field, field === "email" ? "review@example.com" : "password"));
    await act(async () => form.submit());
    expect(registerWithEmail).toHaveBeenCalledTimes(1);
  });

  it("does not validate confirmation after switching to login", async () => {
    render(false);
    act(() => form.setValue("confirmPassword", "different"));
    await act(async () => form.submit());
    render(true);
    await act(async () => form.submit());
    expect(loginWithEmail).toHaveBeenCalledExactlyOnceWith("review@example.com", "password");
    expect(form.formState.errors.confirmPassword).toBeUndefined();
  });

  it("stores server errors at the root and allows retry", async () => {
    vi.mocked(loginWithEmail).mockRejectedValueOnce(new Error("Invalid credentials"));
    await act(async () => form.submit());
    expect(form.formState.errors.root?.server.message).toBe("Invalid credentials");
    expect(form.formState.isSubmitting).toBe(false);
    expect(hapticSuccess).not.toHaveBeenCalled();
    expect(hapticError).toHaveBeenCalledTimes(1);
    await act(async () => form.submit());
    expect(loginWithEmail).toHaveBeenCalledTimes(2);
    expect(form.formState.errors.root).toBeUndefined();
    expect(hapticSuccess).toHaveBeenCalledTimes(1);
  });
});
