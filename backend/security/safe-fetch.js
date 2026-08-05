import dns from "node:dns/promises";
import net from "node:net";
import { ValidationError } from "../lib/errors.js";

function privateAddress(address) {
  if (net.isIPv4(address)) { const p=address.split(".").map(Number); return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]>=224); }
  const value=address.toLowerCase(); return value==="::1"||value==="::"||value.startsWith("fc")||value.startsWith("fd")||value.startsWith("fe80:")||value.startsWith("::ffff:127.")||value.startsWith("::ffff:10.")||value.startsWith("::ffff:192.168.");
}
async function validateUrl(value) { const url=new URL(value); if(!["http:","https:"].includes(url.protocol)||url.username||url.password)throw new ValidationError("Only public HTTP(S) URLs are allowed"); if(["localhost","metadata.google.internal"].includes(url.hostname.toLowerCase()))throw new ValidationError("Private network URLs are not allowed"); const records=await dns.lookup(url.hostname,{all:true,verbatim:true}); if(!records.length||records.some(r=>privateAddress(r.address)))throw new ValidationError("Private network URLs are not allowed"); return url; }
export async function safePublicFetch(value,{timeoutMs=10000,maxRedirects=3,...options}={}){let url=await validateUrl(value);for(let count=0;count<=maxRedirects;count++){const response=await fetch(url,{...options,redirect:"manual",signal:AbortSignal.timeout(timeoutMs)});if(![301,302,303,307,308].includes(response.status))return response;const location=response.headers.get("location");if(!location)throw new ValidationError("Invalid redirect response");url=await validateUrl(new URL(location,url).toString());}throw new ValidationError("Too many redirects");}
