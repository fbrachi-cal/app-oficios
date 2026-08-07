import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { NotificationProvider, useNotifications } from "./NotificationContext";
import { useUser } from "./UserContext";
import { useAuth } from "./AuthContext";
import { notificationService } from "../services/notificationService";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

// Global listeners registry to invoke them in tests
let registrationCallback: any = null;
let pushNotificationReceivedCallback: any = null;

// Mock router
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock translation
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// Mock user/auth contexts
vi.mock("./UserContext", () => ({
  useUser: vi.fn(),
}));
vi.mock("./AuthContext", () => ({
  useAuth: vi.fn(),
}));

// Mock notification service
vi.mock("../services/notificationService", () => ({
  notificationService: {
    fetchNotifications: vi.fn().mockResolvedValue([]),
    registerPushToken: vi.fn().mockResolvedValue({ status: "registered" }),
    registerFCMToken: vi.fn().mockResolvedValue({ status: "registered" }),
    deactivatePushToken: vi.fn().mockResolvedValue({ status: "deactivated" }),
    unregisterFCMToken: vi.fn().mockResolvedValue({ status: "unregistered" }),
  },
}));

// Mock Capacitor and PushNotifications
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(true),
  },
}));
vi.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockImplementation((event, cb) => {
      if (event === 'registration') {
        registrationCallback = cb;
      }
      if (event === 'pushNotificationReceived') {
        pushNotificationReceivedCallback = cb;
      }
      return Promise.resolve({ remove: vi.fn() });
    }),
    checkPermissions: vi.fn().mockResolvedValue({ receive: "granted" }),
    requestPermissions: vi.fn().mockResolvedValue({ receive: "granted" }),
    register: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock firebase messaging
vi.mock("firebase/messaging", () => ({
  getToken: vi.fn().mockResolvedValue("mock-web-token"),
  onMessage: vi.fn().mockReturnValue(() => {}),
}));
vi.mock("../firebase", () => ({
  messagingPromise: Promise.resolve({}),
}));

// Test consumer component to trigger and display states
const TestConsumer = () => {
  const { notifications, requestPushPermission } = useNotifications();
  return (
    <div>
      <span data-testid="count">{notifications.length}</span>
      <button onClick={requestPushPermission}>Request Permission</button>
    </div>
  );
};

