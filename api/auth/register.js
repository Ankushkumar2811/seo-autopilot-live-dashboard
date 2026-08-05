import { withApiHandler } from "../../backend/middleware/api-handler.js";
import { readJson, requireMethod, sendJson } from "../_lib/http.js";
import { registerUser } from "../../backend/services/auth-service.js";
import { enforceRateLimit } from "../../backend/services/rate-limit-service.js";
import { setAuthCookies } from "../../backend/security/cookies.js";
import { requireDb } from "./_shared.js";
async function handler(req,res){ if(!requireMethod(req,res,["POST"]))return; const db=await requireDb(); await enforceRateLimit(db,req,"register",{limit:5,windowSeconds:3600}); const session=await registerUser(db,await readJson(req)); setAuthCookies(res,session.accessToken,session.refreshToken); sendJson(res,201,{ok:true,user:session.user,expiresIn:session.expiresIn}); }
export default withApiHandler(handler,{authRequired:false});
