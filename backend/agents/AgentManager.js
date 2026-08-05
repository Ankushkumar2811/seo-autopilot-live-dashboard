import { ObjectId } from "mongodb";
import crypto from "node:crypto";

const ACTIVE = ["queued", "running", "retrying"];
export class AgentManager {
  constructor({ db, registry, events }) { this.db = db; this.registry = registry; this.events = events; this.workflowEngine = null; this.scheduler = null; }
  setWorkflowEngine(engine) { this.workflowEngine = engine; }
  setScheduler(scheduler) { this.scheduler = scheduler; }
  schedule(options) { if (!this.scheduler) throw new Error("Agent scheduler is not configured"); return this.scheduler.schedule(options); }

  async enqueue({ agentId, input = {}, context, idempotencyKey, maxRetries = 2, scheduledFor = new Date(), workflow }) {
    this.registry.get(agentId);
    const now = new Date(), timeBucket = now.toISOString().slice(0, 13);
    const key = idempotencyKey || crypto.createHash("sha256").update(`${agentId}:${context.organizationId}:${context.clientId || ""}:${timeBucket}:${JSON.stringify(input)}`).digest("hex");
    const existing = await this.db.collection("agentJobs").findOne({ organizationId: context.organizationId, idempotencyKey: key, status: { $in: ACTIVE } });
    if (existing) return { job: existing, duplicate: true };
    const job = { agentId, input, organizationId: context.organizationId, clientId: context.clientId || null, createdBy: context.userId, status: "queued", attempts: 0, maxRetries: Math.max(0, Math.min(5, maxRetries)), idempotencyKey: key, activeKey: key, scheduledFor: new Date(scheduledFor), workflow: workflow || null, metrics: { tokens: 0, costEstimate: 0, retries: 0 }, history: [{ status: "queued", at: now }], createdAt: now, updatedAt: now };
    try { const result = await this.db.collection("agentJobs").insertOne(job); return { job: { ...job, _id: result.insertedId }, duplicate: false }; }
    catch (error) { if (error?.code === 11000) return { job: await this.db.collection("agentJobs").findOne({ organizationId: context.organizationId, activeKey: key }), duplicate: true }; throw error; }
  }

  async runJob(jobId, context) {
    if (!ObjectId.isValid(jobId)) throw new Error("Invalid job id");
    const now = new Date(), leaseUntil = new Date(Date.now() + 120000);
    const job = await this.db.collection("agentJobs").findOneAndUpdate({ _id: new ObjectId(jobId), organizationId: context.organizationId, status: { $in: ["queued", "retrying"] }, scheduledFor: { $lte: now } }, { $set: { status: "running", startedAt: now, leaseUntil, updatedAt: now }, $inc: { attempts: 1 }, $push: { history: { status: "running", at: now } } }, { returnDocument: "after" });
    if (!job) throw new Error("Job is unavailable, cancelled, already running, or belongs to another organization");
    const agent = this.registry.get(job.agentId), started = Date.now();
    try {
      const result = await agent.run(job.input, { ...context, db: this.db, clientId: job.clientId, jobId: job._id });
      const metrics = { ...(result.metrics || {}), executionMs: Date.now() - started, retries: Math.max(0, job.attempts - 1) };
      const saved = await this.db.collection("agentJobs").updateOne({ _id: job._id, organizationId: context.organizationId, status: "running" }, { $set: { status: "completed", output: result.output, metrics, finishedAt: new Date(), updatedAt: new Date() }, $unset: { leaseUntil: "" }, $push: { history: { status: "completed", at: new Date() } } });
      if (!saved.modifiedCount) return { ok: false, cancelled: true, jobId: job._id.toString(), metrics };
      if (this.workflowEngine && job.workflow) await this.workflowEngine.onJobCompleted(job, result.output, context);
      return { ...result, jobId: job._id.toString(), metrics };
    } catch (error) {
      const retry = job.attempts <= job.maxRetries, status = retry ? "retrying" : "failed", delay = Math.min(3600000, 1000 * 2 ** job.attempts);
      await this.db.collection("agentJobs").updateOne({ _id: job._id, organizationId: context.organizationId, status: "running" }, { $set: { status, error: { message: error.message, name: error.name }, scheduledFor: retry ? new Date(Date.now() + delay) : job.scheduledFor, finishedAt: retry ? null : new Date(), updatedAt: new Date(), "metrics.retries": Math.max(0, job.attempts - 1) }, $unset: { leaseUntil: "" }, $push: { history: { status, at: new Date(), error: error.message } } });
      if (!retry && job.workflow?.runId) await this.db.collection("workflowRuns").updateOne({ _id: new ObjectId(job.workflow.runId), organizationId: context.organizationId, status: "running" }, { $set: { status: "failed", failedAt: new Date(), error: { step: job.workflow.stepIndex, agentId: job.agentId, message: error.message }, updatedAt: new Date() } });
      throw error;
    }
  }

  async runNext(context) { const job = await this.db.collection("agentJobs").findOne({ organizationId: context.organizationId, status: { $in: ["queued", "retrying"] }, scheduledFor: { $lte: new Date() } }, { sort: { scheduledFor: 1, createdAt: 1 } }); return job ? this.runJob(job._id, context) : null; }
  async retry(jobId, context) { const result = await this.db.collection("agentJobs").updateOne({ _id: new ObjectId(jobId), organizationId: context.organizationId, status: "failed" }, { $set: { status: "queued", scheduledFor: new Date(), updatedAt: new Date(), error: null }, $push: { history: { status: "queued", at: new Date(), reason: "manual_retry" } } }); return result.modifiedCount === 1; }
  async cancel(jobId, context) { const result = await this.db.collection("agentJobs").updateOne({ _id: new ObjectId(jobId), organizationId: context.organizationId, status: { $in: ACTIVE } }, { $set: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() }, $push: { history: { status: "cancelled", at: new Date() } } }); return result.modifiedCount === 1; }
  async list(context, { status, limit = 100 } = {}) { return this.db.collection("agentJobs").find({ organizationId: context.organizationId, ...(status ? { status } : {}) }).sort({ createdAt: -1 }).limit(Math.min(200, limit)).toArray(); }
}
