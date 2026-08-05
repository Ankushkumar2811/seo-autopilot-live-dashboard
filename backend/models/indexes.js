import { modelDefinitions } from "./definitions.js";
import { logger } from "../lib/logger.js";

export async function ensureModelIndexes(db) {
  for (const [modelName, definition] of Object.entries(modelDefinitions)) {
    for (const index of definition.indexes) {
      await db.collection(definition.collection).createIndex(index.key, {
        unique: Boolean(index.unique), sparse: Boolean(index.sparse), name: index.name,
        ...(index.expireAfterSeconds !== undefined ? { expireAfterSeconds: index.expireAfterSeconds } : {}),
      });
    }
    logger.debug("model_indexes_ready", { model: modelName, collection: definition.collection });
  }
}
