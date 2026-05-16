import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  getMyGamification,
  markGamificationEventSeen,
  type GamificationMeResponse,
} from "../services/gamificationService";
import { logger } from "../utils/logger";
import { useAuth } from "./AuthContext";

interface GamificationContextValue {
  data: GamificationMeResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  dismissPendingEvent: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextValue | undefined>(undefined);

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<GamificationMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTick, setFetchTick] = useState(0);
  const { usuario } = useAuth(); // Re-fetch or clear when auth changes

  const dismissingRef = useRef(false);

  const refresh = useCallback(() => {
    setFetchTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!usuario) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMyGamification();
        if (!cancelled) setData(result);
      } catch (err) {
        if (cancelled) return;
        if (axios.isCancel(err)) return;

        logger.error("GamificationProvider: fetch failed", err);
        setError("gamification_load_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [fetchTick, usuario]);

  const dismissPendingEvent = useCallback(async () => {
    if (dismissingRef.current) return;

    const eventId = data?.pending_event?.id;
    if (!eventId) return;

    dismissingRef.current = true;

    setData((prev) =>
      prev ? { ...prev, pending_event: null } : prev
    );

    try {
      await markGamificationEventSeen(eventId);
    } finally {
      dismissingRef.current = false;
    }
  }, [data?.pending_event?.id]);

  return (
    <GamificationContext.Provider value={{ data, loading, error, refresh, dismissPendingEvent }}>
      {children}
    </GamificationContext.Provider>
  );
};

export const useGamificationContext = (): GamificationContextValue => {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error("useGamificationContext must be used within a GamificationProvider");
  }
  return context;
};
