import axiosWithAuth from "../utils/axiosWithAuth";
import { logger } from "../utils/logger";

export interface ReferralCreatePayload {
  professional_name: string;
  professional_phone?: string;
  professional_email?: string;
  category?: string;
  subcategory?: string;
  zone?: string;
  comment?: string;
  worked_with_before?: boolean;
}

export interface ReferralResponse {
  id: string;
  client_id: string;
  professional_user_id: string | null;
  professional_name: string;
  professional_phone: string | null;
  professional_email: string | null;
  status: string;
}

export async function createProfessionalReferral(payload: ReferralCreatePayload): Promise<ReferralResponse> {
  try {
    const res = await axiosWithAuth.post<ReferralResponse>("/professional-referrals/", payload);
    return res.data;
  } catch (error: any) {
    logger.error("Error creating professional referral", error);
    // Extract server detail message if available
    const msg = error.response?.data?.detail || "Error interno del servidor";
    throw new Error(msg);
  }
}
