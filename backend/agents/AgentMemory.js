export class AgentMemory {
  constructor(db) { this.db=db; }
  async get(context, agentId) { return (await this.db.collection("agentMemory").findOne({organizationId:context.organizationId,clientId:context.clientId||null,agentId}))?.memory||{}; }
  async remember(context, agentId, patch) { const now=new Date(); await this.db.collection("agentMemory").updateOne({organizationId:context.organizationId,clientId:context.clientId||null,agentId},{$set:{memory:patch,updatedAt:now,updatedBy:context.userId},$setOnInsert:{createdBy:context.userId,createdAt:now}},{upsert:true}); return patch; }
  async merge(context, agentId, patch) { const current=await this.get(context,agentId); return this.remember(context,agentId,{...current,...patch}); }
  async history(context, agentId, limit=20) { return this.db.collection("agentJobs").find({organizationId:context.organizationId,clientId:context.clientId||null,agentId,status:"completed"},{projection:{input:0}}).sort({finishedAt:-1}).limit(Math.min(100,limit)).toArray(); }
}
