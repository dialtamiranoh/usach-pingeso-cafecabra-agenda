import assert from 'node:assert/strict';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const server = await createServer({ configFile: 'frontend/vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
try {
  const { toCatalogItem } = await server.ssrLoadModule('/frontend/src/features/catalog/catalog-data.ts');
  const { AvailabilityPage } = await server.ssrLoadModule('/frontend/src/pages/AvailabilityPage.tsx');
  const { events } = await (await fetch('http://localhost:5173/api/catalogo')).json();
  const master = toCatalogItem(events.find(event => event.title.includes('Máster Class')));
  const barista = toCatalogItem(events.find(event => event.title.includes('Barista Integral')));
  assert.equal(master.dateMode, 'INDEPENDIENTES');
  assert.equal(master.sessions.length, 2);
  const render = (course, session) => renderToStaticMarkup(React.createElement(MemoryRouter, {
    initialEntries: [`/cursos/${course.id}/agenda${session ? `?sesion=${session.id}` : ''}`],
  }, React.createElement(AvailabilityPage, { course })));
  for (const session of master.sessions) {
    assert.equal(session.days.length, 1);
    const markup = render(master, session);
    assert.equal((markup.match(/class="calendar-day available selected /g) ?? []).length, 1);
    const summary = markup.slice(markup.indexOf('<aside'));
    assert.ok(summary.includes(session.date.endsWith('-14') ? '14 de noviembre' : '21 de noviembre'));
    assert.ok(!summary.includes(session.date.endsWith('-14') ? '21 de noviembre' : '14 de noviembre'));
    assert.ok(summary.includes(`${session.startTime} – ${session.endTime}`));
  }
  assert.equal(barista.dateMode, 'CONJUNTAS');
  assert.equal(barista.sessions.length, 1);
  assert.equal(barista.sessions[0].days.length, 2);
  assert.equal((render(barista, barista.sessions[0]).match(/class="calendar-day available selected /g) ?? []).length, 2);
  const initial = render(master).slice(render(master).indexOf('<aside'));
  assert.ok(initial.includes('Selecciona una fecha'));
  assert.ok(!initial.includes('14 de noviembre'));
  console.log('OK: Master Class con fechas independientes; Barista con jornadas conjuntas; resumen solo de la selección.');
} finally { await server.close(); }
