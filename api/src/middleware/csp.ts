import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

/**
 * Generates a per-request CSP nonce and sets a strict Content-Security-Policy.
 *
 * Nonce is stored in res.locals.nonce for downstream use (e.g. injecting into
 * any HTML error pages or server-rendered fragments).
 *
 * Directives are tuned for the AXIOM stack:
 *  - script-src: nonce + strict-dynamic (no unsafe-inline/unsafe-eval)
 *  - img-src: blob: + data: for Three.js canvas toDataURL() and texture atlases
 *  - connect-src: wss: for Socket.IO over TLS
 *  - worker-src: blob: for potential WASM / web workers
 */
export function cspWithNonce(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;

  const directives = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self' wss: ws:",
    "worker-src blob:",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ];

  res.setHeader("Content-Security-Policy", directives.join("; "));
  next();
}
