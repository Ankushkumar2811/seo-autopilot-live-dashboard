import { tenantContext } from "../middleware/tenant.js";
import { ValidationError } from "../lib/errors.js";
import { createClient, listClients, updateClient } from "./client-service.js";

const COLLECTIONS = ["reviews", "posts", "backlinks", "contentIdeas", "health", "blogSchedules"];
export async function getWorkspace(db, identity) { const tenant = tenantContext(identity); const [record, clients] = await Promise.all([db.collection("clientWorkspaces").findOne({ organizationId: tenant.organizationId }), listClients(db, identity)]); if (!record && !clients.length) return { empty: true, workspace: null }; const workspace = { clients, activeClientId: record?.activeClientId || clients[0]?.id || "", usedTitles: record?.usedTitles || [] }; for (const key of COLLECTIONS) workspace[key] = record?.[key] || {}; return { empty: false, workspace }; }
export async function saveWorkspace(db, identity, input) {
  const tenant = tenantContext(identity); if (!input || !Array.isArray(input.clients)) throw new ValidationError("Workspace clients are required");
  const current = await listClients(db, identity); const currentById = new Map(current.map((client) => [client.id, client])); const idMap = {};
  const snapshot = (client) => JSON.stringify({ name: client.name, type: client.type, city: client.city, websiteUrl: client.websiteUrl || "", services: client.services || [], goal: client.goal || "", gmbUrl: client.gmbUrl || "", phone: client.phone || "", email: client.email || "" });
  for (const client of input.clients.slice(0, 500)) { const existing = client.id && currentById.get(client.id); if (existing) { if (snapshot(existing) !== snapshot(client)) await updateClient(db, identity, client.id, client); idMap[client.id] = client.id; } else { const created = await createClient(db, identity, client); idMap[client.id || created.id] = created.id; } }
  const remap = (group = {}) => Object.fromEntries(Object.entries(group).map(([id, value]) => [idMap[id] || id, value]));
  const set = { activeClientId: idMap[input.activeClientId] || input.activeClientId || Object.values(idMap)[0] || "", usedTitles: Array.isArray(input.usedTitles) ? input.usedTitles.map(String).slice(-1000) : [], updatedAt: new Date(), updatedBy: tenant.userId };
  for (const key of COLLECTIONS) set[key] = remap(input[key]);
  await db.collection("clientWorkspaces").updateOne({ organizationId: tenant.organizationId }, { $set: set, $setOnInsert: { organizationId: tenant.organizationId, createdBy: tenant.userId, createdAt: new Date() } }, { upsert: true });
  return (await getWorkspace(db, identity)).workspace;
}
