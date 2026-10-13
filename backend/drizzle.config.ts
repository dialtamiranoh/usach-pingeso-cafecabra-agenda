import { defineConfig } from 'drizzle-kit';
// Generación local, sin credenciales ni conexión remota.
export default defineConfig({dialect:'sqlite',schema:'./src/db/schema.ts',out:'./migrations'});
