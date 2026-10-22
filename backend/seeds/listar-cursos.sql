SELECT e.id, e.nombre, t.nombre AS tipo, e.precio AS precio_clp,
       e.estado, e.cupo_maximo, e.incluye_certificado,
       u.nombre AS lugar, i.nombre AS docente, f.fecha,
       COALESCE(f.horario, 'Por confirmar') AS horario
FROM eventos e
JOIN tipo_evento t ON t.id = e.tipo_evento_id
JOIN ubicaciones u ON u.id = e.ubicacion_id
LEFT JOIN evento_instructores ei ON ei.evento_id = e.id
LEFT JOIN instructores i ON i.id = ei.instructor_id
LEFT JOIN fechas f ON f.evento_id = e.id
ORDER BY e.id, f.fecha;

PRAGMA foreign_key_check;
