-- Catálogo de demostración para D1 de DESARROLLO. Nunca ejecutar en producción.

-- Solo contenido público: no incluye reservas, clientes, autenticación ni secretos.

-- Inserta lo que falta; no borra ni sobrescribe registros existentes.

INSERT INTO tipo_evento (nombre,requiere_pago) SELECT 'Curso',1 WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre='Curso' AND requiere_pago=1);
--> statement-breakpoint
INSERT INTO ubicaciones (nombre) SELECT 'Café Cabra' WHERE NOT EXISTS (SELECT 1 FROM ubicaciones WHERE nombre='Café Cabra');
--> statement-breakpoint
INSERT INTO eventos (tipo_evento_id,ubicacion_id,nombre,descripcion,precio,cupo_maximo,controla_cupo,incluye_certificado,incluye,estado) SELECT (SELECT MIN(id) FROM tipo_evento WHERE nombre='Curso' AND requiere_pago=1),(SELECT MIN(id) FROM ubicaciones WHERE nombre='Café Cabra'),'Máster Class de Latte Art','Perfecciona tu técnica y lleva tus vertidos al siguiente nivel.

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

No se trata solo de dibujar sobre el café. Se trata de entender la leche, dominar el vertido y transformar la técnica en una experiencia visual.',65000,4,1,0,'Todos los materiales necesarios para la experiencia.','ABIERTO' WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco'));
--> statement-breakpoint
INSERT INTO instructores(nombre) SELECT 'Diego Moresco' WHERE NOT EXISTS (SELECT 1 FROM instructores WHERE nombre='Diego Moresco');
--> statement-breakpoint
INSERT INTO evento_instructores(evento_id,instructor_id) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')),(SELECT MIN(id) FROM instructores WHERE nombre='Diego Moresco') WHERE NOT EXISTS (SELECT 1 FROM evento_instructores WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')) AND instructor_id=(SELECT MIN(id) FROM instructores WHERE nombre='Diego Moresco'));
--> statement-breakpoint
INSERT INTO fechas(evento_id,fecha,horario) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')),'2026-11-14','10:00-12:00' WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')) AND fecha='2026-11-14');
--> statement-breakpoint
INSERT INTO fechas(evento_id,fecha,horario) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')),'2026-11-21','09:00-11:00' WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')) AND fecha='2026-11-21');
--> statement-breakpoint
INSERT INTO evento_media(evento_id,url,tipo,orden,es_principal) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')),'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1000&q=85','IMAGEN',0,1 WHERE NOT EXISTS (SELECT 1 FROM evento_media WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')) AND tipo='IMAGEN');
--> statement-breakpoint
INSERT INTO configuracion(clave,valor) SELECT 'evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')) || ':modalidad_fechas','INDEPENDIENTES' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Máster Class de Latte Art','Máster Class de Latte Art con Diego Moresco')) || ':modalidad_fechas');
--> statement-breakpoint
INSERT INTO tipo_evento (nombre,requiere_pago) SELECT 'Curso',1 WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre='Curso' AND requiere_pago=1);
--> statement-breakpoint
INSERT INTO ubicaciones (nombre) SELECT 'Café Cabra' WHERE NOT EXISTS (SELECT 1 FROM ubicaciones WHERE nombre='Café Cabra');
--> statement-breakpoint
INSERT INTO eventos (tipo_evento_id,ubicacion_id,nombre,descripcion,precio,cupo_maximo,controla_cupo,incluye_certificado,incluye,estado) SELECT (SELECT MIN(id) FROM tipo_evento WHERE nombre='Curso' AND requiere_pago=1),(SELECT MIN(id) FROM ubicaciones WHERE nombre='Café Cabra'),'Curso Barista Integral Intensivo','Aprende, practica y comprende el café desde el grano hasta la taza.

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
Una sola inscripción incluye las jornadas del 7 y 8 de noviembre de 2026.',220000,4,1,1,'Todos los materiales para las prácticas; coffee break; merch; formación teórica y práctica; acompañamiento personalizado; certificado de participación.','ABIERTO' WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo'));
--> statement-breakpoint
INSERT INTO instructores(nombre) SELECT 'Nicolás Lazo' WHERE NOT EXISTS (SELECT 1 FROM instructores WHERE nombre='Nicolás Lazo');
--> statement-breakpoint
INSERT INTO evento_instructores(evento_id,instructor_id) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')),(SELECT MIN(id) FROM instructores WHERE nombre='Nicolás Lazo') WHERE NOT EXISTS (SELECT 1 FROM evento_instructores WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')) AND instructor_id=(SELECT MIN(id) FROM instructores WHERE nombre='Nicolás Lazo'));
--> statement-breakpoint
INSERT INTO fechas(evento_id,fecha,horario) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')),'2026-11-07','09:00-15:30' WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')) AND fecha='2026-11-07');
--> statement-breakpoint
INSERT INTO fechas(evento_id,fecha,horario) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')),'2026-11-08','09:00-15:30' WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')) AND fecha='2026-11-08');
--> statement-breakpoint
INSERT INTO evento_media(evento_id,url,tipo,orden,es_principal) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')),'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85','IMAGEN',0,1 WHERE NOT EXISTS (SELECT 1 FROM evento_media WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')) AND tipo='IMAGEN');
--> statement-breakpoint
INSERT INTO configuracion(clave,valor) SELECT 'evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')) || ':modalidad_fechas','CONJUNTAS' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso Barista Integral Intensivo','Curso Barista Integral Intensivo con Nicolás Lazo')) || ':modalidad_fechas');
--> statement-breakpoint
INSERT INTO tipo_evento (nombre,requiere_pago) SELECT 'Curso',1 WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre='Curso' AND requiere_pago=1);
--> statement-breakpoint
INSERT INTO ubicaciones (nombre) SELECT 'Café Cabra' WHERE NOT EXISTS (SELECT 1 FROM ubicaciones WHERE nombre='Café Cabra');
--> statement-breakpoint
INSERT INTO eventos (tipo_evento_id,ubicacion_id,nombre,descripcion,precio,cupo_maximo,controla_cupo,incluye_certificado,incluye,estado) SELECT (SELECT MIN(id) FROM tipo_evento WHERE nombre='Curso' AND requiere_pago=1),(SELECT MIN(id) FROM ubicaciones WHERE nombre='Café Cabra'),'Curso de Latte Art Personalizado','Domina la técnica detrás de cada diseño.

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
No se trata solo de mirar cómo se hace. Se trata de practicar, entender la técnica y salir preparado para hacerlo por ti mismo.',150000,4,1,1,'Todos los materiales necesarios; coffee break; merch Café Cabra; certificado de participación.','BORRADOR' WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco'));
--> statement-breakpoint
INSERT INTO instructores(nombre) SELECT 'Diego Moresco' WHERE NOT EXISTS (SELECT 1 FROM instructores WHERE nombre='Diego Moresco');
--> statement-breakpoint
INSERT INTO evento_instructores(evento_id,instructor_id) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')),(SELECT MIN(id) FROM instructores WHERE nombre='Diego Moresco') WHERE NOT EXISTS (SELECT 1 FROM evento_instructores WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')) AND instructor_id=(SELECT MIN(id) FROM instructores WHERE nombre='Diego Moresco'));
--> statement-breakpoint
INSERT INTO fechas(evento_id,fecha,horario) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')),'2026-11-21',NULL WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')) AND fecha='2026-11-21');
--> statement-breakpoint
INSERT INTO evento_media(evento_id,url,tipo,orden,es_principal) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')),'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=1000&q=85','IMAGEN',0,1 WHERE NOT EXISTS (SELECT 1 FROM evento_media WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')) AND tipo='IMAGEN');
--> statement-breakpoint
INSERT INTO configuracion(clave,valor) SELECT 'evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')) || ':modalidad_fechas','INDEPENDIENTES' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Curso de Latte Art Personalizado','Curso de Latte Art Personalizado con Diego Moresco')) || ':modalidad_fechas');
--> statement-breakpoint
INSERT INTO tipo_evento (nombre,requiere_pago) SELECT 'Evento',0 WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre='Evento' AND requiere_pago=0);
--> statement-breakpoint
INSERT INTO ubicaciones (nombre) SELECT 'Café Cabra' WHERE NOT EXISTS (SELECT 1 FROM ubicaciones WHERE nombre='Café Cabra');
--> statement-breakpoint
INSERT INTO eventos (tipo_evento_id,ubicacion_id,nombre,descripcion,precio,cupo_maximo,controla_cupo,incluye_certificado,incluye,estado) SELECT (SELECT MIN(id) FROM tipo_evento WHERE nombre='Evento' AND requiere_pago=0),(SELECT MIN(id) FROM ubicaciones WHERE nombre='Café Cabra'),'Cata de café de especialidad · Evento de ejemplo','Comparte una experiencia para descubrir aromas y sabores del café de especialidad.

