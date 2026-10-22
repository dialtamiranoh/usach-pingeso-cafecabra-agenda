-- Solo el intensivo se dicta en dos jornadas obligatorias.
-- Las fechas de los demás cursos son alternativas independientes por defecto.
INSERT INTO configuracion (clave, valor)
SELECT 'evento:' || id || ':modalidad_fechas', 'CONJUNTAS'
FROM eventos e
WHERE TRIM(e.nombre) IN ('Curso Barista Integral Intensivo', 'Curso Barista Integral Intensivo con Nicolás Lazo')
AND NOT EXISTS (SELECT 1 FROM configuracion c WHERE c.clave='evento:' || e.id || ':modalidad_fechas');
