import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const mf = new Miniflare(convertV4MiniflareOptions({ modules: true, script: 'export default { fetch() { return new Response("ok") } }', d1Databases: { DB: 'test-dev-seed' } }));
try {
  const db = await mf.getD1Database('DB');
  for (const file of (await readdir('backend/migrations')).filter(file => file.endsWith('.sql')).sort()) {
    const sql = await readFile(`backend/migrations/${file}`, 'utf8');
    await db.batch(sql.split('--> statement-breakpoint').filter(part => part.trim()).map(part => db.prepare(part)));
  }
  const sql = await readFile('backend/seeds/catalogo-dev.sql', 'utf8');
  const seed = () => db.batch(sql.split('--> statement-breakpoint').filter(part => part.trim()).map(part => db.prepare(part)));
  await seed();
  await seed();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM eventos').first()).n, 4);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM fechas').first()).n, 6);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM reservas').first()).n, 0);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM user').first()).n, 0);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM configuracion WHERE valor='CONJUNTAS'").first()).n, 1);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM evento_media').first()).n, 4);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM evento_instructores').first()).n, 3);
  assert.equal((await db.prepare('PRAGMA foreign_key_check').all()).results.length, 0);
  await db.prepare("UPDATE eventos SET precio=123456 WHERE id=1").run();
  await seed();
  assert.equal((await db.prepare('SELECT precio FROM eventos WHERE id=1').first()).precio, 123456, 'No sobrescribe cambios en desarrollo');
  console.log('OK: catálogo dev reproducible, sin duplicados, sin reservas/clientes y sin sobrescribir datos existentes.');
} finally { await mf.dispose(); }
