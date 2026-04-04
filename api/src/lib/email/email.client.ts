import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.warn("[email] RESEND_API_KEY is not set — emails will not be sent");
}

/** Null when RESEND_API_KEY is missing — callers must guard before use */
export const resend: Resend | null = apiKey ? new Resend(apiKey) : null;

/** Verified sender address — must match a domain verified in your Resend dashboard */
export const FROM_ADDRESS = process.env.EMAIL_FROM ?? "noreply@yourdomain.com";
