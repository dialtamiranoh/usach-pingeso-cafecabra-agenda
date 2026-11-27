import { Hono, type Context } from 'hono';
import { eq } from 'drizzle-orm';
import type { AppBindings } from '../config/bindings';
import { createDb } from '../db';
import { createAuth } from '../auth';
import { ubicaciones, tipoEvento, instructores, opcionesAlimentarias, configuracion } from '../db/schema';


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
  return c.json(filas.map(i => ({ id: i.id, nombre: i.nombre, bio: i.bio, email: i.email, activo: i.activo })));
});

mantenedorRoutes.post('/admin/mantenedores/instructores', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const b = await c.req.json().catch(() => null);
  const nombre = texto(b?.nombre);
  if (nombre.length < 2) return c.json({ error: 'El nombre es obligatorio.' }, 400);
  const [fila] = await db.insert(instructores).values({
    nombre, bio: textoOpcional(b?.bio), email: textoOpcional(b?.email), ...audit(c),
  }).returning();
  return c.json({ id: fila.id, nombre: fila.nombre, bio: fila.bio, email: fila.email, activo: fila.activo }, 201);
});

mantenedorRoutes.patch('/admin/mantenedores/instructores/:id', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const id = Number(c.req.param('id'));
  const b = await c.req.json().catch(() => null);
  const cambios: Partial<typeof instructores.$inferInsert> = audit(c);
  if (typeof b?.nombre === 'string') { if (texto(b.nombre).length < 2) return c.json({ error: 'Nombre inválido.' }, 400); cambios.nombre = texto(b.nombre); }
  if (b && 'bio' in b) cambios.bio = textoOpcional(b.bio);
  if (b && 'email' in b) cambios.email = textoOpcional(b.email);
  if (typeof b?.activo === 'boolean') cambios.activo = b.activo;
  const [fila] = await db.update(instructores).set(cambios).where(eq(instructores.id, id)).returning();
  if (!fila) return c.json({ error: 'No encontrado.' }, 404);
  return c.json({ id: fila.id, nombre: fila.nombre, bio: fila.bio, email: fila.email, activo: fila.activo });
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

/* ───────── Configuración de negocio (RN-29: cuenta de transferencia, vencimiento, correos) ───────── */

// Claves editables desde el panel. 'entorno' queda fuera: es de solo lectura.
const CONFIG_EDITABLES = [
  'pago:titular', 'pago:rut', 'pago:banco', 'pago:tipo_cuenta', 'pago:numero_cuenta',
  'pago:correo_notificacion', 'pago:plazo_horas', 'notificaciones:admin_email',
] as const;
const CONFIG_CLAVES: readonly string[] = [...CONFIG_EDITABLES, 'entorno'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Valida una clave antes de escribirla. Devuelve el mensaje de error, o null si es válida.
function validarConfig(clave: string, valor: string): string | null {
  if (clave === 'pago:plazo_horas') {
    const n = Number(valor);
    if (!Number.isInteger(n) || n < 1 || n > 168) return 'El plazo debe ser un entero de horas entre 1 y 168.';
    return null;
  }
  if (clave === 'pago:correo_notificacion' || clave === 'notificaciones:admin_email') {
    return EMAIL_RE.test(valor) ? null : 'El correo no tiene un formato válido.';
  }
  return valor.length >= 1 ? null : 'El valor es obligatorio.';
}

// Lee el conjunto de claves conocidas y rellena las editables que falten con cadena vacía.
async function leerConfig(db: ReturnType<typeof createDb>, appEnv: string) {
  const filas = await db.select({ clave: configuracion.clave, valor: configuracion.valor }).from(configuracion);
  const mapa: Record<string, string> = {};
  for (const f of filas) if (CONFIG_CLAVES.includes(f.clave)) mapa[f.clave] = f.valor ?? '';
  for (const clave of CONFIG_EDITABLES) if (!(clave in mapa)) mapa[clave] = '';
  return { valores: mapa, entorno: mapa['entorno'] ?? appEnv };
}

mantenedorRoutes.get('/admin/mantenedores/configuracion', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  return c.json(await leerConfig(db, c.env.APP_ENV));
});

mantenedorRoutes.patch('/admin/mantenedores/configuracion', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const b = await c.req.json().catch(() => null);
  const entrada = (b && typeof b === 'object' && b.valores && typeof b.valores === 'object') ? b.valores as Record<string, unknown> : null;
  if (!entrada) return c.json({ error: 'Formato inválido.' }, 400);

  // Solo claves de la lista blanca; valida cada una antes de escribir nada.
  const cambios: { clave: string; valor: string }[] = [];
  for (const clave of CONFIG_EDITABLES) {
    if (!(clave in entrada)) continue;
    const valor = texto(entrada[clave]);
    const error = validarConfig(clave, valor);
    if (error) return c.json({ error: `${clave}: ${error}` }, 400);
    cambios.push({ clave, valor });
  }
  if (!cambios.length) return c.json({ error: 'No hay cambios para guardar.' }, 400);

  const marca = audit(c);
  for (const { clave, valor } of cambios) {
    await db.insert(configuracion).values({ clave, valor, ...marca })
      .onConflictDoUpdate({ target: configuracion.clave, set: { valor, ...marca } });
  }
  return c.json(await leerConfig(db, c.env.APP_ENV));
});
