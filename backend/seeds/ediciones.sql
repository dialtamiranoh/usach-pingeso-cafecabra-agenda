-- Inicialización idempotente de fechas antiguas o de los seeds de demostración.
-- La configuración antigua solo se utiliza para agrupar esas fechas iniciales.
INSERT OR IGNORE INTO ediciones (id, evento_id, cupo_maximo)
SELECT CASE WHEN COALESCE(c.valor,'INDEPENDIENTES')='CONJUNTAS'
  THEN 'evento-' || e.id ELSE 'fecha-' || f.id END, e.id, e.cupo_maximo
FROM fechas f JOIN eventos e ON e.id=f.evento_id
LEFT JOIN configuracion c ON c.clave='evento:' || e.id || ':modalidad_fechas'
WHERE f.edicion_id IS NULL;
--> statement-breakpoint
UPDATE fechas SET edicion_id=(
  SELECT d.id FROM ediciones d WHERE d.evento_id=fechas.evento_id AND d.id=
    CASE WHEN COALESCE((SELECT valor FROM configuracion WHERE clave='evento:' || fechas.evento_id || ':modalidad_fechas'),'INDEPENDIENTES')='CONJUNTAS'
      THEN 'evento-' || fechas.evento_id ELSE 'fecha-' || fechas.id END
) WHERE edicion_id IS NULL;
--> statement-breakpoint
-- Solo es posible deducir la edición de una reserva anterior si existe exactamente una.
UPDATE reservas SET edicion_id=(SELECT MIN(d.id) FROM ediciones d WHERE d.evento_id=reservas.evento_id)
WHERE edicion_id IS NULL AND (SELECT COUNT(*) FROM ediciones d WHERE d.evento_id=reservas.evento_id)=1;
