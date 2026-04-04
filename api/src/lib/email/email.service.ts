import { resend, FROM_ADDRESS } from "./email.client";
import { logger } from "../utils/logger";

const APP_NAME = process.env.APP_NAME ?? "Axiom";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

// ─── Invitation email ─────────────────────────────────────────────────────────

export async function sendInvitationEmail(opts: {
  to: string;
  inviterName: string;
  orgName: string;
}) {
  const setPasswordUrl = `${APP_URL}/set-password?email=${encodeURIComponent(opts.to)}`;

  if (!resend) {
    logger.warn("Skipping invitation email — RESEND_API_KEY not configured", { to: opts.to });
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: `You've been invited to join ${opts.orgName} on ${APP_NAME}`,
    html: `
      <p>Hi,</p>
      <p><strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.orgName}</strong> on ${APP_NAME}.</p>
      <p>Click the link below to set your password and activate your account:</p>
      <p><a href="${setPasswordUrl}">Set your password</a></p>
      <p>This link does not expire — you can use it whenever you're ready.</p>
      <p>— The ${APP_NAME} team</p>
    `,
  });

  if (error) {
    logger.error("Failed to send invitation email", { to: opts.to, error });
  }
}

// ─── Password reset email ─────────────────────────────────────────────────────

export async function sendPasswordResetEmail(opts: {
  to: string;
  resetToken: string;
}) {
  const resetUrl = `${APP_URL}/reset-password?token=${opts.resetToken}`;

  if (!resend) {
    logger.warn("Skipping password reset email — RESEND_API_KEY not configured", { to: opts.to });
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: opts.to,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <p>Hi,</p>
      <p>We received a request to reset your ${APP_NAME} password.</p>
      <p>Click the link below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <p><a href="${resetUrl}">Reset my password</a></p>
      <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <p>— The ${APP_NAME} team</p>
    `,
  });

  if (error) {
    logger.error("Failed to send password reset email", { to: opts.to, error });
  }
}
