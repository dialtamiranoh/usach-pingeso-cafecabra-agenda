-- Evento ficticio para distinguir actividades de los cursos en el catálogo local.
INSERT INTO tipo_evento (nombre, requiere_pago)
SELECT 'Evento', 0
WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre='Evento' AND requiere_pago=0);

INSERT INTO eventos (tipo_evento_id, ubicacion_id, nombre, descripcion, precio,
  cupo_maximo, controla_cupo, incluye_certificado, incluye, estado)
SELECT (SELECT MIN(id) FROM tipo_evento WHERE nombre='Evento' AND requiere_pago=0),
  (SELECT MIN(id) FROM ubicaciones WHERE nombre='Café Cabra'),
  'Cata de café de especialidad · Evento de ejemplo',
  'Comparte una experiencia para descubrir aromas y sabores del café de especialidad.

Actividad ficticia para probar el catálogo y la inscripción de eventos; no corresponde a una actividad real anunciada por Café Cabra.

Durante la experiencia exploraremos:
• Reconocimiento de aromas y sabores.
• Comparación de distintos perfiles de café.
• Degustación y conversación en grupo.

Fecha, horario y cupos son datos de prueba. Anfitrión por confirmar.',
  0, 12, 1, 0, 'Degustación de café y materiales para la actividad de ejemplo.', 'ABIERTO'
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE nombre='Cata de café de especialidad · Evento de ejemplo');

INSERT INTO fechas (evento_id, fecha, horario)
SELECT id, '2026-11-28', '16:00-18:00' FROM eventos e
WHERE e.nombre='Cata de café de especialidad · Evento de ejemplo'
AND NOT EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id=e.id AND f.fecha='2026-11-28');

INSERT INTO evento_media (evento_id, url, tipo, orden, es_principal)
SELECT id, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85', 'IMAGEN', 0, 1
FROM eventos e WHERE e.nombre='Cata de café de especialidad · Evento de ejemplo'
AND NOT EXISTS (SELECT 1 FROM evento_media m WHERE m.evento_id=e.id AND m.tipo='IMAGEN');
