const routes = {
  "auth/forgot-password": () => import("./auth/forgot-password.js"),
  "auth/login": () => import("./auth/login.js"),
  "auth/logout": () => import("./auth/logout.js"),
  "auth/me": () => import("./auth/me.js"),
  "auth/refresh": () => import("./auth/refresh.js"),
  "auth/register": () => import("./auth/register.js"),
  "auth/reset-password": () => import("./auth/reset-password.js"),
  "auth/sessions": () => import("./auth/sessions.js"),
  "auth/verify-email": () => import("./auth/verify-email.js"),
  "agent-jobs": () => import("./agent-jobs/index.js"),
  "agent-worker": () => import("./agent-worker.js"),
  "agent-workflows": () => import("./agent-workflows/index.js"),
  "agents": () => import("./agents/index.js"),
  "ai-visibility": () => import("./ai-visibility/index.js"),
  "ai-visibility/entity": () => import("./ai-visibility/entity.js"),
  "audit": () => import("./audit.js"),
  "authority": () => import("./authority/index.js"),
  "backlink-autopilot": () => import("./backlink-autopilot.js"),
  "clients": () => import("./clients/index.js"),
  "content-factory": () => import("./content-factory/index.js"),
  "content-factory/documents": () => import("./content-factory/documents.js"),
  "content-factory/performance": () => import("./content-factory/performance.js"),
  "cron-daily": () => import("./cron-daily.js"),
  "gbp": () => import("./gbp.js"),
  "generate-blog-plan": () => import("./generate-blog-plan.js"),
  "generate-content": () => import("./generate-content.js"),
  "generate-image": () => import("./generate-image.js"),
  "health": () => import("./health.js"),
  "keywords": () => import("./keywords/index.js"),
  "local-seo": () => import("./local-seo/index.js"),
  "local-seo/reviews": () => import("./local-seo/reviews.js"),
  "organizations": () => import("./organizations/index.js"),
  "publish-gmb": () => import("./publish-gmb.js"),
  "publish-wordpress": () => import("./publish-wordpress.js"),
  "schedule-blogs": () => import("./schedule-blogs.js"),
  "seo-intelligence": () => import("./seo-intelligence/index.js"),
  "users": () => import("./users/index.js"),
  "wordpress-check": () => import("./wordpress-check.js"),
  "workspace": () => import("./workspace.js"),
};

const dynamicRoutes = [
  [/^agent-jobs\/([^/]+)$/, "id", () => import("./agent-jobs/[id].js")],
  [/^ai-visibility\/([^/]+)$/, "id", () => import("./ai-visibility/[id].js")],
  [/^authority\/([^/]+)$/, "id", () => import("./authority/[id].js")],
  [/^clients\/([^/]+)$/, "id", () => import("./clients/[id].js")],
  [/^content-factory\/([^/]+)$/, "id", () => import("./content-factory/[id].js")],
  [/^local-seo\/([^/]+)$/, "id", () => import("./local-seo/[id].js")],
  [/^seo-intelligence\/([^/]+)$/, "id", () => import("./seo-intelligence/[id].js")],
];

export default async function router(req, res) {
  const path = routePath(req);
  let loader = routes[path];
  if (!loader) {
    for (const [pattern, parameter, candidate] of dynamicRoutes) {
      const match = path.match(pattern);
      if (!match) continue;
      req.query ||= {};
      req.query[parameter] = decodeURIComponent(match[1]);
      loader = candidate;
      break;
    }
  }
  if (!loader) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ ok: false, error: "api_route_not_found" }));
  }
  const module = await loader();
  return module.default(req, res);
}

function routePath(req) {
  const forwarded = Array.isArray(req.query?.path) ? req.query.path.join("/") : req.query?.path;
  if (forwarded) return String(forwarded).replace(/^\/+|\/+$/g, "");
  return new URL(req.url, "https://internal.local").pathname.replace(/^\/api\/?/, "").replace(/^router(?:\.js)?\/?/, "").replace(/^\/+|\/+$/g, "");
}
