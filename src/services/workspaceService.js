import { api } from "./apiClient.js";
export const workspaceService={load:()=>api("/api/workspace"),save:(workspace)=>api("/api/workspace",workspace,{method:"PUT"})};
