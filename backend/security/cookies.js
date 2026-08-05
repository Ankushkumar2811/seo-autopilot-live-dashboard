import { getConfig } from "../config/env.js";

export function parseCookies(req) {
  return Object.fromEntries(String(req.headers?.cookie || "").split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function serialize(name, value, { maxAge = 0 } = {}) {
  const config = getConfig();
  return [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", config.auth.secureCookies ? "Secure" : "", maxAge ? `Max-Age=${maxAge}` : "Max-Age=0"].filter(Boolean).join("; ");
}

export function setAuthCookies(res, accessToken, refreshToken) {
  const config = getConfig();
  res.setHeader("Set-Cookie", [serialize(config.auth.accessCookie, accessToken, { maxAge: config.auth.accessTokenSeconds }), serialize(config.auth.refreshCookie, refreshToken, { maxAge: config.auth.refreshTokenSeconds })]);
}

export function clearAuthCookies(res) {
  const config = getConfig();
  res.setHeader("Set-Cookie", [serialize(config.auth.accessCookie, ""), serialize(config.auth.refreshCookie, "")]);
}

export function getAccessToken(req) {
  const bearer = String(req.headers?.authorization || "").match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer || parseCookies(req)[getConfig().auth.accessCookie] || "";
}

export function getRefreshToken(req) { return parseCookies(req)[getConfig().auth.refreshCookie] || ""; }
