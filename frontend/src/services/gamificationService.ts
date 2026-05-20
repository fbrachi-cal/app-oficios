import axiosWithAuth from "../utils/axiosWithAuth";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Types — mirror the backend GamificationMeOut schema exactly.
// ---------------------------------------------------------------------------

export interface GamificationLevel {
  id: string;
  program_id: string;
  code: string;
  name: string;
  level_order: number;
  rules: Array<{ metric: string; operator: string; value: number | boolean }>;
  rules_mode: string;
}

export interface GamificationProfile {
  user_id: string;
  program_id: string;
  current_level_id: string;
  current_level_code: string;
  current_level_order: number;
  last_evaluated_at: string;
  last_level_up_at: string;
  metrics_snapshot: Record<string, number | boolean>;
  created_at: string;
  updated_at: string;
}

export interface GamificationProgressItem {
  metric: string;
  current: number;
  required: number;
  met: boolean;
}

export interface GamificationEvent {
  id: string;
  user_id: string;
  event_type: string;
  program_id: string;
  from_level_code: string | null;
  to_level_code: string | null;
  seen: boolean;
  created_at: string;
  seen_at: string | null;
  payload: {
    from_level_order: number | null;
    to_level_order: number;
    level_name: string;
  } | null;
}

export interface GamificationMeResponse {
  profile: GamificationProfile | null;
  current_level: GamificationLevel | null;
  next_level: GamificationLevel | null;
  progress: GamificationProgressItem[];
  pending_event: GamificationEvent | null;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Fetch the authenticated user's current gamification state.
 * Always triggers a server-side re-evaluation, so the response is fresh.
 */
export async function getMyGamification(): Promise<GamificationMeResponse> {
  try {
    const res = await axiosWithAuth.get<GamificationMeResponse>("/gamification/me");
    return res.data;
  } catch (error) {
    logger.error("Error fetching gamification profile", error);
    throw error;
  }
}

/**
 * Mark a level-up gamification event as seen.
 * Safe to call more than once — the backend ignores already-seen events.
 */
export async function markGamificationEventSeen(eventId: string): Promise<void> {
  try {
    await axiosWithAuth.post(`/gamification/events/${eventId}/seen`);
  } catch (error) {
    // Log but do not rethrow — a failed mark-seen should never block the user.
    logger.error("Error marking gamification event as seen", error, { eventId });
  }
}
