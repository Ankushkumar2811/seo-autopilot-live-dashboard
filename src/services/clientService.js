import { api } from "./apiClient.js";
export const clientService={list:()=>api("/api/clients"),create:(client)=>api("/api/clients",client),update:(id,client)=>api(`/api/clients/${id}`,client,{method:"PATCH"}),remove:(id)=>api(`/api/clients/${id}`,{}, {method:"DELETE"})};
