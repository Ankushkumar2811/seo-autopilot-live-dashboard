export class AgentRegistry {
  constructor() { this.agents=new Map(); }
  register(agent) { if(this.agents.has(agent.id))throw new Error(`Agent already registered: ${agent.id}`);this.agents.set(agent.id,agent);return agent; }
  get(id) { const agent=this.agents.get(id);if(!agent)throw new Error(`Unknown agent: ${id}`);return agent; }
  list() { return [...this.agents.values()].map(({id,name,description})=>({id,name,description})); }
}