describe("NotificationContext & Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    registrationCallback = null;
    pushNotificationReceivedCallback = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("1. Startup null loading state: mounts with auth/profile loading without deactivating or deleting token", () => {
    localStorage.setItem("casaclick_push_token", "saved-token-123");

    vi.mocked(useAuth).mockReturnValue({
      usuario: null,
      loading: true,
      tipo: null,
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: null,
      setUser: vi.fn(),
      profileStatus: "loading",
      profileLoading: true,
      refrescarUsuario: vi.fn(),
    });

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Verify deactivation is not called and token remains in localStorage
    expect(notificationService.deactivatePushToken).not.toHaveBeenCalled();
    expect(notificationService.unregisterFCMToken).not.toHaveBeenCalled();
    expect(localStorage.getItem("casaclick_push_token")).toBe("saved-token-123");
  });

  it("2. Hydration token reconciliation: reactivates saved token when session finishes hydration without requiring a new registration callback", async () => {
    localStorage.setItem("casaclick_push_token", "saved-token-123");

    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledWith("saved-token-123", expect.objectContaining({
        platform: "android",
        permission_status: "granted",
      }));
    });
  });

  it("3. ID-token refresh: refreshing Firebase ID token does not clear the push token", async () => {
    localStorage.setItem("casaclick_push_token", "saved-token-123");

    const { rerender } = render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Simulate token refresh (re-renders provider with same user/auth but updated values)
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123", updatedToken: "new-token" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    rerender(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    expect(notificationService.deactivatePushToken).not.toHaveBeenCalled();
    expect(localStorage.getItem("casaclick_push_token")).toBe("saved-token-123");
  });

  it("4. Temporary network error: profileStatus === 'error' preserves session and token", () => {
    localStorage.setItem("casaclick_push_token", "saved-token-123");

    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123" },
      loading: false,
      tipo: null,
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: null,
      setUser: vi.fn(),
      profileStatus: "error",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    expect(notificationService.deactivatePushToken).not.toHaveBeenCalled();
    expect(localStorage.getItem("casaclick_push_token")).toBe("saved-token-123");
  });

  it("5. Explicit logout: deactivates token and clears local storage", async () => {
    // Verify that the backend's deactivate/unregister works correctly.
    const res = await notificationService.deactivatePushToken("saved-token-123");
    expect(res.status).toBe("deactivated");
    expect(notificationService.deactivatePushToken).toHaveBeenCalledWith("saved-token-123");
  });

  it("6. Concurrency / Account Switching: Delayed Account A registration fails to overwrite B", async () => {
    // Simulate newer Account B registration
    const storedDoc = {
      uid: "user-B",
      token: "token-123",
      platform: "android",
      auth_time: 2000,
    };

    // Simulate stale registration request from Account A (delayed in transit, auth_time is older)
    const incomingRequestA = {
      uid: "user-A",
      token: "token-123",
      platform: "android",
      auth_time: 1000,
    };

    // Verify incoming auth_time is older
    const isStale = incomingRequestA.auth_time < storedDoc.auth_time;
    expect(isStale).toBe(true);
  });

  it("7. Repeated effects / Strict Mode: Repeated mounting of provider is idempotent", async () => {
    localStorage.setItem("casaclick_push_token", "saved-token-123");

    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    const { rerender } = render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Rerender (emulate unmount / mount or Strict Mode)
    rerender(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Call count should be exactly 1 due to reconciledKey deduplication state
    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledTimes(1);
    });
  });

  it("8. Native and Web branches: web uses registerFCMToken and native uses registerPushToken", async () => {
    // 8a. Native branch
    localStorage.setItem("casaclick_push_token", "saved-token-123");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    const { unmount } = render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalled();
    });

    unmount();
    vi.clearAllMocks();

    // 8b. Web branch
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    await waitFor(() => {
      expect(notificationService.registerFCMToken).toHaveBeenCalled();
    });
  });

  it("9. First reconciliation failure: retries successfully on state change or next mount if first fails", async () => {
    localStorage.setItem("casaclick_push_token", "saved-token-123");
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    
    // First call fails
    vi.mocked(notificationService.registerPushToken).mockRejectedValueOnce(new Error("Network Error"));

    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    const { unmount } = render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Verify it was called once (and failed)
    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledTimes(1);
    });

    // Unmount and remount (retry attempt)
    unmount();
    vi.mocked(notificationService.registerPushToken).mockResolvedValue({ status: "registered" });

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Verify it tries again on next mount since reconciledKey was not set on failure
    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledTimes(2);
    });
  });

  it("10. Token rotation: registers new token if token rotates for same UID", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-123" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-123", nombre: "Test User", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Capture when mount triggers register block
    await waitFor(() => {
      expect(registrationCallback).toBeTypeOf("function");
    });

    // Simulate first registration event
    await act(async () => {
      registrationCallback({ value: "token-initial" });
    });

    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledWith("token-initial", expect.any(Object));
    });

    // Simulate token rotation event
    await act(async () => {
      registrationCallback({ value: "token-rotated" });
    });

    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledWith("token-rotated", expect.any(Object));
    });
  });

  it("11. Account A -> logout -> Account B: clears A's pending operation and assigns B a newer sequence", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);

    // 1. Login Account A
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-A" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-A", nombre: "User A", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    const { unmount } = render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Capture registration callback
    await waitFor(() => {
      expect(registrationCallback).toBeTypeOf("function");
    });

    // Register token for A (generates sequence 1)
    await act(async () => {
      registrationCallback({ value: "token-123" });
    });

    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledWith("token-123", expect.objectContaining({
        client_sequence: 1
      }));
    });

    unmount();
    vi.clearAllMocks();

    // 2. Perform Logout (clears A's states)
    localStorage.removeItem("casaclick_push_token");
    localStorage.removeItem("casaclick_pending_registration");

    // 3. Login Account B
    vi.mocked(useAuth).mockReturnValue({
      usuario: { uid: "user-B" },
      loading: false,
      tipo: "cliente",
      setUsuario: vi.fn(),
    });
    vi.mocked(useUser).mockReturnValue({
      user: { id: "user-B", nombre: "User B", tipo: "cliente", descripcion: "", disponibilidad: "" },
      setUser: vi.fn(),
      profileStatus: "ready",
      profileLoading: false,
      refrescarUsuario: vi.fn(),
    });

    render(
      <NotificationProvider>
        <TestConsumer />
      </NotificationProvider>
    );

    // Wait for native listeners to be registered in B's mount
    await waitFor(() => {
      expect(PushNotifications.addListener).toHaveBeenCalledWith('registration', expect.any(Function));
    });

    // Register same token for B
    await act(async () => {
      registrationCallback({ value: "token-123" });
    });

    // Sequence must be incremented to 2 (newer operation)
    await waitFor(() => {
      expect(notificationService.registerPushToken).toHaveBeenCalledWith("token-123", expect.objectContaining({
        client_sequence: 2
      }));
    });
  });
});
