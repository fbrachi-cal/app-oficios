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
  const { user } = useUser();
  const { usuario } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ title: string; body: string } | null>(null);

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
    if (!user || !usuario) {
      const savedToken = fcmToken || localStorage.getItem("casaclick_push_token");
      if (savedToken) {
        if (Capacitor.isNativePlatform()) {
          notificationService.deactivatePushToken(savedToken)
            .catch((err) => logger.error("Error deactivating native push token on logout", err));
        } else {
          notificationService.unregisterFCMToken(savedToken)
            .catch((err) => logger.error("Error unregistering FCM token on logout", err));
        }
        localStorage.removeItem("casaclick_push_token");
        setFcmToken(null);
      }
      setShowPermissionPrompt(false);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      // Native push flow
      const addListeners = async () => {
        await PushNotifications.removeAllListeners();

        await PushNotifications.addListener('registration', (token) => {
          logger.info("Obtained Native FCM token", { token: token.value ? token.value.substring(0, 10) + "..." : "null" });
          setFcmToken(token.value);
          localStorage.setItem("casaclick_push_token", token.value);
          notificationService.registerPushToken(token.value, {
            platform: "android",
            permission_status: "granted"
          }).catch((err) => logger.error("Error registering native token on backend:", err));
        });

        await PushNotifications.addListener('registrationError', (err) => {
          logger.error("Native push registration error:", err);
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
          logger.info("Foreground native notification received", { notification });
          setToastMessage({
            title: notification.title || "Casa Click",
            body: notification.body || "Nueva notificación recibida"
          });
          setTimeout(() => setToastMessage(null), 5000);
          void fetchNotifications();
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
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

      const checkPermissions = async () => {
        try {
          const permission = await PushNotifications.checkPermissions();
          if (permission.receive === "prompt") {
            const timer = setTimeout(() => setShowPermissionPrompt(true), 3000);
            return () => clearTimeout(timer);
          } else if (permission.receive === "granted") {
            await PushNotifications.register();
          }
        } catch (err) {
          logger.error("Error checking native push permissions:", err);
        }
      };

      void addListeners();
      void checkPermissions();

      return () => {
        void PushNotifications.removeAllListeners();
      };
    } else {
      // Web only flow
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((reg) => {
            logger.info("FCM Service Worker registered successfully:", { scope: reg.scope });
          })
          .catch((err) => {
            logger.error("FCM Service Worker registration failed:", err);
          });
      }

      if (typeof Notification === "undefined") return;

      if (Notification.permission === "default") {
        const timer = setTimeout(() => setShowPermissionPrompt(true), 3000);
        return () => clearTimeout(timer);
      } else if (Notification.permission === "granted") {
        void setupFCMToken();
      }
    }
  }, [user, usuario]);

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
        logger.info("Obtained Web FCM token:", { token });
        await notificationService.registerFCMToken(token);
        setFcmToken(token);
        localStorage.setItem("casaclick_push_token", token);
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
