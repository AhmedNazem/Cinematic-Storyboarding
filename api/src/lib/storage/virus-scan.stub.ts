import { logger } from "../utils/logger";

export interface ScanResult {
  clean: boolean;
  scannedAt: string;
  scanner: string;
  note?: string;
}

/**
 * Schedule an async virus scan for an asset after presign generation.
 * Fire-and-forget — does NOT block the presign response.
 *
 * @param assetKey — the R2 object key to scan once uploaded
 */
export function scheduleVirusScan(assetKey: string): void {
  // Intentionally not awaited — scan runs in background
  runVirusScan(assetKey).catch((err) => {
    logger.warn("virus-scan: background scan error", { assetKey, err });
  });
}

/**
 * STUB: replace this body with a real scanner integration.
 * Options: ClamAV via TCP socket, VirusTotal REST API, Cloudflare Gateway.
 */
async function runVirusScan(assetKey: string): Promise<ScanResult> {
  // TODO: implement real scanner before production
  logger.info("virus-scan: stub invoked — no real scan performed", {
    assetKey,
    scanner: "stub",
  });

  return {
    clean: true,
    scannedAt: new Date().toISOString(),
    scanner: "stub",
    note: "Replace with real scanner (ClamAV / VirusTotal) before production",
  };
}
