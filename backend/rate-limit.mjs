import { isIP } from "node:net";

const normalize = (ip) => ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4 ? ip.slice(7) : ip;
export function trustedProxyList(value = "") {
  const entries = Array.isArray(value) ? value : value.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (entries.some((ip) => !isIP(ip))) throw new Error("TRUSTED_PROXY_IPS must contain explicit IP addresses.");
  return new Set(entries.map(normalize));
}
export function clientAddress(req, trusted) {
  const peer = normalize(req.socket.remoteAddress ?? "unknown");
  const header = req.headers["x-forwarded-for"];
  if (!trusted.has(peer) || typeof header !== "string" || header.length > 1024) return peer;
  const chain = header.split(",").map((ip) => ip.trim());
  if (!chain.length || chain.length > 16 || chain.some((ip) => !isIP(ip))) return peer;
  chain.push(peer);
  for (let i = chain.length - 1; i >= 0; i--) if (!trusted.has(normalize(chain[i]))) return normalize(chain[i]);
  return normalize(chain[0]);
}
export function createRateLimiter({ trustedProxies = "", limit, now = Date.now, maxEntries = 10000 } = {}) {
  const trusted = trustedProxyList(trustedProxies);
  const attempts = new Map();
  const defaults = { auth: 20, booking: 10, service: 10, upload: 60, admin: 120, password: 5 };
  return (req, res, bucket, account = "") => {
    const time = now();
    for (const [key, entry] of attempts) if (entry.until <= time) attempts.delete(key);
    const keys = [`${bucket}:ip:${clientAddress(req, trusted)}`, ...(account ? [`${bucket}:account:${account}`] : [])];
    const maximum = limit ?? defaults[bucket.split(":")[0]] ?? 20;
    for (const key of keys) {
      const entry = attempts.get(key);
      if ((entry?.count ?? 0) >= maximum || (!entry && attempts.size >= maxEntries)) {
        res.setHeader("Retry-After", Math.max(1, Math.ceil(((entry?.until ?? time + 60000) - time) / 1000)));
        const error = new Error("Bạn đã thao tác quá nhiều lần. Vui lòng thử lại sau."); error.status = 429; throw error;
      }
    }
    for (const key of keys) { const entry = attempts.get(key) ?? { count: 0, until: time + 15 * 60 * 1000 }; entry.count++; attempts.set(key, entry); }
  };
}
