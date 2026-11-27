import { Hono, type Context } from 'hono';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { BatchItem } from 'drizzle-orm/batch';
import type { AppBindings } from '../config/bindings';
import { createDb } from '../db';
import { createAuth } from '../auth';
import {
  eventos,
  tipoEvento,
  ubicaciones,
  instructores,
  opcionesAlimentarias,
  eventoInstructores,
  eventoOpcionesAlimentarias,
  ediciones,
  fechas,
  eventoMedia,
  bibliotecaImagenes,
} from '../db/schema';

// Gestión de cursos y catas desde el panel de administración, épica E1:
// SCRUM-22 y SCRUM-23 (RF-01 y RF-02) crean el evento, SCRUM-24 (RF-03) lo edita y
// SCRUM-25 (RF-04) lo cierra de forma manual. El evento se crea en ABIERTO, tal como piden
// los criterios de aceptación de SCRUM-22, o en BORRADOR si el administrador lo elige, y
// desde la edición se puede cambiar entre ambos estados. El cierre cambia solo el estado del
// evento a CERRADO, ya que, las consultas de inscripción exigen que el evento y la edición
// estén en ABIERTO, por lo que no es necesario modificar las ediciones ni las reservas.
// Todas las rutas quedan detrás de la sesión de administrador (RF-06) y cada escritura
// registra al operador que la realizó (RF-34).

type Entorno = { Bindings: AppBindings; Variables: { userId: string } };

export const eventoAdminRoutes = new Hono<Entorno>();
eventoAdminRoutes.onError((error, c) => {
  if (/Imagen no disponible|Hasta tres imagenes/.test(error.message + String(error.cause ?? '')))
    return c.json({ error: 'Las imágenes cambiaron mientras guardabas. Actualiza la selección de la biblioteca.' }, 409);
  console.error('Gestión de eventos:', error.message);
  return c.json({ error: 'No pudimos guardar el evento. Intenta nuevamente.' }, 500);
});

/* ───────── Guard de sesión ───────── */

// Se registra sobre la ruta base y sobre sus subrutas, con el fin de cubrir tanto el
// listado (/admin/eventos) como las operaciones sobre un evento (/admin/eventos/:id).
async function exigirSesion(c: Context<Entorno>, next: () => Promise<void>) {
  let sesion;
  try {
    sesion = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  } catch {
    sesion = null;
  }
  if (!sesion) return c.json({ error: 'No autorizado' }, 401);
  if (!['GET', 'HEAD'].includes(c.req.method)) {
    const origin = c.req.header('origin');
    if (origin && !c.env.BETTER_AUTH_TRUSTED_ORIGINS.split(',').map(value => value.trim()).includes(origin))
      return c.json({ error: 'Origen no autorizado.' }, 403);
  }
  c.set('userId', sesion.user.id);
  await next();
}
eventoAdminRoutes.use('/admin/eventos', exigirSesion);
eventoAdminRoutes.use('/admin/eventos/*', exigirSesion);

// Marca de auditoría común a toda operación manual (RF-34).
function auditoria(c: Context<Entorno>) {
  return { actualizadoPor: c.get('userId'), actualizadoEn: new Date() };
}

/* ───────── Lectura y validación de los datos de entrada ───────── */

// Mismos formatos que valida enrollments.ts al momento de inscribir, de modo que un evento
// creado desde el panel siempre pueda recibir inscripciones.
const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORARIO = /^([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*([01]\d|2[0-3]):[0-5]\d$/;

// Expresión que cuenta los cupos ocupados de una edición, la cual replica la regla de
// services/editions.ts: reservas confirmadas o reservadas sin expirar, incluyendo las
// reservas antiguas sin edición asignada, que se descuentan de cada edición del evento.
const CUPOS_OCUPADOS_SQL = `(SELECT COUNT(*) FROM reservas r WHERE r.evento_id=d.evento_id
  AND (r.edicion_id=d.id OR r.edicion_id IS NULL)
  AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch()))))`;

type JornadaEntrada = { fecha: string; horario: string };
type EdicionEntrada = { id: string | null; cupoMaximo: number | null; jornadas: JornadaEntrada[] };
type EventoEntrada = {
  tipoEventoId: number;
  ubicacionId: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cupoMaximo: number | null;
  controlaCupo: boolean;
  incluyeCertificado: boolean;
  incluye: string | null;
  instructorIds: number[];
  opcionAlimentariaIds: number[];
  ediciones: EdicionEntrada[];
  imagenIds?: string[];
};
// Estados que el administrador puede elegir desde el formulario. El cierre usa su propia ruta.
type EstadoFormulario = 'BORRADOR' | 'ABIERTO';
type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string };

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}
function textoOpcional(valor: unknown): string | null {
  const t = texto(valor);
  return t.length > 0 ? t : null;
}
function enteroPositivo(valor: unknown): number | null {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0 ? valor : null;
}
// Convierte una lista de identificadores en una lista sin repetidos, descartando lo que no
// sea un entero positivo, por lo que una lista mal formada se detecta comparando largos.
function listaDeIds(valor: unknown): number[] | null {
  if (valor === undefined || valor === null) return [];
  if (!Array.isArray(valor)) return null;
  const ids = valor.map(enteroPositivo);
  if (ids.some(id => id === null)) return null;
  return [...new Set(ids as number[])];
}

