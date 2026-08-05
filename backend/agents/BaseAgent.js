import { logger } from "../lib/logger.js";

export class BaseAgent {
  constructor({ id, name, description, memory, events }) {
    if (!id || !name) throw new Error("Agent id and name are required");
    this.id = id; this.name = name; this.description = description || ""; this.memory = memory; this.events = events;
  }

  async validate(input, context) {
    if (!context?.organizationId || !context?.userId) throw new Error("Agent requires tenant and user context");
    if (!input || typeof input !== "object") throw new Error("Agent input must be an object");
    return true;
  }

  async execute() { throw new Error(`${this.id}.execute() is not implemented`); }
  async rollback() { return { rolledBack: false, reason: "no_side_effects" }; }
  log(level, message, context = {}) { (logger[level] || logger.info)(message, { agentId: this.id, ...context }); }

  async run(input, context) {
    const startedAt = new Date();
    await this.validate(input, context);
    try {
      const result = await this.execute(input, context);
      return { ok: true, agentId: this.id, output: result?.output ?? result, metrics: result?.metrics || {}, startedAt, finishedAt: new Date() };
    } catch (error) {
      let rollback;
      try { rollback = await this.rollback(input, context, error); } catch (rollbackError) { rollback = { rolledBack: false, error: rollbackError.message }; }
      error.agentResult = { ok: false, agentId: this.id, rollback, startedAt, finishedAt: new Date() };
      throw error;
    }
  }
}
