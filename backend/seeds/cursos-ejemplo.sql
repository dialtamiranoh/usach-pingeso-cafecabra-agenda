-- Datos reales proporcionados por el equipo para pruebas LOCALES.
-- Repetir la carga no duplica registros ni modifica datos ya existentes.
-- Noviembre de 2026. No asignar cupos u horarios que aún no están confirmados.

INSERT INTO tipo_evento (nombre, requiere_pago)
SELECT 'Curso', 1
WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre = 'Curso' AND requiere_pago = 1);

INSERT INTO ubicaciones (nombre)
SELECT 'Café Cabra'
WHERE NOT EXISTS (SELECT 1 FROM ubicaciones WHERE nombre = 'Café Cabra');

INSERT INTO instructores (nombre, bio)
SELECT 'Diego Moresco', 'Barista de competencia y docente especializado en Latte Art.'
WHERE NOT EXISTS (SELECT 1 FROM instructores WHERE nombre = 'Diego Moresco');

INSERT INTO instructores (nombre, bio)
SELECT 'Nicolás Lazo', 'Fundador de Café Cabra. Docente del curso de Barista Integral Intensivo.'
WHERE NOT EXISTS (SELECT 1 FROM instructores WHERE nombre = 'Nicolás Lazo');

-- No se declara sin límite la Master Class: permanece BORRADOR hasta conocer
-- el cupo máximo y el horario. NULL no debe mostrarse como cupo ilimitado sin confirmar.
INSERT INTO eventos (
  tipo_evento_id, ubicacion_id, nombre, descripcion, precio,
  cupo_maximo, controla_cupo, incluye_certificado, incluye, estado
)
SELECT
  (SELECT MIN(id) FROM tipo_evento WHERE nombre = 'Curso' AND requiere_pago = 1),
  (SELECT MIN(id) FROM ubicaciones WHERE nombre = 'Café Cabra'),
  'Máster Class de Latte Art con Diego Moresco',
  'Perfecciona tu técnica y lleva tus vertidos al siguiente nivel.

Una experiencia 100% práctica, diseñada para quienes buscan mejorar su técnica de Latte Art y conseguir mayor precisión y control en cada taza.

Durante la Master Class trabajaremos en:
• Texturización: control y preparación de una microespuma adecuada para Latte Art.
• Técnica de vertido: posición, altura, velocidad y control de la leche.
• Diseños esenciales: perfeccionamiento de tulipán y roseta.
• Diseños de autor: demostración de técnicas y creaciones realizadas por Diego Moresco, barista y experimentado formador en Latte Art.

Una instancia pensada para aprender, practicar y perfeccionar, con acompañamiento durante todo el proceso.
Duración: 3 horas y 30 minutos.
Modalidad: presencial en Café Cabra.
Horario y cupos: por confirmar.
Certificado: por confirmar.

No se trata solo de dibujar sobre el café. Se trata de entender la leche, dominar el vertido y transformar la técnica en una experiencia visual.',
  65000, NULL, 1, 0, 'Todos los materiales necesarios para la experiencia.', 'BORRADOR'
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art con Diego Moresco', 'Máster Class de Latte Art'));

INSERT INTO eventos (
  tipo_evento_id, ubicacion_id, nombre, descripcion, precio,
  cupo_maximo, controla_cupo, incluye_certificado, incluye, estado
)
SELECT
  (SELECT MIN(id) FROM tipo_evento WHERE nombre = 'Curso' AND requiere_pago = 1),
  (SELECT MIN(id) FROM ubicaciones WHERE nombre = 'Café Cabra'),
  'Curso Barista Integral Intensivo con Nicolás Lazo',
  'Aprende, practica y comprende el café desde el grano hasta la taza.

Un curso de dos días, diseñado para quienes buscan adquirir o fortalecer sus conocimientos como baristas a través de una combinación de formación teórica y práctica.
Con solo 4 cupos, trabajamos en un formato personalizado y cercano, dedicando tiempo a las dudas, práctica y necesidades de cada participante.

Durante el curso abordaremos:
• Introducción al café de especialidad: historia, origen y principales conceptos.
• Calibración de espresso: variables de extracción, ajuste y búsqueda de una taza equilibrada.
• Texturización de leche: técnica y control para obtener una microespuma adecuada.
• Introducción al tueste: principios, procesos y su influencia en el café.
• Análisis sensorial: aromas, sabores, acidez, cuerpo y atributos del café.
• Métodos de filtrado: fundamentos, variables de preparación y calibración.

Todo el contenido se desarrolla desde una perspectiva práctica y aplicada.
Docente: Nicolás Lazo, fundador de Café Cabra.
Duración: 2 días, sábado y domingo de 09:00 a 15:30.
Modalidad: presencial en Café Cabra.
Una sola inscripción incluye las jornadas del 7 y 8 de noviembre de 2026.',
  220000, 4, 1, 1,
  'Todos los materiales para las prácticas; coffee break; merch; formación teórica y práctica; acompañamiento personalizado; certificado de participación.',
  'ABIERTO'
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo con Nicolás Lazo', 'Curso Barista Integral Intensivo'));

