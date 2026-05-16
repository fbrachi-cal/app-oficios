import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  getMyGamification,
  markGamificationEventSeen,
  type GamificationMeResponse,
} from "../services/gamificationService";
import { logger } from "../utils/logger";

interface UseGamificationReturn {
  data: GamificationMeResponse | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch the profile on demand (e.g. after a profile update). */
  refresh: () => void;
  /** Mark the current pending event as seen and clear it from state. */
  dismissPendingEvent: () => Promise<void>;
}

/**
 * Fetches the authenticated user's gamification profile.
 *
 * - Fetches once on mount; no re-fetch on route changes (AppShell is stable).
 * - Exposes `refresh()` for manual re-fetches.
 * - `dismissPendingEvent()` is guarded by a ref so rapid calls (Escape +
 *   button click at the same time) never fire the POST more than once.
 * - When axiosWithAuth cancels the request (unauthenticated user), the
 *   cancellation is treated as a silent no-op, not an error.
 */
export function useGamification(): UseGamificationReturn {
  const [data, setData] = useState<GamificationMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchTick, setFetchTick] = useState(0);

  // Guards against double-POST when multiple close triggers fire before re-render
  const dismissingRef = useRef(false);

  const refresh = useCallback(() => {
    setFetchTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const doFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMyGamification();
        if (!cancelled) setData(result);
      } catch (err) {
        if (cancelled) return;

        // axiosWithAuth intentionally cancels requests when no user is logged in.
        // This is expected behaviour, not a real error — do not log or set error state.
        if (axios.isCancel(err)) return;

        logger.error("useGamification: fetch failed", err);
        setError("gamification_load_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    doFetch();
    return () => {
      cancelled = true;
    };
  }, [fetchTick]);

  const dismissPendingEvent = useCallback(async () => {
    // Guard: if already in progress (rapid multi-trigger), bail out immediately.
    if (dismissingRef.current) return;

    const eventId = data?.pending_event?.id;
    if (!eventId) return;

    dismissingRef.current = true;

    // Optimistic update — hide the modal immediately before the API call
    setData((prev) =>
      prev ? { ...prev, pending_event: null } : prev
    );

    try {
      // Fire API — errors are swallowed inside markGamificationEventSeen
      await markGamificationEventSeen(eventId);
    } finally {
      // Reset guard after the call completes so refresh() can trigger a new dismiss cycle
      dismissingRef.current = false;
    }
  }, [data?.pending_event?.id]);

  return { data, loading, error, refresh, dismissPendingEvent };
}
