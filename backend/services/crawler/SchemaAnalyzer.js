export class SchemaAnalyzer {
  analyze(blocks) { const schemas = [], errors = []; for (const raw of blocks) { try { const value = JSON.parse(raw); const items = Array.isArray(value) ? value : value?.["@graph"] || [value]; for (const item of items) schemas.push({ type: item?.["@type"] || "Unknown", valid: Boolean(item?.["@context"] || value?.["@context"]), data: item }); } catch (error) { errors.push(error.message); } } return { schemas, types: [...new Set(schemas.map((schema) => schema.type).flat())], errors, hasSchema: schemas.length > 0 }; }
}
