import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppBindings } from '../config/bindings';
import { createDb } from '../db';
import { createAuth } from '../auth';
import { ubicaciones, tipoEvento, instructores, opcionesAlimentarias } from '../db/schema';

// CRUD de mantenedores (RF-31): ubicaciones, instructores y opciones alimentarias. Baja
// lógica (activo=false), nunca borrado físico, y auditoría del último operador (RF-34).
// Tipos de evento queda como catálogo fijo de solo lectura (selector al crear eventos).
// Todo detrás de sesión de administrador.

type Entorno = { Bindings: AppBindings; Variables: { userId: string } };

export const mantenedorRoutes = new Hono<Entorno>();

// Guard: exige sesión de admin para toda la sección y expone el id del operador.
mantenedorRoutes.use('/admin/mantenedores/*', async (c, next) => {
  let sesion;
  try { sesion = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers }); } catch { sesion = null; }
  if (!sesion) return c.json({ error: 'No autorizado' }, 401);
  c.set('userId', sesion.user.id);
  await next();
});

// Marca de auditoría común a toda operación manual.
function audit(c: Context<Entorno>) {
  return { actualizadoPor: c.get('userId'), actualizadoEn: new Date() };
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}
function textoOpcional(valor: unknown): string | null {
  const t = texto(valor);
  return t.length > 0 ? t : null;
}

/* ───────── Ubicaciones ───────── */

mantenedorRoutes.get('/admin/mantenedores/ubicaciones', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const filas = await db.select().from(ubicaciones).orderBy(ubicaciones.nombre);
  return c.json(filas.map(u => ({ id: u.id, nombre: u.nombre, direccion: u.direccion, referencia: u.referencia, activo: u.activo })));
});

mantenedorRoutes.post('/admin/mantenedores/ubicaciones', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const b = await c.req.json().catch(() => null);
  const nombre = texto(b?.nombre);
  if (nombre.length < 2) return c.json({ error: 'El nombre es obligatorio.' }, 400);
  const [fila] = await db.insert(ubicaciones).values({
    nombre, direccion: textoOpcional(b?.direccion), referencia: textoOpcional(b?.referencia), ...audit(c),
  }).returning();
  return c.json({ id: fila.id, nombre: fila.nombre, direccion: fila.direccion, referencia: fila.referencia, activo: fila.activo }, 201);
});

mantenedorRoutes.patch('/admin/mantenedores/ubicaciones/:id', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => null);
  const cambios: Partial<typeof ubicaciones.$inferInsert> = audit(c);
  if (typeof b?.nombre === 'string') { if (texto(b.nombre).length < 2) return c.json({ error: 'Nombre inválido.' }, 400); cambios.nombre = texto(b.nombre); }
  if (b && 'direccion' in b) cambios.direccion = textoOpcional(b.direccion);
  if (b && 'referencia' in b) cambios.referencia = textoOpcional(b.referencia);
  if (typeof b?.activo === 'boolean') cambios.activo = b.activo;
  const [fila] = await db.update(ubicaciones).set(cambios).where(eq(ubicaciones.id, id)).returning();
  if (!fila) return c.json({ error: 'No encontrado.' }, 404);
  return c.json({ id: fila.id, nombre: fila.nombre, direccion: fila.direccion, referencia: fila.referencia, activo: fila.activo });
});

/* ───────── Tipos de evento (solo lectura, para el selector al crear eventos) ───────── */

mantenedorRoutes.get('/admin/mantenedores/tipos-evento', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const filas = await db.select().from(tipoEvento).orderBy(tipoEvento.nombre);
  return c.json(filas.map(t => ({ id: t.id, nombre: t.nombre, requierePago: t.requierePago, activo: t.activo })));
});

/* ───────── Instructores ───────── */

mantenedorRoutes.get('/admin/mantenedores/instructores', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const filas = await db.select().from(instructores).orderBy(instructores.nombre);
  return c.json(filas.map(i => ({ id: i.id, nombre: i.nombre, bio: i.bio, fotoUrl: i.fotoUrl, email: i.email, activo: i.activo })));
});

mantenedorRoutes.post('/admin/mantenedores/instructores', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const b = await c.req.json().catch(() => null);
  const nombre = texto(b?.nombre);
  if (nombre.length < 2) return c.json({ error: 'El nombre es obligatorio.' }, 400);
  const [fila] = await db.insert(instructores).values({
    nombre, bio: textoOpcional(b?.bio), fotoUrl: textoOpcional(b?.fotoUrl), email: textoOpcional(b?.email), ...audit(c),
  }).returning();
  return c.json({ id: fila.id, nombre: fila.nombre, bio: fila.bio, fotoUrl: fila.fotoUrl, email: fila.email, activo: fila.activo }, 201);
});

mantenedorRoutes.patch('/admin/mantenedores/instructores/:id', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => null);
  const cambios: Partial<typeof instructores.$inferInsert> = audit(c);
  if (typeof b?.nombre === 'string') { if (texto(b.nombre).length < 2) return c.json({ error: 'Nombre inválido.' }, 400); cambios.nombre = texto(b.nombre); }
  if (b && 'bio' in b) cambios.bio = textoOpcional(b.bio);
  if (b && 'fotoUrl' in b) cambios.fotoUrl = textoOpcional(b.fotoUrl);
  if (b && 'email' in b) cambios.email = textoOpcional(b.email);
  if (typeof b?.activo === 'boolean') cambios.activo = b.activo;
  const [fila] = await db.update(instructores).set(cambios).where(eq(instructores.id, id)).returning();
  if (!fila) return c.json({ error: 'No encontrado.' }, 404);
  return c.json({ id: fila.id, nombre: fila.nombre, bio: fila.bio, fotoUrl: fila.fotoUrl, email: fila.email, activo: fila.activo });
});

/* ───────── Opciones alimentarias ───────── */

mantenedorRoutes.get('/admin/mantenedores/opciones', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const filas = await db.select().from(opcionesAlimentarias).orderBy(opcionesAlimentarias.nombre);
  return c.json(filas.map(o => ({ id: o.id, nombre: o.nombre, activo: o.activo })));
});

mantenedorRoutes.post('/admin/mantenedores/opciones', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const b = await c.req.json().catch(() => null);
  const nombre = texto(b?.nombre);
  if (nombre.length < 2) return c.json({ error: 'El nombre es obligatorio.' }, 400);
  const [fila] = await db.insert(opcionesAlimentarias).values({ nombre, ...audit(c) }).returning();
  return c.json({ id: fila.id, nombre: fila.nombre, activo: fila.activo }, 201);
});

mantenedorRoutes.patch('/admin/mantenedores/opciones/:id', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => null);
  const cambios: Partial<typeof opcionesAlimentarias.$inferInsert> = audit(c);
  if (typeof b?.nombre === 'string') { if (texto(b.nombre).length < 2) return c.json({ error: 'Nombre inválido.' }, 400); cambios.nombre = texto(b.nombre); }
  if (typeof b?.activo === 'boolean') cambios.activo = b.activo;
  const [fila] = await db.update(opcionesAlimentarias).set(cambios).where(eq(opcionesAlimentarias.id, id)).returning();
  if (!fila) return c.json({ error: 'No encontrado.' }, 404);
  return c.json({ id: fila.id, nombre: fila.nombre, activo: fila.activo });
});