import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePhoneVerification } from "./usePhoneVerification";
import { signInWithPhoneNumber, linkWithCredential } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

vi.mock("firebase/auth", () => ({
  signInWithPhoneNumber: vi.fn(),
  linkWithCredential: vi.fn(),
  PhoneAuthProvider: {
    credential: vi.fn().mockReturnValue({ providerId: "phone" }),
  },
  RecaptchaVerifier: vi.fn().mockImplementation(function() {
    return {
      render: vi.fn().mockResolvedValue(true),
      clear: vi.fn(),
    };
  }),
}));

vi.mock("../firebase", () => ({
  auth: {
    currentUser: {
      reload: vi.fn().mockResolvedValue(undefined),
      getIdToken: vi.fn().mockResolvedValue("mock-id-token"),
    },
    app: {
      options: {},
    },
    settings: {},
  },
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("usePhoneVerification hook", () => {
  const mockSetUsuario = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      usuario: auth.currentUser,
      tipo: null,
      loading: false,
      setUsuario: mockSetUsuario,
    });
  });

  it("should initialize in unverified state", () => {
    const { result } = renderHook(() => usePhoneVerification());
    expect(result.current.verificado).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("should initialize RecaptchaVerifier with invisible size and clean it up", async () => {
    const { result, unmount } = renderHook(() => usePhoneVerification());

    const container = document.createElement("div");
    container.id = "recaptcha-container";
    document.body.appendChild(container);

    const mockConfirmationResult = {
      verificationId: "mock-v-id",
      confirm: vi.fn(),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult as any);

    await act(async () => {
      await result.current.enviarSMS("+5491112345678");
    });

    const { RecaptchaVerifier } = await import("firebase/auth");
    expect(RecaptchaVerifier).toHaveBeenCalledWith(
      expect.anything(),
      "recaptcha-container",
      expect.objectContaining({ size: "invisible" })
    );

    // Verify cleanup
    unmount();
    expect(window.recaptchaVerifier).toBeUndefined();

    document.body.removeChild(container);
  });

  it("should successfully link credential and update centralized auth state", async () => {
    const mockConfirmationResult = {
      verificationId: "mock-v-id",
      confirm: vi.fn(),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult as any);
    vi.mocked(linkWithCredential).mockResolvedValue({} as any);

    const { result } = renderHook(() => usePhoneVerification());

    // Mock the DOM element required by recaptcha
    const container = document.createElement("div");
    container.id = "recaptcha-container";
    document.body.appendChild(container);

    let sendSuccess;
    await act(async () => {
      sendSuccess = await result.current.enviarSMS("+5491112345678");
    });

    expect(sendSuccess).toBe(true);
    expect(result.current.confirmationResult).toBe(mockConfirmationResult);

    let confirmSuccess;
    await act(async () => {
      confirmSuccess = await result.current.confirmarCodigo("123456");
    });

    expect(confirmSuccess).toBe(true);
    expect(result.current.verificado).toBe(true);
    expect(linkWithCredential).toHaveBeenCalled();
    expect(auth.currentUser?.reload).toHaveBeenCalled();
    expect(auth.currentUser?.getIdToken).toHaveBeenCalledWith(true);
    expect(mockSetUsuario).toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it("REGRESSION: should verify that verification links credentials to the current user, maintains the same UID, and does not perform independent sign-in", async () => {
    const mockConfirmationResult = {
      verificationId: "mock-v-id",
      confirm: vi.fn(),
    };
    vi.mocked(signInWithPhoneNumber).mockResolvedValue(mockConfirmationResult as any);
    vi.mocked(linkWithCredential).mockResolvedValue({} as any);

    const originalUid = "user-123-constant";
    // Force the current user UID in mock
    (auth.currentUser as any).uid = originalUid;

    const { result } = renderHook(() => usePhoneVerification());

    const container = document.createElement("div");
    container.id = "recaptcha-container";
    document.body.appendChild(container);

    await act(async () => {
      await result.current.enviarSMS("+5491112345678");
    });
    
    await act(async () => {
      await result.current.confirmarCodigo("123456");
    });

    // Proves linkWithCredential was called on the currentUser
    expect(linkWithCredential).toHaveBeenCalledWith(auth.currentUser, expect.any(Object));
    // Proves the Firebase confirmationResult.confirm (which would sign in independently/switch user) was NEVER called
    expect(mockConfirmationResult.confirm).not.toHaveBeenCalled();
    // Proves the UID remains the same original UID
    expect(auth.currentUser?.uid).toBe(originalUid);

    document.body.removeChild(container);
  });
});
