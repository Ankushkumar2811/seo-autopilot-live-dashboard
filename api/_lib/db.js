// Compatibility bridge: existing API handlers keep this import while the
// connection lifecycle is owned by the scalable backend service layer.
export { getDb, getMongoClient, checkDatabase } from "../../backend/services/database.js";
