import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { createServer } from 'vite';

// D1 efímera: aplica las migraciones reales sin escribir en la base del usuario.
const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: { DB: 'test-enrollments' } }));
const server = await createServer({ configFile: 'frontend/vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
try {
  const db = await mf.getD1Database('DB');
  for (const file of (await readdir('backend/migrations')).filter(file => file.endsWith('.sql')).sort()) {
    const sql = await readFile(`backend/migrations/${file}`, 'utf8');
    await db.batch(sql.split('--> statement-breakpoint').filter(part => part.trim()).map(part => db.prepare(part)));
  }
  await db.prepare("INSERT INTO tipo_evento (id,nombre,requiere_pago) VALUES (1,'Evento',0),(2,'Curso',1)").run();
  await db.prepare("INSERT INTO ubicaciones (id,nombre) VALUES (1,'Prueba')").run();
  await db.prepare("INSERT INTO eventos (id,tipo_evento_id,ubicacion_id,nombre,precio,cupo_maximo,estado) VALUES (1,1,1,'Gratuito',0,1,'ABIERTO'),(2,2,1,'Pago',1000,4,'ABIERTO'),(3,1,1,'Cerrado',0,4,'CERRADO'),(4,1,1,'Concurrente',0,1,'ABIERTO')").run();
  await db.prepare("INSERT INTO fechas (evento_id,fecha,horario) VALUES (1,'2026-11-28','16:00-18:00'),(2,'2026-11-28','16:00-18:00'),(3,'2026-11-28','16:00-18:00'),(4,'2026-11-28','16:00-18:00')").run();
  const { enrollmentRoutes } = await server.ssrLoadModule('/backend/src/routes/enrollments.ts');
  const env = { APP_ENV: 'local', cafe_cabra_agenda_db: db };
  const data = { eventId: '1', requestId: crypto.randomUUID(), name: 'Persona Prueba', email: 'prueba@example.com', phone: '+56 9 1234 5678', instagram: '@prueba', dietaryPreference: 'vegan', dietaryOther: '', allergyStatus: 'yes', allergyDetails: 'Frutos secos', notes: 'Prueba automatizada', confirmed: true };
  const send = (body, bindings = env) => enrollmentRoutes.request('/inscripciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, bindings);
  assert.equal((await send({ ...data, email: 'incorrecto' })).status, 400);
  assert.equal((await send({ ...data, confirmed: false })).status, 400);
  assert.equal((await send({ ...data, eventId: '2' })).status, 409);
  assert.equal((await send({ ...data, eventId: '3' })).status, 409);
  assert.equal((await send(data, { ...env, APP_ENV: 'production' })).status, 404);
  const saved = await send(data);
  assert.equal(saved.status, 201);
  const receipt = await saved.json();
  assert.equal(receipt.status, 'CONFIRMADO');
  assert.equal((await send(data)).status, 200, 'Reintentar no duplica');
  assert.equal((await send(data, { ...env, APP_ENV: 'staging' })).status, 200, 'La inscripción está habilitada en desarrollo');
  assert.equal((await send({ ...data, requestId: crypto.randomUUID() })).status, 409, 'Evita duplicar persona');
  assert.equal((await send({ ...data, requestId: crypto.randomUUID(), email: 'otro@example.com' })).status, 409, 'Respeta el cupo');
  const row = await db.prepare('SELECT * FROM reservas WHERE codigo=?').bind(receipt.code).first();
  assert.equal(row.estado, 'CONFIRMADO');
  assert.equal(row.banco_origen, null);
  assert.equal(JSON.parse(row.observaciones).allergyDetails, undefined, 'Los eventos no guardan preferencias ni alergias');
  assert.equal(JSON.parse(row.observaciones).dietaryPreference, undefined);
  assert.equal(JSON.parse(row.observaciones).instagram, 'prueba');
  const concurrent = await Promise.all(['a', 'b'].map(person => send({ ...data, eventId: '4', email: `${person}@example.com`, requestId: crypto.randomUUID() })));
  assert.deepEqual(concurrent.map(response => response.status).sort(), [201, 409]);
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM reservas').first()).count, 2);
  console.log('OK: guardado, validación, reintento, duplicados, cupos concurrentes y bloqueo remoto/pago.');
} finally { await server.close(); await mf.dispose(); }
