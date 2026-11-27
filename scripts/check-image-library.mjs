import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { createServer } from 'vite';

const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: { DB: 'image-library-test' }, r2Buckets: { MEDIA: 'image-library-test' } }));
const server = await createServer({ configFile: 'frontend/vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
try {
  const db = await mf.getD1Database('DB'), bucket = await mf.getR2Bucket('MEDIA');
  for (const file of (await readdir('backend/migrations')).filter(f => f.endsWith('.sql')).sort()) {
    const sql = await readFile('backend/migrations/' + file, 'utf8');
    await db.batch(sql.split('--> statement-breakpoint').filter(p => p.trim()).map(p => db.prepare(p)));
  }
  const { createAuth } = await server.ssrLoadModule('/backend/src/auth/index.ts');
  const { imageLibraryRoutes } = await server.ssrLoadModule('/backend/src/routes/image-library.ts');
  const { eventoAdminRoutes } = await server.ssrLoadModule('/backend/src/routes/eventos-admin.ts');
  const { listEvents } = await server.ssrLoadModule('/backend/src/routes/catalog.ts');
  const { inspectWebP } = await server.ssrLoadModule('/backend/src/services/library-images.ts');
  const env = { APP_ENV: 'local', cafe_cabra_agenda_db: db, R2_MEDIA: bucket, BETTER_AUTH_SECRET: 'temporary-image-library-test-secret-at-least-thirty-two', BETTER_AUTH_URL: 'http://localhost:5173', BETTER_AUTH_TRUSTED_ORIGINS: 'http://localhost:5173' };
  const auth = createAuth(env, { allowSignUp: true });
  await auth.api.signUpEmail({ body: { email: 'owner@example.com', name: 'Admin de prueba', password: 'temporal-prueba-imagenes' } });
  const login = await auth.api.signInEmail({ body: { email: 'owner@example.com', password: 'temporal-prueba-imagenes' }, asResponse: true });
  const cookie = login.headers.getSetCookie().map(h => h.split(';')[0]).join('; ');
  const headers = { Cookie: cookie, Origin: 'http://localhost:5173' };
  const image = Buffer.from('UklGRjwAAABXRUJQVlA4IDAAAADQAQCdASoQAAwAAUAmJaACdLoB+AADsAD+8Skv/hynw5T4cp/w5T/xu7cy7UAAAAA=', 'base64');
  assert.deepEqual(inspectWebP(image), { width: 16, height: 12 });
  const oversized = Buffer.from(image); oversized.writeUInt16LE(1601, 26);
  assert.equal(inspectWebP(oversized), null);
  assert.equal(inspectWebP(image.subarray(0, 30)), null);
  const request = (path, init = {}, bindings = env) => imageLibraryRoutes.request(path, { ...init, headers: { ...headers, ...init.headers } }, bindings);
  const upload = (name = 'foto.webp', data = image, bindings = env) => request('/admin/imagenes', { method: 'POST', headers: { 'Content-Type': 'image/webp', 'X-File-Name': encodeURIComponent(name) }, body: data }, bindings);
  assert.equal((await imageLibraryRoutes.request('/admin/imagenes', {}, env)).status, 401);
  assert.equal((await request('/admin/imagenes', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: image })).status, 403);
  assert.equal((await request('/admin/imagenes', { method: 'POST', headers: { 'Content-Type': 'image/svg+xml' }, body: '<svg></svg>' })).status, 415);
  assert.equal((await upload('incorrecta.webp', Buffer.from('not a picture'))).status, 400);
  assert.equal((await upload('grande.webp', Buffer.alloc(500 * 1024 + 1))).status, 413);
  assert.equal((await upload('ancha.webp', oversized)).status, 400);
  const images = [];
  for (let i = 0; i < 4; i++) { const res = await upload('foto ' + (i + 1) + '.webp'); assert.equal(res.status, 201); images.push(await res.json()); }
  const listed = await (await request('/admin/imagenes?q=foto')).json();
  assert.equal(listed.total, 4);
  assert.equal((await bucket.list()).objects.length, 4);
  const publicImage = await imageLibraryRoutes.request('/imagenes/' + images[0].id, {}, env);
  assert.equal(publicImage.status, 200); assert.equal(publicImage.headers.get('content-type'), 'image/webp');
  assert.deepEqual(Buffer.from(await publicImage.arrayBuffer()), image);
  const failingBucket = { put: (...args) => bucket.put(...args), delete: (...args) => bucket.delete(...args) };
  await db.exec("CREATE TRIGGER fail_upload BEFORE INSERT ON biblioteca_imagenes WHEN NEW.nombre='fallo.webp' BEGIN SELECT RAISE(ABORT,'simulated'); END");
  assert.equal((await upload('fallo.webp', image, { ...env, R2_MEDIA: failingBucket })).status, 500);
  assert.equal((await bucket.list()).objects.length, 4, 'A failed metadata write removes the object');
  await db.exec('DROP TRIGGER fail_upload');

  await db.prepare("INSERT INTO ubicaciones(id,nombre) VALUES(1,'Café de prueba')").run();
  const type = await db.prepare("SELECT id FROM tipo_evento WHERE nombre='Cata'").first();
  const payload = { tipoEventoId: type.id, ubicacionId: 1, nombre: 'Cata con galería', descripcion: 'Descripción de prueba', precio: 0, cupoMaximo: 10, controlaCupo: true, instructorIds: [], opcionAlimentariaIds: [], imagenIds: images.slice(0, 3).map(i => i.id), ediciones: [{ cupoMaximo: 10, jornadas: [{ fecha: '2027-01-10', horario: '10:00-12:00' }] }] };
  const eventRequest = (path, method, body) => eventoAdminRoutes.request(path, { method, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, env);
  assert.equal((await eventRequest('/admin/eventos', 'POST', { ...payload, imagenIds: images.map(i => i.id) })).status, 400);
  assert.equal((await eventRequest('/admin/eventos', 'POST', { ...payload, imagenIds: ['not-in-the-library'] })).status, 400);
  assert.equal((await eventRequest('/admin/eventos', 'POST', { ...payload, imagenIds: [images[0].id, images[0].id] })).status, 400);
  const created = await eventRequest('/admin/eventos', 'POST', payload);
  assert.equal(created.status, 201, await created.clone().text());
  const event = await created.json();
  assert.deepEqual(event.imagenes.map(i => i.id), payload.imagenIds);
  const gallery = await db.prepare('SELECT imagen_id,es_principal,orden FROM evento_media WHERE evento_id=? ORDER BY orden').bind(event.id).all();
  assert.deepEqual(gallery.results.map(i => i.es_principal), [1, 0, 0]);
  const catalog = await listEvents(db, true);
  assert.deepEqual(catalog.find(e => e.id === String(event.id)).images, images.slice(0, 3).map(i => i.url));
  assert.equal((await request('/admin/imagenes/' + images[0].id, { method: 'DELETE' })).status, 409);
  assert.equal((await bucket.list()).objects.length, 4);
  // A second event reuses a library entry without uploading another file.
  assert.equal((await eventRequest('/admin/eventos', 'POST', { ...payload, nombre: 'Otra cata', imagenIds: [images[0].id] })).status, 201);
  assert.equal((await (await request('/admin/imagenes')).json()).items.find(i => i.id === images[0].id).usos.length, 2);
  const edited = { ...payload, ediciones: event.ediciones, imagenIds: [images[2].id, images[1].id] };
  const updated = await eventRequest('/admin/eventos/' + event.id, 'PATCH', edited);
  assert.equal(updated.status, 200);
  assert.deepEqual((await updated.json()).imagenes.map(i => i.id), edited.imagenIds);
  // Omitted field preserves existing photos, including legacy external URLs.
  await db.prepare("INSERT INTO eventos(id,tipo_evento_id,ubicacion_id,nombre,estado) VALUES(100,?,1,'Anterior','ABIERTO')").bind(type.id).run();
  await db.prepare("INSERT INTO evento_media(evento_id,url,tipo) VALUES(100,'https://example.com/old.jpg','IMAGEN')").run();
  await db.prepare("INSERT INTO ediciones(id,evento_id,cupo_maximo) VALUES('old-edition',100,10)").run();
  const oldPayload = { ...payload, ediciones: [{ id: 'old-edition', cupoMaximo: 10, jornadas: [{ fecha: '2027-01-10', horario: '10:00-12:00' }] }] }; delete oldPayload.imagenIds;
  assert.equal((await eventRequest('/admin/eventos/100', 'PATCH', oldPayload)).status, 200);
  assert.equal((await db.prepare('SELECT url FROM evento_media WHERE evento_id=100').first()).url, 'https://example.com/old.jpg');
  const unusedId = images[3].id;
  const failDeletion = { delete: async () => { throw new Error('simulated storage failure'); } };
  assert.equal((await request('/admin/imagenes/' + unusedId, { method: 'DELETE' }, { ...env, R2_MEDIA: failDeletion })).status, 503);
  // An image marked for deletion cannot be linked, even if validation raced with deletion.
  await assert.rejects(db.prepare("INSERT INTO evento_media(evento_id,imagen_id,url,tipo) VALUES(100,?,?,'IMAGEN')").bind(unusedId, '/api/imagenes/' + unusedId).run());
  assert.equal((await request('/admin/imagenes/' + unusedId, { method: 'DELETE' })).status, 200);
  assert.equal((await imageLibraryRoutes.request('/imagenes/' + unusedId, {}, env)).status, 404);
  assert.equal((await bucket.list()).objects.length, 3);
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
  assert.equal((await request('/admin/imagenes?page=-1')).status, 400);
  console.log('OK: autenticación, formato y límites, D1 + R2, compensación de fallos, hasta tres imágenes, portada y orden, reutilización, catálogo, fotos anteriores y eliminación protegida con reintento. Solo recursos temporales.');
} finally { await server.close(); await mf.dispose(); }
