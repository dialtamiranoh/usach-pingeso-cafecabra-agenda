import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { AppBindings } from '../config/bindings';

export const enrollmentRoutes = new Hono<{ Bindings: AppBindings }>();
enrollmentRoutes.use('/inscripciones', bodyLimit({ maxSize: 12000, onError: c => c.json({ error: 'El formulario es demasiado extenso.' }, 413) }));
enrollmentRoutes.post('/inscripciones', async c => {
  // Primera integración de prueba: eventos gratuitos en local y desarrollo.
  if (!['local', 'staging'].includes(c.env.APP_ENV)) return c.json({ error: 'Ruta no encontrada' }, 404);
  if (!c.req.header('content-type')?.includes('application/json')) return c.json({ error: 'Formato de solicitud inválido.' }, 415);
  let input: Record<string, unknown>;
  try {
    const body = await c.req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    input = body;
  } catch { return c.json({ error: 'El formulario no es válido.' }, 400); }
  const limits: Record<string, number> = { eventId: 15, requestId: 36, name: 120, email: 254, phone: 25, instagram: 31, dietaryPreference: 20, dietaryOther: 300, allergyStatus: 20, allergyDetails: 500, notes: 1000 };
  const data: Record<string, string> = {};
  for (const [field, max] of Object.entries(limits)) {
    if (typeof input[field] !== 'string' || input[field].length > max) return c.json({ error: 'Revisa los campos del formulario.' }, 400);
    data[field] = input[field].trim();
  }
  const { eventId, requestId, name, phone, instagram, dietaryPreference, dietaryOther, allergyStatus, allergyDetails, notes } = data;
  const email = data.email.toLowerCase();
  if (!/^[1-9]\d*$/.test(eventId) || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId) ||
      name.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[+\d\s().-]+$/.test(phone) || phone.replace(/\D/g, '').length < 9 || phone.replace(/\D/g, '').length > 15 ||
      (instagram && !/^@?[a-zA-Z0-9._]{1,30}$/.test(instagram)) || !['', 'none', 'vegan', 'vegetarian', 'other'].includes(dietaryPreference) ||
      (dietaryPreference === 'other' && !dietaryOther) || !['', 'no', 'yes', 'undisclosed'].includes(allergyStatus) || (allergyStatus === 'yes' && !allergyDetails) || input.confirmed !== true) {
    return c.json({ error: 'Revisa tus datos y confirma que son correctos.' }, 400);
  }
  const db = c.env.cafe_cabra_agenda_db;
  const code = `CC-${requestId.toUpperCase()}`;
  const existing = await db.prepare('SELECT evento_id, reservado_por_correo, estado FROM reservas WHERE codigo=?').bind(code).first<{ evento_id: number; reservado_por_correo: string; estado: string }>();
  if (existing) {
    if (String(existing.evento_id) !== eventId || existing.reservado_por_correo !== email || existing.estado !== 'CONFIRMADO') return c.json({ error: 'La solicitud ya fue utilizada.' }, 409);
    return c.json({ code, status: 'CONFIRMADO', eventId });
  }
  // INSERT ... SELECT valida estado, cupos y duplicados dentro de una sola escritura.
  // Las columnas adicionales pendientes de modelar se conservan en observaciones,
  // como JSON versionado, sin alterar el esquema acordado por el equipo.
  const eventType = await db.prepare('SELECT t.nombre FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id WHERE e.id=?').bind(Number(eventId)).first<{ nombre: string }>();
  const details = JSON.stringify({ version: 1, notes, instagram: instagram.replace(/^@/, ''),
    ...(eventType?.nombre === 'Curso' ? { dietaryPreference, dietaryOther: dietaryPreference === 'other' ? dietaryOther : '', allergyStatus, allergyDetails: allergyStatus === 'yes' ? allergyDetails : '' } : {}),
  });
  const result = await db.prepare(`
    INSERT OR IGNORE INTO reservas (evento_id, codigo, reservado_por_nombre, reservado_por_correo,
      reservado_por_telefono, reservado_para_nombre, observaciones, estado, origen_confirmacion, confirmado_en)
    SELECT e.id, ?, ?, ?, ?, ?, ?, 'CONFIRMADO', 'SISTEMA', unixepoch()
    FROM eventos e JOIN tipo_evento t ON t.id=e.tipo_evento_id JOIN ubicaciones u ON u.id=e.ubicacion_id
    WHERE e.id=? AND e.estado='ABIERTO' AND t.requiere_pago=0 AND e.precio=0 AND t.activo=1 AND u.activo=1
      AND (e.cierre_inscripcion_en IS NULL OR e.cierre_inscripcion_en>unixepoch())
      AND EXISTS (SELECT 1 FROM fechas f WHERE f.evento_id=e.id)
      AND NOT EXISTS (SELECT 1 FROM reservas r WHERE r.evento_id=e.id
        AND LOWER(TRIM(r.reservado_por_correo))=? AND LOWER(TRIM(r.reservado_para_nombre))=LOWER(?)
        AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))
      AND (e.controla_cupo=0 OR e.cupo_maximo IS NULL OR e.cupo_maximo >
        (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id AND
        (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))))
    RETURNING id
  `).bind(code, name, email, phone, name, details, Number(eventId), email, name).first<{ id: number }>();
  if (!result) {
    const replay = await db.prepare('SELECT id FROM reservas WHERE codigo=? AND evento_id=? AND reservado_por_correo=?').bind(code, Number(eventId), email).first();
    if (replay) return c.json({ code, status: 'CONFIRMADO', eventId });
    return c.json({ error: 'No pudimos inscribirte: el evento no está disponible, no quedan cupos o ya existe una inscripción con tus datos.' }, 409);
  }
  return c.json({ code, status: 'CONFIRMADO', eventId }, 201);
});