// Lee el cuerpo enviado por el formulario y valida su forma, sin consultar la base de
// datos. Las reglas que dependen de la base, como la existencia del tipo o del instructor,
// se revisan después en validarContraBase.
function leerEvento(cuerpo: unknown): Resultado<EventoEntrada> {
  const b = (cuerpo ?? {}) as Record<string, unknown>;
  let imagenIds: string[] | undefined;
  if ('imagenIds' in b) {
    if (!Array.isArray(b.imagenIds) || b.imagenIds.length > 3 || b.imagenIds.some(id => typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(id)) || new Set(b.imagenIds).size !== b.imagenIds.length)
      return { ok: false, error: 'Selecciona hasta tres imágenes diferentes de la biblioteca.' };
    imagenIds = b.imagenIds as string[];
  }

  const tipoEventoId = enteroPositivo(b.tipoEventoId);
  if (tipoEventoId === null) return { ok: false, error: 'Se debe seleccionar el tipo de evento.' };
  const ubicacionId = enteroPositivo(b.ubicacionId);
  if (ubicacionId === null) return { ok: false, error: 'Se debe seleccionar la ubicación.' };

  const nombre = texto(b.nombre);
  if (nombre.length < 2) return { ok: false, error: 'El nombre es obligatorio.' };

  const precio = typeof b.precio === 'number' ? b.precio : 0;
  if (!Number.isFinite(precio) || precio < 0) return { ok: false, error: 'El precio no puede ser negativo.' };

  // controlaCupo en false corresponde a un evento de entrada liberada, en el cual el
  // registro es informativo y no descuenta cupo, por lo que el cupo máximo puede quedar
  // vacío, lo que en el esquema significa sin límite (RN-04). Los cursos y las catas sí
  // controlan cupo, y según los criterios de aceptación de SCRUM-22 su cupo máximo es
  // obligatorio y debe ser un número entero positivo.
  const controlaCupo = b.controlaCupo !== false;
  const cupoMaximo = b.cupoMaximo === null || b.cupoMaximo === undefined ? null : enteroPositivo(b.cupoMaximo);
  if (b.cupoMaximo !== null && b.cupoMaximo !== undefined && cupoMaximo === null) {
    return { ok: false, error: 'El cupo máximo debe ser un número entero mayor que cero.' };
  }
  if (controlaCupo && cupoMaximo === null) {
    return { ok: false, error: 'El cupo máximo es obligatorio, solo puede quedar vacío en un evento de entrada liberada.' };
  }

  const instructorIds = listaDeIds(b.instructorIds);
  if (instructorIds === null) return { ok: false, error: 'La lista de instructores no es válida.' };
  const opcionAlimentariaIds = listaDeIds(b.opcionAlimentariaIds);
  if (opcionAlimentariaIds === null) return { ok: false, error: 'La lista de opciones alimentarias no es válida.' };

  // Cada edición es una oportunidad concreta de inscripción con su propio cupo y una o más
  // jornadas (ver docs/ediciones-inscripciones.md). Sin ediciones el evento nunca podría
  // recibir inscritos, es por esto que se exige al menos una.
  if (!Array.isArray(b.ediciones) || b.ediciones.length === 0) {
    return { ok: false, error: 'El evento debe tener al menos una edición con sus jornadas.' };
  }
  const edicionesLeidas: EdicionEntrada[] = [];
  for (const [indice, crudo] of b.ediciones.entries()) {
    const e = (crudo ?? {}) as Record<string, unknown>;
    const numero = indice + 1;
    const id = typeof e.id === 'string' && e.id.trim().length > 0 ? e.id.trim() : null;

    // Si la edición no trae cupo propio, hereda el cupo máximo del evento.
    const cupoEdicion = e.cupoMaximo === null || e.cupoMaximo === undefined ? cupoMaximo : enteroPositivo(e.cupoMaximo);
    if (e.cupoMaximo !== null && e.cupoMaximo !== undefined && cupoEdicion === null) {
      return { ok: false, error: `El cupo de la edición ${numero} debe ser un número entero mayor que cero.` };
    }

    if (!Array.isArray(e.jornadas) || e.jornadas.length === 0) {
      return { ok: false, error: `La edición ${numero} debe tener al menos una jornada.` };
    }
    const jornadas: JornadaEntrada[] = [];
    for (const jornadaCruda of e.jornadas) {
      const j = (jornadaCruda ?? {}) as Record<string, unknown>;
      const fecha = texto(j.fecha);
      const horario = texto(j.horario);
      if (!FORMATO_FECHA.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`))) {
        return { ok: false, error: `La edición ${numero} tiene una fecha inválida, se espera el formato AAAA-MM-DD.` };
      }
      if (!FORMATO_HORARIO.test(horario)) {
        return { ok: false, error: `La edición ${numero} tiene un horario inválido, se espera el formato HH:MM-HH:MM.` };
      }
      const [inicio, termino] = horario.split(/\s*[-–]\s*/);
      if (inicio >= termino) {
        return { ok: false, error: `En la edición ${numero} la hora de inicio debe ser anterior a la hora de término.` };
      }
      jornadas.push({ fecha, horario: `${inicio}-${termino}` });
    }
    edicionesLeidas.push({ id, cupoMaximo: cupoEdicion, jornadas });
  }

  return {
    ok: true,
    datos: {
      tipoEventoId,
      ubicacionId,
      nombre,
      descripcion: textoOpcional(b.descripcion),
      precio,
      cupoMaximo,
      controlaCupo,
      incluyeCertificado: b.incluyeCertificado === true,
      incluye: textoOpcional(b.incluye),
      instructorIds,
      opcionAlimentariaIds,
      ediciones: edicionesLeidas,
      imagenIds,
    },
  };
}

// Revisa contra la base de datos que el tipo, la ubicación, los instructores y las opciones
// alimentarias existan y estén activos, junto a esto se aplica la regla de RF-01, RF-02 y
// RN-02, en la cual el curso exige instructor y la cata no. La regla se basa en el campo
// requiere_pago del tipo de evento y no en su nombre, ya que, en los datos del equipo
// conviven los tipos Curso, Cata y Evento, por lo que comparar nombres dejaría fuera a los
// tipos sin pago previo que no se llamen Cata.
async function validarContraBase(db: ReturnType<typeof createDb>, datos: EventoEntrada): Promise<string | null> {
  if (datos.imagenIds?.length) {
    const images = await db.select({ id: bibliotecaImagenes.id }).from(bibliotecaImagenes)
      .where(and(inArray(bibliotecaImagenes.id, datos.imagenIds), eq(bibliotecaImagenes.estado, 'ACTIVA')));
    if (images.length !== datos.imagenIds.length) return 'Una imagen ya no está disponible en la biblioteca. Actualiza la selección.';
  }
  const tipo = await db.select().from(tipoEvento).where(eq(tipoEvento.id, datos.tipoEventoId)).get();
  if (!tipo || !tipo.activo) return 'El tipo de evento seleccionado no existe o está inactivo.';

  const ubicacion = await db.select().from(ubicaciones).where(eq(ubicaciones.id, datos.ubicacionId)).get();
  if (!ubicacion || !ubicacion.activo) return 'La ubicación seleccionada no existe o está inactiva.';

  if (tipo.requierePago && datos.instructorIds.length === 0) {
    return `Un evento de tipo ${tipo.nombre} debe tener al menos un instructor de referencia.`;
  }
  if (tipo.requierePago && datos.precio <= 0) {
    return `Un evento de tipo ${tipo.nombre} requiere pago, por lo que su precio debe ser mayor que cero.`;
  }
  // Un tipo sin pago previo, como la cata, sí puede tener precio, ya que, según RN-02 la
  // cata se paga, sin embargo, no exige el pago antes de inscribirse para mantener el cupo,
  // por lo que en ese caso el precio puede ser 0 o mayor que 0. Según los criterios de
  // aceptación de SCRUM-23 la cata no genera certificado, regla que se aplica con el mismo
  // criterio a todo tipo de evento que no exige pago previo.
  if (!tipo.requierePago && datos.incluyeCertificado) {
    return `Un evento de tipo ${tipo.nombre} no genera certificado.`;
  }

  if (datos.instructorIds.length > 0) {
    const activos = await db.select({ id: instructores.id }).from(instructores)
      .where(and(inArray(instructores.id, datos.instructorIds), eq(instructores.activo, true)));
    if (activos.length !== datos.instructorIds.length) return 'Uno de los instructores seleccionados no existe o está inactivo.';
  }
  if (datos.opcionAlimentariaIds.length > 0) {
    const activas = await db.select({ id: opcionesAlimentarias.id }).from(opcionesAlimentarias)
      .where(and(inArray(opcionesAlimentarias.id, datos.opcionAlimentariaIds), eq(opcionesAlimentarias.activo, true)));
    if (activas.length !== datos.opcionAlimentariaIds.length) return 'Una de las opciones alimentarias seleccionadas no existe o está inactiva.';
  }
  return null;
}

// Columnas propias de la tabla eventos que se escriben al crear y al editar.
function columnasEvento(datos: EventoEntrada) {
  return {
    tipoEventoId: datos.tipoEventoId,
    ubicacionId: datos.ubicacionId,
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    precio: datos.precio,
    cupoMaximo: datos.cupoMaximo,
    controlaCupo: datos.controlaCupo,
    incluyeCertificado: datos.incluyeCertificado,
    incluye: datos.incluye,
  };
}

/* ───────── Consulta de un evento completo ───────── */

async function cargarEvento(c: Context<Entorno>, id: number) {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const evento = await db.select().from(eventos).where(eq(eventos.id, id)).get();
  if (!evento) return null;

  const [relInstructores, relOpciones, filasEdiciones, filasFechas] = await Promise.all([
    db.select({ id: eventoInstructores.instructorId }).from(eventoInstructores).where(eq(eventoInstructores.eventoId, id)),
    db.select({ id: eventoOpcionesAlimentarias.opcionId }).from(eventoOpcionesAlimentarias).where(eq(eventoOpcionesAlimentarias.eventoId, id)),
    c.env.cafe_cabra_agenda_db.prepare(`SELECT d.id, d.cupo_maximo, d.estado, ${CUPOS_OCUPADOS_SQL} AS ocupados,
        (SELECT COUNT(*) FROM reservas r WHERE r.edicion_id=d.id) AS reservas_asociadas
      FROM ediciones d WHERE d.evento_id=? ORDER BY d.id`).bind(id)
      .all<{ id: string; cupo_maximo: number | null; estado: string; ocupados: number; reservas_asociadas: number }>(),
    db.select().from(fechas).where(eq(fechas.eventoId, id)).orderBy(fechas.fecha, fechas.id),
  ]);

  return {
    id: evento.id,
    tipoEventoId: evento.tipoEventoId,
    ubicacionId: evento.ubicacionId,
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    precio: evento.precio,
    cupoMaximo: evento.cupoMaximo,
    controlaCupo: evento.controlaCupo,
    incluyeCertificado: evento.incluyeCertificado,
    incluye: evento.incluye,
    estado: evento.estado,
    instructorIds: relInstructores.map(r => r.id),
    opcionAlimentariaIds: relOpciones.map(r => r.id),
    imagenes: await db.select({ id: eventoMedia.imagenId, url: eventoMedia.url }).from(eventoMedia)
      .where(and(eq(eventoMedia.eventoId, id), eq(eventoMedia.tipo, 'IMAGEN'))).orderBy(eventoMedia.orden, eventoMedia.id),
    ediciones: filasEdiciones.results.map(d => ({
      id: d.id,
      cupoMaximo: d.cupo_maximo,
      estado: d.estado,
      cuposOcupados: d.ocupados,
      // Una edición con reservas asociadas no se puede eliminar desde el formulario.
      tieneReservas: d.reservas_asociadas > 0,
      jornadas: filasFechas.filter(f => f.edicionId === d.id).map(f => ({ fecha: f.fecha, horario: f.horario })),
    }))
      // Los identificadores de las ediciones nuevas son aleatorios, por lo que las ediciones
      // se ordenan por su primera jornada para que el formulario las muestre en orden cronológico.
      .sort((a, b) => (a.jornadas[0]?.fecha ?? '').localeCompare(b.jornadas[0]?.fecha ?? '') || a.id.localeCompare(b.id)),
  };
}

/* ───────── GET /admin/eventos: listado para la sección Eventos del panel ───────── */

eventoAdminRoutes.get('/admin/eventos', async c => {
  const filas = await c.env.cafe_cabra_agenda_db.prepare(`
    SELECT e.id, e.nombre, e.estado, e.precio, e.cupo_maximo, e.controla_cupo,
      t.nombre AS tipo, t.requiere_pago, u.nombre AS ubicacion,
      (SELECT COUNT(*) FROM ediciones d WHERE d.evento_id=e.id) AS cantidad_ediciones,
      (SELECT MIN(f.fecha) FROM fechas f WHERE f.evento_id=e.id) AS primera_fecha,
      (SELECT MAX(f.fecha) FROM fechas f WHERE f.evento_id=e.id) AS ultima_fecha,
      (SELECT COUNT(*) FROM reservas r WHERE r.evento_id=e.id
        AND (r.estado='CONFIRMADO' OR (r.estado='RESERVADO' AND (r.expira_en IS NULL OR r.expira_en>unixepoch())))) AS inscritos_activos
    FROM eventos e
    JOIN tipo_evento t ON t.id=e.tipo_evento_id
    JOIN ubicaciones u ON u.id=e.ubicacion_id
    ORDER BY COALESCE((SELECT MIN(f.fecha) FROM fechas f WHERE f.evento_id=e.id), '9999-12-31') DESC, e.id DESC
  `).all<{
    id: number; nombre: string; estado: string; precio: number; cupo_maximo: number | null; controla_cupo: number;
    tipo: string; requiere_pago: number; ubicacion: string; cantidad_ediciones: number;
    primera_fecha: string | null; ultima_fecha: string | null; inscritos_activos: number;
  }>();

  return c.json(filas.results.map(f => ({
    id: f.id,
    nombre: f.nombre,
    estado: f.estado,
    tipo: f.tipo,
    requierePago: Boolean(f.requiere_pago),
    ubicacion: f.ubicacion,
    precio: f.precio,
    cupoMaximo: f.cupo_maximo,
    controlaCupo: Boolean(f.controla_cupo),
    cantidadEdiciones: f.cantidad_ediciones,
    primeraFecha: f.primera_fecha,
    ultimaFecha: f.ultima_fecha,
    inscritosActivos: f.inscritos_activos,
  })));
});

/* ───────── GET /admin/eventos/:id: datos para el formulario de edición ───────── */

eventoAdminRoutes.get('/admin/eventos/:id', async c => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'Identificador inválido.' }, 400);
  const evento = await cargarEvento(c, id);
  if (!evento) return c.json({ error: 'No encontrado.' }, 404);
  return c.json(evento);
});

/* ───────── POST /admin/eventos: crear curso o cata (SCRUM-22 y SCRUM-23) ───────── */

eventoAdminRoutes.post('/admin/eventos', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const cuerpo = await c.req.json().catch(() => null);
  const lectura = leerEvento(cuerpo);
  if (!lectura.ok) return c.json({ error: lectura.error }, 400);
  const datos = lectura.datos;
  const errorBase = await validarContraBase(db, datos);
  if (errorBase) return c.json({ error: errorBase }, 400);

  // Según los criterios de aceptación de SCRUM-22 el evento queda en ABIERTO al crearse y
  // aparece de inmediato en el catálogo público. El administrador puede guardarlo en
  // BORRADOR si todavía no lo quiere publicar.
  const estadoPedido = (cuerpo as Record<string, unknown> | null)?.estado;
  if (estadoPedido !== undefined && estadoPedido !== 'BORRADOR' && estadoPedido !== 'ABIERTO') {
    return c.json({ error: 'Al crear un evento el estado solo puede ser BORRADOR o ABIERTO.' }, 400);
  }
  const estado: EstadoFormulario = estadoPedido === 'BORRADOR' ? 'BORRADOR' : 'ABIERTO';

  const marca = auditoria(c);

  // El evento, sus relaciones, sus ediciones y sus jornadas se escriben en un solo batch de
  // D1, el cual se ejecuta como una transacción, por lo que si falla una parte no queda un
  // evento a medio crear. Como el identificador del evento se genera dentro del mismo batch,
  // las filas relacionadas lo obtienen con MAX(id), lo cual es seguro debido a que D1
  // ejecuta las escrituras de una base de forma serializada.
  const idEventoNuevo = sql`(SELECT MAX(id) FROM eventos)`;
  const instrucciones: BatchItem<'sqlite'>[] = [];

  instrucciones.push(db.insert(eventos).values({ ...columnasEvento(datos), estado, ...marca }).returning({ id: eventos.id }));
  for (const instructorId of datos.instructorIds) {
    instrucciones.push(db.insert(eventoInstructores).values({ eventoId: idEventoNuevo, instructorId }));
  }
  for (const opcionId of datos.opcionAlimentariaIds) {
    instrucciones.push(db.insert(eventoOpcionesAlimentarias).values({ eventoId: idEventoNuevo, opcionId }));
  }
  for (const edicion of datos.ediciones) {
    // Los identificadores de las ediciones son texto en el esquema, por lo que se generan
    // aquí y no los asigna la base de datos.
    const edicionId = crypto.randomUUID();
    instrucciones.push(db.insert(ediciones).values({ id: edicionId, eventoId: idEventoNuevo, cupoMaximo: edicion.cupoMaximo }));
    for (const jornada of edicion.jornadas) {
      instrucciones.push(db.insert(fechas).values({ eventoId: idEventoNuevo, edicionId, fecha: jornada.fecha, horario: jornada.horario, ...marca }));
    }
  }

  for (const [orden, imagenId] of (datos.imagenIds ?? []).entries()) {
    instrucciones.push(db.insert(eventoMedia).values({ eventoId: idEventoNuevo, imagenId, url: '/api/imagenes/' + imagenId, tipo: 'IMAGEN', orden, esPrincipal: orden === 0, ...marca }));
  }
  const resultados = await db.batch(instrucciones as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  const [{ id }] = resultados[0] as { id: number }[];
  return c.json(await cargarEvento(c, id), 201);
});

/* ───────── PATCH /admin/eventos/:id: editar curso o cata (SCRUM-24) ───────── */

eventoAdminRoutes.patch('/admin/eventos/:id', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'Identificador inválido.' }, 400);

  const actual = await cargarEvento(c, id);
  if (!actual) return c.json({ error: 'No encontrado.' }, 404);
  if (actual.estado === 'CANCELADO') return c.json({ error: 'Un evento cancelado no se puede editar.' }, 409);

  const cuerpo = await c.req.json().catch(() => null);
  const lectura = leerEvento(cuerpo);
  if (!lectura.ok) return c.json({ error: lectura.error }, 400);
  const datos = lectura.datos;
  const errorBase = await validarContraBase(db, datos);
  if (errorBase) return c.json({ error: errorBase }, 400);

  // Desde la edición el estado solo se puede dejar en BORRADOR o en ABIERTO, lo cual
  // permite publicar el evento y también volver a abrir uno que se cerró manualmente. El
  // cierre se realiza mediante su propia ruta. Si el cuerpo no trae estado, se mantiene.
  const estadoPedido = (cuerpo as Record<string, unknown> | null)?.estado;
  let estado: typeof actual.estado = actual.estado;
  if (estadoPedido !== undefined) {
    if (estadoPedido !== 'BORRADOR' && estadoPedido !== 'ABIERTO') {
      return c.json({ error: 'Desde la edición el estado solo puede ser BORRADOR o ABIERTO.' }, 400);
    }
    estado = estadoPedido;
  }

  // Se comparan las ediciones enviadas con las existentes. Una edición enviada con un id
  // que no pertenece al evento se rechaza, una edición existente que no viene en el cuerpo
  // se elimina solo si no tiene reservas, y el cupo de una edición no puede quedar por
  // debajo de los cupos que ya están ocupados.
  const existentes = new Map(actual.ediciones.map(d => [d.id, d]));
  for (const edicion of datos.ediciones) {
    if (edicion.id === null) continue;
    const previa = existentes.get(edicion.id);
    if (!previa) return c.json({ error: 'Una de las ediciones enviadas no pertenece a este evento.' }, 400);
    if (datos.controlaCupo && edicion.cupoMaximo !== null && edicion.cupoMaximo < previa.cuposOcupados) {
      return c.json({ error: `El cupo de una edición no puede ser menor que sus ${previa.cuposOcupados} cupos ocupados.` }, 409);
    }
  }
  const idsEnviados = new Set(datos.ediciones.map(d => d.id).filter((v): v is string => v !== null));
  const aEliminar = actual.ediciones.filter(d => !idsEnviados.has(d.id));
  if (aEliminar.some(d => d.tieneReservas)) {
    return c.json({ error: 'No se puede eliminar una edición que tiene reservas asociadas.' }, 409);
  }

  const marca = auditoria(c);
  const instrucciones: BatchItem<'sqlite'>[] = [];

  instrucciones.push(db.update(eventos).set({ ...columnasEvento(datos), estado, ...marca }).where(eq(eventos.id, id)));

  // Las relaciones con instructores y opciones alimentarias se reemplazan completas.
  instrucciones.push(db.delete(eventoInstructores).where(eq(eventoInstructores.eventoId, id)));
  for (const instructorId of datos.instructorIds) {
    instrucciones.push(db.insert(eventoInstructores).values({ eventoId: id, instructorId }));
  }
  instrucciones.push(db.delete(eventoOpcionesAlimentarias).where(eq(eventoOpcionesAlimentarias.eventoId, id)));
  for (const opcionId of datos.opcionAlimentariaIds) {
    instrucciones.push(db.insert(eventoOpcionesAlimentarias).values({ eventoId: id, opcionId }));
  }

  // Las jornadas se reemplazan completas, ya que, ninguna reserva apunta a una fila de
  // fechas sino a la edición, por lo que borrarlas y volver a crearlas no afecta a los inscritos.
  instrucciones.push(db.delete(fechas).where(eq(fechas.eventoId, id)));
  if (aEliminar.length > 0) {
    instrucciones.push(db.delete(ediciones).where(and(eq(ediciones.eventoId, id), inArray(ediciones.id, aEliminar.map(d => d.id)))));
  }
  for (const edicion of datos.ediciones) {
    let edicionId = edicion.id;
    if (edicionId === null) {
      edicionId = crypto.randomUUID();
      instrucciones.push(db.insert(ediciones).values({ id: edicionId, eventoId: id, cupoMaximo: edicion.cupoMaximo }));
    } else {
      instrucciones.push(db.update(ediciones).set({ cupoMaximo: edicion.cupoMaximo }).where(eq(ediciones.id, edicionId)));
    }
    for (const jornada of edicion.jornadas) {
      instrucciones.push(db.insert(fechas).values({ eventoId: id, edicionId, fecha: jornada.fecha, horario: jornada.horario, ...marca }));
    }
  }

  // Omitir imagenIds conserva las fotos anteriores; una selección explícita las reemplaza.
  if (datos.imagenIds !== undefined) {
    instrucciones.push(db.delete(eventoMedia).where(and(eq(eventoMedia.eventoId, id), eq(eventoMedia.tipo, 'IMAGEN'))));
    for (const [orden, imagenId] of datos.imagenIds.entries()) {
      instrucciones.push(db.insert(eventoMedia).values({ eventoId: id, imagenId, url: '/api/imagenes/' + imagenId, tipo: 'IMAGEN', orden, esPrincipal: orden === 0, ...marca }));
    }
  }
  await db.batch(instrucciones as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
  return c.json(await cargarEvento(c, id));
});

/* ───────── POST /admin/eventos/:id/cierre: cierre manual (SCRUM-25) ───────── */

eventoAdminRoutes.post('/admin/eventos/:id/cierre', async c => {
  const db = createDb(c.env.cafe_cabra_agenda_db);
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id <= 0) return c.json({ error: 'Identificador inválido.' }, 400);

  const evento = await db.select({ estado: eventos.estado }).from(eventos).where(eq(eventos.id, id)).get();
  if (!evento) return c.json({ error: 'No encontrado.' }, 404);
  if (evento.estado !== 'ABIERTO') {
    return c.json({ error: `Solo se puede cerrar un evento abierto, y este evento está en estado ${evento.estado}.` }, 409);
  }

  // Solo cambia el estado del evento, por lo que las ediciones y las reservas existentes
  // se mantienen sin cambios y el evento deja de aparecer en el catálogo público.
  await db.update(eventos).set({ estado: 'CERRADO', ...auditoria(c) }).where(eq(eventos.id, id));
  return c.json(await cargarEvento(c, id));
});
