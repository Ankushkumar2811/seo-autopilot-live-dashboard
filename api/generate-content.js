import { getDb } from "./_lib/db.js";
import { generateSeoContent } from "./_lib/llm.js";
import { readJson, requireMethod, sendJson } from "./_lib/http.js";

export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  const input = await readJson(req);
  const content = await generateSeoContent(input);

  const db = await getDb();
  if (db) {
    await db.collection("contentDrafts").insertOne({
      input,
      content,
      status: "draft",
      createdAt: new Date(),
    });
  }

  sendJson(res, 200, { ok: true, content });
}
