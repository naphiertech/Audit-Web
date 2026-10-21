import dns from 'node:dns/promises';
import { URL } from 'node:url';

/**
 * Validates a user-supplied URL and protects against SSRF (Server-Side Request Forgery).
 * Blocks loopback, private RFC1918, link-local, and cloud metadata addresses.
 */
export async function validateAndCheckSSRF(rawUrl: string): Promise<{ valid: boolean; normalizedUrl?: string; error?: string }> {
  let parsed: URL;
  try {
    const trimmed = rawUrl.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP/HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only http:// and https:// URLs are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Deny empty or localhost hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '0.0.0.0'
  ) {
    return { valid: false, error: 'Access to localhost and internal hostnames is prohibited' };
  }

  // Check known cloud metadata hosts
  if (
    hostname === '169.254.169.254' ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    return { valid: false, error: 'Access to cloud metadata endpoints is prohibited' };
  }

  // Resolve hostname to IP to prevent DNS rebinding / private IP bypass
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const record of records) {
      if (isPrivateOrReservedIP(record.address)) {
        return {
          valid: false,
          error: `Resolved IP (${record.address}) is in a private or restricted network range`,
        };
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Could not resolve hostname "${hostname}": ${message}` };
  }

  return { valid: true, normalizedUrl: parsed.toString() };
}

/**
 * Checks if an IPv4 or IPv6 address belongs to private/reserved/loopback blocks
 */
export function isPrivateOrReservedIP(ip: string): boolean {
  // IPv6 checks
  if (ip.includes(':')) {
    const clean = ip.toLowerCase();
    if (clean === '::1' || clean === '::') return true;
    if (clean.startsWith('fe80:')) return true; // Link-local
    if (clean.startsWith('fc') || clean.startsWith('fd')) return true; // Unique local address (ULA)
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, reject
  }

  const [p0, p1] = parts;

  // 0.0.0.0/8 (Current network)
  if (p0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (p0 === 127) return true;

  // 10.0.0.0/8 (Private RFC1918)
  if (p0 === 10) return true;

  // 172.16.0.0/12 (Private RFC1918: 172.16 - 172.31)
  if (p0 === 172 && p1 >= 16 && p1 <= 31) return true;

  // 192.168.0.0/16 (Private RFC1918)
  if (p0 === 192 && p1 === 168) return true;

  // 169.254.0.0/16 (Link-local / Cloud metadata)
  if (p0 === 169 && p1 === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (p0 === 100 && p1 >= 64 && p1 <= 127) return true;

  // 224.0.0.0/4 (Multicast)
  if (p0 >= 224 && p0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (p0 >= 240) return true;

  return false;
}
