import bcrypt from "bcryptjs";
import { getConfig } from "../config/env.js";

export function validatePasswordStrength(password) {
  const value = String(password || "");
  if (value.length < 10 || value.length > 128) return "Password must be between 10 and 128 characters";
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) return "Password must include uppercase, lowercase, and a number";
  return null;
}

export function hashPassword(password) {
  return bcrypt.hash(String(password), getConfig().auth.bcryptRounds);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(String(password), String(hash));
}
