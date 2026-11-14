-- Tipo de evento Cata (RF-02, RN-01 y RN-02). Según los requisitos un evento es un curso
-- o una cata, sin embargo, ninguna migración creaba los tipos de evento y en los datos
-- solo existían Curso y Evento, por lo que no se podía crear una cata desde el panel y el
-- contador de catas activas de /api/admin/panel siempre quedaba en 0. Según RN-02 la cata
-- puede tener precio, sin embargo, no exige el pago antes de inscribirse para mantener el
-- cupo, es por esto que se registra con requiere_pago en 0, campo que indica si el tipo
-- exige pago previo. La inserción es idempotente, de modo que no duplica el tipo en una
-- base donde ya exista.
INSERT INTO tipo_evento (nombre, requiere_pago)
SELECT 'Cata', 0
WHERE NOT EXISTS (SELECT 1 FROM tipo_evento WHERE nombre = 'Cata');
