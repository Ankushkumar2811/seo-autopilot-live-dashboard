import { MongoClient } from "mongodb";

let clientPromise;

export async function getDb() {
  const uri = process.env.MONGO_URL;
  if (!uri) return null;
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  const client = await clientPromise;
  return client.db(process.env.DB_NAME || "unnatix_growthx");
}
