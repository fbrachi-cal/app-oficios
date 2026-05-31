import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../../context/NotificationContext";
import { useTranslation } from "react-i18next";
import { FiBell, FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const NotificationBell: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notif: any) => {
    setIsOpen(false);
    if (!notif.read) {
      await markAsRead(notif.id);
    }
    
    // Navigate safely based on entity type
    if (notif.related_entity_type === "request" && notif.related_entity_id) {
      navigate(`/solicitud/${notif.related_entity_id}`);
    } else if (notif.related_entity_type === "chat") {
      // Chat drawer links aren't standalone routes, so we redirect to /actividad
      navigate("/actividad");
    } else {
      // Default fallback
      navigate("/actividad");
    }
  };

  const getNotificationIcon = (type: string) => {
    // Simple visual indicators reusing standard text colors
    return "w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-2";
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors focus:outline-none"
        aria-label={t("notificaciones.titulo")}
      >
        <FiBell size={20} className={unreadCount > 0 ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in-down">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-800">
              {t("notificaciones.titulo")}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <FiCheckCircle size={14} />
                {t("notificaciones.marcar_todas_leidas")}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-slate-400">
                {t("notificaciones.sin_notificaciones")}
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`px-4 py-3 cursor-pointer flex gap-3 text-left transition-colors duration-150 ${
                    notif.read ? "hover:bg-slate-50" : "bg-blue-50/50 hover:bg-blue-50"
                  }`}
                >
                  {!notif.read && <span className={getNotificationIcon(notif.type)} />}
                  <div className="flex-1 min-w-0">
                    <h5 className={`text-xs ${notif.read ? "font-semibold text-slate-700" : "font-bold text-slate-900"}`}>
                      {notif.title}
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {notif.body}
                    </p>
                    <span className="text-[10px] text-slate-400 block mt-2">
                      {new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
