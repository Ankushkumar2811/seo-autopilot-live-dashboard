import { api } from "./apiClient.js";
export const organizationService={get:()=>api("/api/organizations"),update:(patch)=>api("/api/organizations",patch,{method:"PATCH"})};