INSERT INTO eventos (
  tipo_evento_id, ubicacion_id, nombre, descripcion, precio,
  cupo_maximo, controla_cupo, incluye_certificado, incluye, estado
)
SELECT
  (SELECT MIN(id) FROM tipo_evento WHERE nombre = 'Curso' AND requiere_pago = 1),
  (SELECT MIN(id) FROM ubicaciones WHERE nombre = 'Café Cabra'),
  'Curso de Latte Art Personalizado con Diego Moresco',
  'Domina la técnica detrás de cada diseño.

Junto al barista de competencia y docente Diego Moresco, una experiencia de aprendizaje teórica y práctica para comprender y perfeccionar el arte del Latte Art.
Con solo 4 cupos, trabajaremos en un formato altamente personalizado, con práctica constante y correcciones en tiempo real.

Durante el curso trabajaremos:
• Técnicas de texturización.
• Control y técnica de vertido.
• Tulipán y Rosetta.
• Diseño y composición.
• Variables clave para mejorar tu Latte Art.

Ya seas barista o amante del café, aprenderás a comprender el comportamiento de la leche, dominar el vertido y desarrollar mayor precisión en tus diseños.
Todo acompañado de práctica real, correcciones personalizadas y orientación técnica durante cada etapa.
Modalidad: presencial en Café Cabra.
Horario y duración: por confirmar.

No necesitas traer nada. Nosotros nos encargamos de todo.
No se trata solo de mirar cómo se hace. Se trata de practicar, entender la técnica y salir preparado para hacerlo por ti mismo.',
  150000, 4, 1, 1,
  'Todos los materiales necesarios; coffee break; merch Café Cabra; certificado de participación.', 'BORRADOR'
WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado con Diego Moresco', 'Curso de Latte Art Personalizado'));

INSERT INTO evento_instructores (evento_id, instructor_id)
SELECT e.id, i.id FROM eventos e JOIN instructores i ON i.id = (SELECT MIN(id) FROM instructores WHERE nombre = 'Diego Moresco')
WHERE e.nombre IN ('Máster Class de Latte Art con Diego Moresco', 'Curso de Latte Art Personalizado con Diego Moresco')
AND NOT EXISTS (SELECT 1 FROM evento_instructores x WHERE x.evento_id = e.id AND x.instructor_id = i.id);

INSERT INTO evento_instructores (evento_id, instructor_id)
SELECT e.id, i.id FROM eventos e JOIN instructores i ON i.id = (SELECT MIN(id) FROM instructores WHERE nombre = 'Nicolás Lazo')
WHERE e.nombre = 'Curso Barista Integral Intensivo con Nicolás Lazo'
AND NOT EXISTS (SELECT 1 FROM evento_instructores x WHERE x.evento_id = e.id AND x.instructor_id = i.id);

INSERT INTO fechas (evento_id, fecha, horario)
SELECT id, '2026-11-14', NULL FROM eventos e WHERE nombre = 'Máster Class de Latte Art con Diego Moresco'
AND NOT EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id = e.id AND f.fecha = '2026-11-14');

INSERT INTO fechas (evento_id, fecha, horario)
SELECT id, '2026-11-07', '09:00-15:30' FROM eventos e WHERE nombre = 'Curso Barista Integral Intensivo con Nicolás Lazo'
AND NOT EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id = e.id AND f.fecha = '2026-11-07');

INSERT INTO fechas (evento_id, fecha, horario)
SELECT id, '2026-11-08', '09:00-15:30' FROM eventos e WHERE nombre = 'Curso Barista Integral Intensivo con Nicolás Lazo'
AND NOT EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id = e.id AND f.fecha = '2026-11-08');

INSERT INTO fechas (evento_id, fecha, horario)
SELECT id, '2026-11-21', NULL FROM eventos e WHERE nombre = 'Curso de Latte Art Personalizado con Diego Moresco'
AND NOT EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id = e.id AND f.fecha = '2026-11-21');

-- Fotos provisionales que ya se utilizaban en las tarjetas del frontend.
-- No reemplazan fotos oficiales cargadas posteriormente por el equipo.
INSERT INTO evento_media (evento_id, url, tipo, orden, es_principal)
SELECT e.id,
  CASE WHEN e.nombre = 'Curso Barista Integral Intensivo con Nicolás Lazo'
    THEN 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85'
    ELSE 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1000&q=85'
  END, 'IMAGEN', 0, 1
FROM eventos e
WHERE e.nombre IN ('Máster Class de Latte Art con Diego Moresco',
  'Curso Barista Integral Intensivo con Nicolás Lazo',
  'Curso de Latte Art Personalizado con Diego Moresco')
AND NOT EXISTS (SELECT 1 FROM evento_media m WHERE m.evento_id=e.id AND m.tipo='IMAGEN');

