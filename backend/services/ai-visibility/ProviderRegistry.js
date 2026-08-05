import { OpenAIVisibilityProvider } from "./OpenAIVisibilityProvider.js";
import { GeminiVisibilityProvider } from "./GeminiVisibilityProvider.js";
export function visibilityProviders(requested = []) { const available = [new OpenAIVisibilityProvider(), new GeminiVisibilityProvider()].filter((item) => item.isConfigured()); const allow = requested.length ? new Set(requested.map((item) => String(item).toLowerCase())) : null; return allow ? available.filter((item) => allow.has(item.id)) : available; }
