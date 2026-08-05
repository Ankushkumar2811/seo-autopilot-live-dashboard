const EVENT_NAMES = ["website_added","audit_completed","blog_generated","wordpress_published","review_received","gbp_posted","keyword_added","backlink_found","automation_started","automation_completed"];
export const AgentEventNames = Object.freeze(Object.fromEntries(EVENT_NAMES.map((name) => [name.toUpperCase(), name])));

export class AgentEvents {
  constructor(db) { this.db = db; this.listeners = new Map(); }
  on(name, listener) { const list=this.listeners.get(name)||new Set(); list.add(listener); this.listeners.set(name,list); return()=>list.delete(listener); }
  async emit(name, payload, context) {
    if (!EVENT_NAMES.includes(name)) throw new Error(`Unsupported agent event: ${name}`);
    const event={name,payload,organizationId:context.organizationId,clientId:context.clientId||null,createdBy:context.userId,createdAt:new Date()};
    await this.db.collection("agentEvents").insertOne(event);
    for (const listener of this.listeners.get(name)||[]) await listener(event);
    return event;
  }
}