Actividad ficticia para probar el catálogo y la inscripción de eventos; no corresponde a una actividad real anunciada por Café Cabra.

Durante la experiencia exploraremos:
• Reconocimiento de aromas y sabores.
• Comparación de distintos perfiles de café.
• Degustación y conversación en grupo.

Fecha, horario y cupos son datos de prueba. Anfitrión por confirmar.',0,12,1,0,'Degustación de café y materiales para la actividad de ejemplo.','ABIERTO' WHERE NOT EXISTS (SELECT 1 FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo'));
--> statement-breakpoint
INSERT INTO fechas(evento_id,fecha,horario) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo')),'2026-11-28','16:00-18:00' WHERE NOT EXISTS (SELECT 1 FROM fechas WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo')) AND fecha='2026-11-28');
--> statement-breakpoint
INSERT INTO evento_media(evento_id,url,tipo,orden,es_principal) SELECT (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo')),'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1000&q=85','IMAGEN',0,1 WHERE NOT EXISTS (SELECT 1 FROM evento_media WHERE evento_id=(SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo')) AND tipo='IMAGEN');
--> statement-breakpoint
INSERT INTO configuracion(clave,valor) SELECT 'evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo')) || ':modalidad_fechas','INDEPENDIENTES' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='evento:' || (SELECT MIN(id) FROM eventos WHERE TRIM(nombre) IN ('Cata de café de especialidad · Evento de ejemplo')) || ':modalidad_fechas');

--> statement-breakpoint
-- Marcador de entorno: permite validar desde /api/health que dev pega a la base de dev.
INSERT INTO configuracion (clave,valor) SELECT 'entorno','DEV' WHERE NOT EXISTS (SELECT 1 FROM configuracion WHERE clave='entorno');