import assert from 'node:assert/strict';

// Prueba de lectura contra los cursos de ejemplo; requiere npm run dev.
const base = process.env.CATALOG_TEST_URL ?? 'http://localhost:5173';
const get = async path => {
  const response = await fetch(`${base}${path}`);
  assert.equal(response.status, 200, path);
  return response.json();
};
const publicCatalog = await get('/api/catalogo');
const all = publicCatalog;
assert.equal(all.events.length, 4, 'La carga contiene tres cursos y un evento');
assert.equal(publicCatalog.events.length, 4, 'El inicio local muestra cursos y eventos');

assert.ok(publicCatalog.events.every(event => event.image?.startsWith('https://images.unsplash.com/')));
assert.equal((await fetch(`${base}/api/eventos`)).status, 404);

const barista = publicCatalog.events.find(event => event.title.includes('Barista Integral'));
assert.ok(barista);
assert.equal(barista.price, 220000);
assert.equal(barista.capacity, 4);
assert.equal(barista.remainingSeats, 4);
assert.equal(barista.requiresPayment, true);
assert.deepEqual(barista.dates.map(day => [day.date, day.schedule]), [
  ['2026-11-07', '09:00-15:30'], ['2026-11-08', '09:00-15:30'],
]);
assert.deepEqual(barista.instructors, ['Nicolás Lazo']);
assert.ok(all.events.every(event => !('email' in event) && !('creadoPor' in event)));
console.log('OK: proxy frontend → API → D1 local; catálogo, borradores y jornadas verificados.');

const tasting = all.events.find(event => event.type === 'Evento');
assert.ok(tasting);
assert.equal(tasting.requiresPayment, false);
assert.equal(tasting.price, 0);
assert.equal(tasting.capacity, 12);
assert.equal(tasting.dates[0].date, '2026-11-28');
assert.equal(tasting.dates[0].schedule, '16:00-18:00');
