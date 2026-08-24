import React, { createContext, useContext, useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { messagingPromise } from "../firebase";
import { useUser } from "./UserContext";
import { useAuth } from "./AuthContext";
import { notificationService } from "../services/notificationService";
import { useTranslation } from "react-i18next";
import { logger } from "../utils/logger";
import { FiBell, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

interface NotificationType {
  id: string;
  recipient_uid: string;
  actor_uid: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
}

interface NotificationContextProps {
  notifications: NotificationType[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestPushPermission: () => Promise<void>;
  showPermissionPrompt: boolean;
  dismissPermissionPrompt: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profileStatus } = useUser();
  const { usuario, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);
  const [reconciledKey, setReconciledKey] = useState<string | null>(null);

  // 1) Load notification history on login
  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await notificationService.fetchNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: NotificationType) => !n.read).length);
    } catch (err) {
      logger.error("Error loading notification history", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user]);

  // Redirect if there is a pending push notification route
  useEffect(() => {
    if (user && usuario) {
      const pendingRoute = localStorage.getItem("pending_push_route");
      if (pendingRoute) {
        logger.info("Redirecting to pending notification route", { pendingRoute });
        localStorage.removeItem("pending_push_route");
        navigate(pendingRoute);
      }
    }
  }, [user, usuario, navigate]);

  // 2) Service Worker and FCM token setup (guarded for native vs web)
  useEffect(() => {
    // Return early if authentication or user profile is still loading.
    // This prevents temporary null states during startup/refresh/resume
    // from being incorrectly treated as logouts.
    if (authLoading || profileStatus === "loading") {
      return;
    }

    if (!user || !usuario) {
      // Confirmed unauthenticated / logout state.
      // Clean up local React states but do NOT proactively deactivate the token
      // or delete from localStorage here. Explicit logout (cerrarSesion) handles that.
      if (fcmToken) setFcmToken(null);
      if (reconciledKey) setReconciledKey(null);
      setShowPermissionPrompt(false);
      return;
    }

    const currentUid = user.id;
    let active = true;

    const getOrCreateInstallationId = () => {
      let instId = localStorage.getItem("casaclick_installation_id");
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!instId || !uuidRegex.test(instId)) {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
          instId = crypto.randomUUID();
        } else {
          try {
            instId = "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
              (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
            );
          } catch (e) {
            instId = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
              const r = (Math.random() * 16) | 0;
              const v = c === "x" ? r : (r & 0x3) | 0x8;
              return v.toString(16);
            });
          }
        }
        localStorage.setItem("casaclick_installation_id", instId);
        logger.info("Generated or migrated invalid installation_id to a new valid UUID", { instId });
      }
      return instId;
    };

    const prepareRegistrationPayload = (uid: string, token: string) => {
      const installationId = getOrCreateInstallationId();
      const pendingStr = localStorage.getItem("casaclick_pending_registration");
      let pending = null;
      try {
        pending = pendingStr ? JSON.parse(pendingStr) : null;
      } catch (e) {
        // ignore malformed local storage
      }
      
      if (pending && pending.uid === uid && pending.token === token && pending.platform === "android") {
        return {
          installation_id: installationId,
          client_sequence: pending.sequence,
          markSuccess: () => {
            pending.status = "success";
            localStorage.setItem("casaclick_pending_registration", JSON.stringify(pending));
          }
        };
      }
      
      const currentSeq = parseInt(localStorage.getItem("casaclick_client_sequence") || "0", 10) + 1;
      localStorage.setItem("casaclick_client_sequence", currentSeq.toString());
      
      const newPending = {
        uid,
        token,
        platform: "android",
        sequence: currentSeq,
        status: "pending"
      };
      localStorage.setItem("casaclick_pending_registration", JSON.stringify(newPending));
      
      return {
        installation_id: installationId,
        client_sequence: currentSeq,
        markSuccess: () => {
          newPending.status = "success";
          localStorage.setItem("casaclick_pending_registration", JSON.stringify(newPending));
        }
      };
    };

    if (Capacitor.isNativePlatform()) {
      // Native push flow
      const addListeners = async () => {
        await PushNotifications.removeAllListeners();

        await PushNotifications.addListener('registration', (token) => {
          if (!active) return;
          logger.info("Obtained Native FCM token", { token: token.value ? token.value.substring(0, 10) + "..." : "null" });
          
          const newestUid = user?.id;
          if (!newestUid) return;

          setFcmToken(token.value);
          localStorage.setItem("casaclick_push_token", token.value);
          
          const payloadInfo = prepareRegistrationPayload(newestUid, token.value);
          
          notificationService.registerPushToken(token.value, {
            platform: "android",
            permission_status: "granted",
            client_sequence: payloadInfo.client_sequence,
            installation_id: payloadInfo.installation_id
          })
          .then(() => {
            payloadInfo.markSuccess();
            if (active && user?.id === newestUid) {
              const targetKey = `${newestUid}:${token.value}:android`;
              setReconciledKey(targetKey);
            }
          })
          .catch((err) => {
            if (active) logger.error("Error registering native token on backend:", err);
          });
        });

        await PushNotifications.addListener('registrationError', (err) => {
          if (active) logger.error("Native push registration error:", err);
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          if (!active) return;
          logger.info("Foreground native notification received", { notification });
          
          const data = notification.data;
          window.dispatchEvent(new CustomEvent("casaclick:notification-received", {
            detail: {
              type: data?.type || "unknown",
              related_entity_type: data?.related_entity_type || "",
              related_entity_id: data?.related_entity_id || "",
              requestId: data?.requestId || "",
              chatId: data?.chatId || "",
              data: data
            }
          }));

          setToastMessage({
            title: notification.title || "Casa Click",
            body: notification.body || "Nueva notificación recibida"
          });
          setTimeout(() => setToastMessage(null), 5000);
          void fetchNotifications();
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          if (!active) return;
          const data = action.notification.data;
          logger.info("Tapped native notification payload", { data });
          let targetRoute = "/actividad";
          if (data?.related_entity_type === "request" && data?.related_entity_id) {
            targetRoute = `/solicitud/${data.related_entity_id}`;
          }
          if (user && usuario) {
            navigate(targetRoute);
          } else {
            localStorage.setItem("pending_push_route", targetRoute);
          }
        });
      };

      const checkPermissionsAndRegister = async () => {
        // Reconcile/Reactivate existing token if present
        const savedToken = localStorage.getItem("casaclick_push_token");
        if (savedToken) {
          const targetKey = `${currentUid}:${savedToken}:android`;
          if (reconciledKey !== targetKey) {
            logger.info("Reconciling native push token for UID", {
              uid: currentUid,
              tokenPrefix: savedToken.substring(0, 10) + "..."
            });
            const payloadInfo = prepareRegistrationPayload(currentUid, savedToken);
            
            notificationService.registerPushToken(savedToken, {
              platform: "android",
              permission_status: "granted",
              client_sequence: payloadInfo.client_sequence,
              installation_id: payloadInfo.installation_id
            })
            .then(() => {
              payloadInfo.markSuccess();
              if (active && user?.id === currentUid) {
                setFcmToken(savedToken);
                setReconciledKey(targetKey);
              }
            })
            .catch((err) => {
              if (active) logger.error("Error reconciling native token on backend:", err);
            });
          }
        }

        try {
          const permission = await PushNotifications.checkPermissions();
          if (permission.receive === "prompt") {
            const timer = setTimeout(() => {
              if (active) setShowPermissionPrompt(true);
            }, 3000);
            return () => clearTimeout(timer);
          } else if (permission.receive === "granted") {
            await PushNotifications.register();
          }
        } catch (err) {
          if (active) logger.error("Error checking native push permissions:", err);
        }
      };

      void addListeners();
      void checkPermissionsAndRegister();

      return () => {
        active = false;
        void PushNotifications.removeAllListeners();
      };
    } else {
      // Web only flow
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((reg) => {
            if (active) logger.info("FCM Service Worker registered successfully:", { scope: reg.scope });
          })
          .catch((err) => {
            if (active) logger.error("FCM Service Worker registration failed:", err);
          });
      }

      // Reconcile/Reactivate existing web token
      const savedToken = localStorage.getItem("casaclick_push_token");
      if (savedToken) {
        const targetKey = `${currentUid}:${savedToken}:web`;
        if (reconciledKey !== targetKey) {
          logger.info("Reconciling web push token for UID", {
            uid: currentUid,
            tokenPrefix: savedToken.substring(0, 10) + "..."
          });
          notificationService.registerFCMToken(savedToken)
          .then(() => {
            if (active && user?.id === currentUid) {
              setFcmToken(savedToken);
              setReconciledKey(targetKey);
            }
          })
          .catch((err) => {
            if (active) logger.error("Error reconciling web token on backend:", err);
          });
        }
      }

      if (typeof Notification === "undefined") return;

      if (Notification.permission === "default") {
        const timer = setTimeout(() => {
          if (active) setShowPermissionPrompt(true);
        }, 3000);
        return () => {
          active = false;
          clearTimeout(timer);
        };
      } else if (Notification.permission === "granted") {
        void setupFCMToken();
      }

      return () => {
        active = false;
      };
    }
  }, [user, usuario, authLoading, profileStatus, reconciledKey]);

  // 3) Listen for foreground notifications (Web only)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;

    let unsubscribe: (() => void) | undefined;
    const setupForegroundListener = async () => {
      try {
        const messaging = await messagingPromise;
        if (!messaging) return;

        unsubscribe = onMessage(messaging, (payload) => {
          logger.info("Foreground notification payload received:", payload);
          
          const data = payload.data;
          window.dispatchEvent(new CustomEvent("casaclick:notification-received", {
            detail: {
              type: data?.type || "unknown",
              related_entity_type: data?.related_entity_type || "",
              related_entity_id: data?.related_entity_id || "",
              requestId: data?.requestId || "",
              chatId: data?.chatId || "",
              data: data
            }
          }));

          setToastMessage({
            title: payload.notification?.title || "Casa Click",
            body: payload.notification?.body || "Nueva notificación recibida"
          });
          setTimeout(() => setToastMessage(null), 5000);
          void fetchNotifications();
        });
      } catch (err) {
        logger.error("Error setting up foreground message listener:", err);
      }
    };

    if (user) {
      void setupForegroundListener();
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Token setup helper (Web only)
  const setupFCMToken = async () => {
    if (Capacitor.isNativePlatform()) return;
    const currentUid = user?.id;
    if (!currentUid) return;
    try {
      const messaging = await messagingPromise;
      if (!messaging) {
        logger.warn("FCM messaging is not supported in this browser environment.");
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      if (!vapidKey) {
        logger.warn("VITE_FIREBASE_VAPID_KEY is not set. Token registration skipped.");
        return;
      }

      const token = await getToken(messaging, { vapidKey });
      if (token) {
        logger.info("Obtained Web FCM token", { token: token.substring(0, 10) + "..." });
        
        // Concurrency check: Ensure user hasn't logged out or switched accounts during token acquisition
        if (user?.id !== currentUid) {
          logger.info("Discarding stale token registration: UID changed during token acquisition.");
          return;
        }

        await notificationService.registerFCMToken(token);
        setFcmToken(token);
        localStorage.setItem("casaclick_push_token", token);
        
        const targetKey = `${currentUid}:${token}:web`;
        setReconciledKey(targetKey);
      } else {
        logger.warn("No FCM registration token available. Request permission first.");
      }
    } catch (err) {
      logger.error("Error setting up FCM token on backend:", err);
    }
  };

  // 4) Request notification permissions contextually
  const requestPushPermission = async () => {
    setShowPermissionPrompt(false);
    if (Capacitor.isNativePlatform()) {
      try {
        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === "granted") {
          await PushNotifications.register();
        }
      } catch (err) {
        logger.error("Error requesting native push permission:", err);
      }
    } else {
      if (typeof Notification === "undefined") return;
      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          await setupFCMToken();
        }
      } catch (err) {
        logger.error("Error requesting notification permission:", err);
      }
    }
  };

  const dismissPermissionPrompt = () => {
    setShowPermissionPrompt(false);
  };

  // 5) Action handlings
  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      logger.error("Error marking notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      logger.error("Error marking all notifications as read:", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        requestPushPermission,
        showPermissionPrompt,
        dismissPermissionPrompt,
      }}
    >
      {children}

      {/* Contextual Permission Prompt Banner */}
      {showPermissionPrompt && (
        <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 bg-white border border-slate-200 shadow-xl rounded-2xl p-5 z-50 transition-all duration-300">
          <div className="flex justify-between items-start mb-2">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FiBell className="text-blue-600 animate-swing" size={16} />
              ¿Activar notificaciones?
            </h4>
            <button
              onClick={dismissPermissionPrompt}
              className="text-slate-400 hover:text-slate-600 rounded-full p-1"
              aria-label="Cerrar"
            >
              <FiX size={16} />
            </button>
          </div>
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Habilitá las alertas push para recibir novedades instantáneas cuando un cliente te contacte o recibas nuevos mensajes de chat.
          </p>
          <div className="flex gap-2">
            <button
              onClick={requestPushPermission}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg shadow transition-colors"
            >
              Activar
            </button>
            <button
              onClick={dismissPermissionPrompt}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      )}

      {/* Foreground Alert Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 left-4 md:left-auto md:w-80 bg-slate-900/95 backdrop-blur-sm text-white rounded-xl shadow-lg p-4 z-50 flex items-start gap-3 border border-slate-700/50 animate-slide-in">
          <div className="bg-blue-500 rounded-full p-2 shrink-0">
            <FiBell size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold truncate">{toastMessage.title}</h4>
            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">
              {toastMessage.body}
            </p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white shrink-0"
          >
            <FiX size={14} />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications debe usarse dentro de NotificationProvider");
  }
  return context;
};
