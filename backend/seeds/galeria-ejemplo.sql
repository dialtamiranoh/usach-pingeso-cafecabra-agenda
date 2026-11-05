-- Fotos provisionales conocidas para probar el carrusel únicamente en local.
-- Conserva la imagen principal y no duplica URLs existentes.
INSERT INTO evento_media (evento_id, url, tipo, orden, es_principal)
SELECT e.id, fotos.url, 'IMAGEN', fotos.orden, 0
FROM eventos e CROSS JOIN (
  SELECT 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1000&q=85' AS url, 1 AS orden
  UNION ALL SELECT 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85', 2
  UNION ALL SELECT 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=85', 3
) fotos
WHERE TRIM(e.nombre) IN (
  'Máster Class de Latte Art', 'Máster Class de Latte Art con Diego Moresco',
  'Curso Barista Integral Intensivo', 'Curso Barista Integral Intensivo con Nicolás Lazo',
  'Curso de Latte Art Personalizado', 'Curso de Latte Art Personalizado con Diego Moresco',
  'Cata de café de especialidad · Evento de ejemplo'
)
AND NOT EXISTS (SELECT 1 FROM evento_media m WHERE m.evento_id=e.id AND m.url=fotos.url AND m.tipo='IMAGEN');
