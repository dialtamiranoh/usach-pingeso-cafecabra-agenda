# Pruebas compartidas en desarrollo

URL: https://usach-pingeso-cafecabra-agenda-dev.diego-altamirano-h.workers.dev/

Un push a `dev` valida tipos, compila, aplica las migraciones de D1 de desarrollo, ejecuta `backend/seeds/catalogo-dev.sql` y despliega el Worker de desarrollo. Usa los secretos de GitHub existentes. La carga y la inscripción gratuita no se habilitan en producción.

La carga incluye tres cursos y una cata ficticia, con fotos, docentes, fechas y modalidad. Es una instantánea del contenido público preparado en local: no exporta la base SQLite, reservas, clientes ni autenticación. Inserta datos faltantes sin sobrescribir registros ya existentes. Los IDs se resuelven en D1 de desarrollo y pueden diferir de los locales.

La Master Class ofrece fechas independientes. El intensivo incluye dos jornadas conjuntas. El curso personalizado sigue en borrador con horario pendiente y se puede previsualizar en desarrollo.

Para probar: abrir la cata de ejemplo, elegir fecha y horario, completar datos ficticios, revisar y confirmar. La inscripción queda en `reservas` de `cafe-cabra-agenda-db-dev`, con estado `CONFIRMADO`, y descuenta un cupo. Los eventos no solicitan preferencias ni alergias. No se envían correos. Los cursos de pago todavía permiten revisar el formulario pero no guardan reservas.

Para consultar los registros, en el panel de Cloudflare abrir D1 → `cafe-cabra-agenda-db-dev` → consola y ejecutar:

```sql
SELECT r.id, e.nombre AS evento, r.reservado_por_nombre, r.estado, r.creado_en
FROM reservas r JOIN eventos e ON e.id=r.evento_id
ORDER BY r.id DESC;
```

`node scripts/check-dev-seed.mjs` comprueba la carga en una base temporal. No elimina pruebas remotas automáticamente; las inscripciones de prueba consumen cupos de desarrollo.
