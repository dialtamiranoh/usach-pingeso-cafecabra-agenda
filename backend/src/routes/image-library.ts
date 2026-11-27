import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppBindings } from '../config/bindings';
import { getAdminSession } from './admin';
import { inspectWebP, MAX_IMAGE_BYTES, imageUrl } from '../services/library-images';

export const imageLibraryRoutes = new Hono<{ Bindings: AppBindings; Variables: { adminId: string } }>();
imageLibraryRoutes.use('/admin/imagenes*', async (c, next) => {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  if (!session) return c.json({ error: 'Debes iniciar sesión como administrador.' }, 401);
  const active = await c.env.cafe_cabra_agenda_db.prepare('SELECT activo FROM user WHERE id=?').bind(session.user.id).first<{ activo: number }>();
  if (!active?.activo) return c.json({ error: 'Cuenta inactiva.' }, 401);
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    const origin = c.req.header('origin');
    if (origin && !c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(s => s.trim()).includes(origin))
      return c.json({ error: 'Origen no autorizado.' }, 403);
  }
  c.set('adminId', session.user.id);
  await next();
});
imageLibraryRoutes.use('/admin/imagenes*', bodyLimit({ maxSize: MAX_IMAGE_BYTES, onError: c => c.json({ error: 'La imagen optimizada supera los 500 KB.' }, 413) }));
imageLibraryRoutes.onError((error, c) => {
  console.error('Biblioteca de imágenes:', error.message);
  return c.json({ error: 'No pudimos completar la operación. Intenta nuevamente.' }, 500);
});
imageLibraryRoutes.get('/admin/imagenes', async c => {
  const page = Number(c.req.query('page') ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return c.json({ error: 'Página inválida.' }, 400);
  const q = (c.req.query('q') ?? '').trim().slice(0, 100);
  const db = c.env.cafe_cabra_agenda_db;
  const total = await db.prepare("SELECT COUNT(*) n FROM biblioteca_imagenes WHERE instr(lower(nombre),lower(?))>0").bind(q).first<{ n: number }>();
  const rows = await db.prepare("SELECT id,nombre,peso,ancho,alto,estado,creado_en FROM biblioteca_imagenes WHERE instr(lower(nombre),lower(?))>0 ORDER BY creado_en DESC,id DESC LIMIT 24 OFFSET ?").bind(q, (page - 1) * 24).all<{ id: string; nombre: string; peso: number; ancho: number; alto: number; estado: string; creado_en: number }>();
  const items = await Promise.all(rows.results.map(async row => {
    const used = await db.prepare('SELECT DISTINCT e.id,e.nombre FROM evento_media m JOIN eventos e ON e.id=m.evento_id WHERE m.imagen_id=? ORDER BY e.nombre').bind(row.id).all<{ id: number; nombre: string }>();
    return { ...row, url: imageUrl(row.id), usos: used.results };
  }));
  return c.json({ items, total: total?.n ?? 0, page, pageSize: 24 });
});
imageLibraryRoutes.post('/admin/imagenes', async c => {
  if (!c.env.R2_MEDIA) return c.json({ error: 'El almacenamiento de imágenes no está configurado.' }, 503);
  if (c.req.header('content-type')?.split(';')[0] !== 'image/webp') return c.json({ error: 'Solo se almacena WebP optimizado.' }, 415);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  const size = inspectWebP(bytes);
  if (!size) return c.json({ error: 'Imagen inválida. Debe ser WebP estático, de hasta 1600 píxeles y 500 KB.' }, 400);
  let name: string;
  try { name = decodeURIComponent(c.req.header('x-file-name') ?? 'imagen.webp'); } catch { return c.json({ error: 'Nombre inválido.' }, 400); }
  name = name.split(/[\\/]/).pop()!.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 120) || 'imagen.webp';
  const id = crypto.randomUUID(), key = 'biblioteca/' + id + '.webp';
  await c.env.R2_MEDIA.put(key, bytes, { httpMetadata: { contentType: 'image/webp' } });
  try {
    await c.env.cafe_cabra_agenda_db.prepare('INSERT INTO biblioteca_imagenes(id,clave,nombre,peso,ancho,alto,creado_por) VALUES(?,?,?,?,?,?,?)')
      .bind(id, key, name, bytes.length, size.width, size.height, c.get('adminId')).run();
  } catch (error) {
    await c.env.R2_MEDIA.delete(key).catch(() => {});
    throw error;
  }
  return c.json({ id, nombre: name, peso: bytes.length, ancho: size.width, alto: size.height, estado: 'ACTIVA', url: imageUrl(id), usos: [] }, 201);
});
imageLibraryRoutes.delete('/admin/imagenes/:id', async c => {
  if (!c.env.R2_MEDIA) return c.json({ error: 'El almacenamiento de imágenes no está configurado.' }, 503);
  const db = c.env.cafe_cabra_agenda_db, id = c.req.param('id');
  const image = await db.prepare('SELECT clave FROM biblioteca_imagenes WHERE id=?').bind(id).first<{ clave: string }>();
  if (!image) return c.json({ error: 'La imagen no existe.' }, 404);
  // El bloqueo y los triggers de evento_media impiden asignar una imagen mientras se elimina.
  const mark = await db.prepare("UPDATE biblioteca_imagenes SET estado='ELIMINANDO' WHERE id=? AND NOT EXISTS(SELECT 1 FROM evento_media WHERE imagen_id=?)").bind(id, id).run();
  if (!mark.meta.changes) return c.json({ error: 'La imagen está en uso. Quítala de sus cursos o eventos antes de eliminarla.' }, 409);
  try { await c.env.R2_MEDIA.delete(image.clave); } catch {
    return c.json({ error: 'No se pudo eliminar el archivo. Puedes reintentar la eliminación.' }, 503);
  }
  await db.prepare("DELETE FROM biblioteca_imagenes WHERE id=? AND estado='ELIMINANDO'").bind(id).run();
  return c.json({ ok: true });
});
imageLibraryRoutes.get('/imagenes/:id', async c => {
  if (!c.env.R2_MEDIA) return c.notFound();
  const row = await c.env.cafe_cabra_agenda_db.prepare("SELECT clave FROM biblioteca_imagenes WHERE id=? AND estado='ACTIVA'").bind(c.req.param('id')).first<{ clave: string }>();
  if (!row) return c.notFound();
  const object = await c.env.R2_MEDIA.get(row.clave);
  if (!object) return c.notFound();
  return new Response(object.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=300', 'X-Content-Type-Options': 'nosniff', 'ETag': object.httpEtag } });
});
