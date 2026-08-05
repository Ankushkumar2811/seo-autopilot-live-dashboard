import { MongoClient } from "mongodb";
import { getConfig } from "../config/env.js";
import { logger } from "../lib/logger.js";

const CACHE_KEY = Symbol.for("unnatix.mongo.connection");
const globalCache = globalThis;

function cache() {
  if (!globalCache[CACHE_KEY]) globalCache[CACHE_KEY] = { client: null, promise: null };
  return globalCache[CACHE_KEY];
}

export async function getMongoClient() {
  const config = getConfig().database;
  if (!config.uri) return null;
  const state = cache();
  if (state.client) return state.client;
  if (!state.promise) {
    const client = new MongoClient(config.uri, {
      maxPoolSize: config.maxPoolSize, minPoolSize: config.minPoolSize,
      connectTimeoutMS: config.connectTimeoutMs, serverSelectionTimeoutMS: config.serverSelectionTimeoutMs,
      maxIdleTimeMS: config.maxIdleTimeMs, retryReads: true, retryWrites: true,
    });
    state.promise = client.connect().then((connected) => {
      state.client = connected;
      logger.info("mongodb_connected", { database: config.name, maxPoolSize: config.maxPoolSize });
      return connected;
    }).catch((error) => {
      state.promise = null;
      logger.error("mongodb_connection_failed", { error });
      throw error;
    });
  }
  return state.promise;
}

export async function getDb() {
  const client = await getMongoClient();
  return client ? client.db(getConfig().database.name) : null;
}

export async function checkDatabase() {
  const db = await getDb();
  if (!db) return { status: "not_configured" };
  const startedAt = Date.now();
  await db.command({ ping: 1 });
  return { status: "connected", latencyMs: Date.now() - startedAt };
}
