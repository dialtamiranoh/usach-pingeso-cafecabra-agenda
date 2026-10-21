import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// El binding pertenece a la petición y al ambiente en ejecución.
export function createDb(database: D1Database) {
  return drizzle(database, { schema });
}
export { schema };
