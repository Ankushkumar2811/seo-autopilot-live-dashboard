import crypto from "node:crypto";
import { getConfig } from "../config/env.js";
import { AuthenticationError } from "../lib/errors.js";

const encode = (value) => Buffer.from(value).toString("base64url");
const decode = (value) => Buffer.from(value, "base64url").toString("utf8");

export function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString("base64url"); }
export function hashToken(token) { return crypto.createHash("sha256").update(String(token)).digest("hex"); }

export function signAccessToken(claims) {
  const config = getConfig();
  if (!config.auth.jwtSecret) throw new Error("JWT_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const header = encode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = encode(JSON.stringify({ ...claims, iat: now, exp: now + config.auth.accessTokenSeconds, iss: "unnatix-seo-autopilot", jti: crypto.randomUUID() }));
  const signature = crypto.createHmac("sha256", config.auth.jwtSecret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token) {
  try {
    const [header, payload, signature] = String(token || "").split(".");
    if (!header || !payload || !signature) throw new Error("malformed");
    const expected = crypto.createHmac("sha256", getConfig().auth.jwtSecret).update(`${header}.${payload}`).digest();
    const actual = Buffer.from(signature, "base64url");
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) throw new Error("signature");
    const claims = JSON.parse(decode(payload));
    if (claims.iss !== "unnatix-seo-autopilot" || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("expired");
    return claims;
  } catch {
    throw new AuthenticationError("Invalid or expired access token");
  }
}
