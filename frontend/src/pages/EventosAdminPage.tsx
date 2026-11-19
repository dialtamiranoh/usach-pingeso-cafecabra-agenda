import { useCallback, useEffect, useMemo, useState } from 'react';
import { EstadoBadge } from '../components/EstadoBadge';
import { ActionButton } from '../components/ActionButton';
import { listarMantenedor, type Registro } from '../features/admin/mantenedores';
import {
  type EventoResumen, type EventoDetalle, type EventoPayload,
  listarEventos, obtenerEvento, crearEvento, actualizarEvento, cerrarEvento,
  formatearFecha, formatearPrecio,
} from '../features/admin/eventos';

// Sección Eventos del panel de administración (épica E1). Muestra el listado de cursos y
// catas, y permite crear (SCRUM-22 y SCRUM-23), editar (SCRUM-24) y cerrar de forma manual
// (SCRUM-25). El evento se crea en ABIERTO, según los criterios de aceptación de SCRUM-22,
// o en BORRADOR si el administrador lo elige. Las listas de tipos, ubicaciones,
// instructores y opciones alimentarias se obtienen de los mantenedores existentes.

/* ───────── Estado del formulario ───────── */

// Los campos del formulario se guardan como texto, tal como los entregan los inputs, y se
// convierten a números recién al momento de enviar.
interface JornadaForm { fecha: string; inicio: string; fin: string; }
interface EdicionForm {
  id: string | null;
  cupo: string;
  cuposOcupados: number;
  tieneReservas: boolean;
  jornadas: JornadaForm[];
}
interface EventoForm {
  tipoEventoId: string;
  ubicacionId: string;
  nombre: string;
  descripcion: string;
  precio: string;
  cupoMaximo: string;
  controlaCupo: boolean;
  incluyeCertificado: boolean;
  incluye: string;
  // Cadena vacía significa mantener el estado actual, lo cual se usa en un evento cerrado
  // para editar sus datos sin volver a abrirlo.
  estado: 'BORRADOR' | 'ABIERTO' | '';
  instructorIds: number[];
  opcionAlimentariaIds: number[];
  ediciones: EdicionForm[];
}

const JORNADA_VACIA: JornadaForm = { fecha: '', inicio: '', fin: '' };
const nuevaEdicion = (): EdicionForm => ({ id: null, cupo: '', cuposOcupados: 0, tieneReservas: false, jornadas: [{ ...JORNADA_VACIA }] });

function formularioVacio(): EventoForm {
  return {
    tipoEventoId: '', ubicacionId: '', nombre: '', descripcion: '', precio: '0', cupoMaximo: '',
    controlaCupo: true, incluyeCertificado: false, incluye: '', estado: 'ABIERTO',
    instructorIds: [], opcionAlimentariaIds: [], ediciones: [nuevaEdicion()],
  };
}

// Convierte el evento que entrega el backend en el estado del formulario. El horario se
// guarda como "HH:MM-HH:MM", por lo que se separa en hora de inicio y hora de término.
function formularioDesdeEvento(evento: EventoDetalle): EventoForm {
  return {
    tipoEventoId: String(evento.tipoEventoId),
    ubicacionId: String(evento.ubicacionId),
    nombre: evento.nombre,
    descripcion: evento.descripcion ?? '',
    precio: String(evento.precio),
    cupoMaximo: evento.cupoMaximo === null ? '' : String(evento.cupoMaximo),
    controlaCupo: evento.controlaCupo,
    incluyeCertificado: evento.incluyeCertificado,
    incluye: evento.incluye ?? '',
    // Un evento cerrado se mantiene cerrado al guardar, salvo que el administrador elija
    // volver a abrirlo o dejarlo en borrador.
    estado: evento.estado === 'BORRADOR' || evento.estado === 'ABIERTO' ? evento.estado : '',
    instructorIds: evento.instructorIds,
    opcionAlimentariaIds: evento.opcionAlimentariaIds,
    ediciones: evento.ediciones.map(edicion => ({
      id: edicion.id,
      cupo: edicion.cupoMaximo === null ? '' : String(edicion.cupoMaximo),
      cuposOcupados: edicion.cuposOcupados,
      tieneReservas: edicion.tieneReservas,
      jornadas: edicion.jornadas.length > 0
        ? edicion.jornadas.map(jornada => {
          const [inicio = '', fin = ''] = (jornada.horario ?? '').split('-');
          return { fecha: jornada.fecha, inicio, fin };
        })
        : [{ ...JORNADA_VACIA }],
    })),
  };
}

// Arma el cuerpo que se envía al backend. Las validaciones definitivas las hace el backend,
// aquí solo se revisa lo mínimo para entregar un mensaje inmediato al administrador.
function construirPayload(form: EventoForm, exigePago: boolean): { payload?: EventoPayload; error?: string } {
  if (!form.tipoEventoId) return { error: 'Se debe seleccionar el tipo de evento.' };
  if (!form.ubicacionId) return { error: 'Se debe seleccionar la ubicación.' };
  const precio = Number(form.precio || '0');
  if (!Number.isFinite(precio) || precio < 0) return { error: 'El precio no puede ser negativo.' };
  const cupoMaximo = form.cupoMaximo.trim() === '' ? null : Number(form.cupoMaximo);
  if (form.controlaCupo && cupoMaximo === null) return { error: 'El cupo máximo es obligatorio, solo puede quedar vacío en un evento de entrada liberada.' };

  const ediciones: EventoPayload['ediciones'] = [];
  for (const [indice, edicion] of form.ediciones.entries()) {
    const jornadas: { fecha: string; horario: string }[] = [];
    for (const jornada of edicion.jornadas) {
      if (!jornada.fecha || !jornada.inicio || !jornada.fin) {
        return { error: `Se debe completar la fecha, la hora de inicio y la hora de término de cada jornada de la edición ${indice + 1}.` };
      }
      jornadas.push({ fecha: jornada.fecha, horario: `${jornada.inicio}-${jornada.fin}` });
    }
    ediciones.push({
      ...(edicion.id ? { id: edicion.id } : {}),
      cupoMaximo: edicion.cupo.trim() === '' ? null : Number(edicion.cupo),
      jornadas,
    });
  }

  return {
    payload: {
      tipoEventoId: Number(form.tipoEventoId),
      ubicacionId: Number(form.ubicacionId),
      nombre: form.nombre,
      descripcion: form.descripcion.trim() || null,
      precio,
      cupoMaximo,
      controlaCupo: form.controlaCupo,
      // Un tipo sin pago previo, como la cata, no genera certificado (SCRUM-23).
      incluyeCertificado: exigePago && form.incluyeCertificado,
      incluye: form.incluye.trim() || null,
      instructorIds: form.instructorIds,
      opcionAlimentariaIds: form.opcionAlimentariaIds,
      ...(form.estado ? { estado: form.estado } : {}),
      ediciones,
    },
  };
}

const CLASE_INPUT = 'mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none';
const CLASE_LABEL = 'block text-sm font-medium text-[#111111]';

/* ───────── Componente principal ───────── */

export function EventosAdminPage({ onChanged }: { onChanged?: () => void } = {}) {
  const [eventos, setEventos] = useState<EventoResumen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Catálogos de los mantenedores que alimentan las listas del formulario.
  const [tipos, setTipos] = useState<Registro[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Registro[]>([]);
  const [instructores, setInstructores] = useState<Registro[]>([]);
  const [opciones, setOpciones] = useState<Registro[]>([]);

  const [formAbierto, setFormAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  // Estado con el que se cargó el evento que se edita, del cual depende mostrar el cierre
  // en el detalle.
  const [estadoEditado, setEstadoEditado] = useState<EventoDetalle['estado'] | null>(null);
  const [form, setForm] = useState<EventoForm>(formularioVacio);
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  // Cierre manual con confirmación en la misma fila del listado o en el detalle del evento,
  // sin ventanas emergentes del navegador. Cada lugar tiene su propio estado de confirmación,
  // ya que, al compartir uno solo la pregunta aparecía al mismo tiempo en la fila del listado
  // y en el detalle del evento que se estaba editando.
  const [cierrePendiente, setCierrePendiente] = useState<number | null>(null);
  const [cierreDetallePendiente, setCierreDetallePendiente] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setEventos(await listarEventos());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el listado de eventos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
    Promise.all([
      listarMantenedor('tipos-evento'), listarMantenedor('ubicaciones'),
      listarMantenedor('instructores'), listarMantenedor('opciones'),
    ]).then(([t, u, i, o]) => { setTipos(t); setUbicaciones(u); setInstructores(i); setOpciones(o); })
      .catch(() => setError('No se pudieron cargar los mantenedores que alimentan el formulario.'));
  }, [cargar]);

  // El tipo de evento seleccionado define si el instructor es obligatorio (RF-01, RF-02 y RN-02),
  // regla que el backend aplica a partir del campo requierePago del tipo.
  const tipoSeleccionado = useMemo(() => tipos.find(t => String(t.id) === form.tipoEventoId), [tipos, form.tipoEventoId]);
  // El mismo campo indica si el tipo exige pago previo. Un tipo sin pago previo, como la
  // cata, igual puede tener precio (RN-02), sin embargo, no incluye certificado (SCRUM-23).
  const exigePago = Boolean(tipoSeleccionado?.requierePago);
  const exigeInstructor = exigePago;

  function actualizar<K extends keyof EventoForm>(clave: K, valor: EventoForm[K]) {
    setForm(previo => ({ ...previo, [clave]: valor }));
  }
  function alternarId(clave: 'instructorIds' | 'opcionAlimentariaIds', id: number) {
    setForm(previo => ({
      ...previo,
      [clave]: previo[clave].includes(id) ? previo[clave].filter(x => x !== id) : [...previo[clave], id],
    }));
  }
  function actualizarEdicion(indice: number, cambio: Partial<EdicionForm>) {
    setForm(previo => ({ ...previo, ediciones: previo.ediciones.map((e, i) => (i === indice ? { ...e, ...cambio } : e)) }));
  }
  function actualizarJornada(indiceEdicion: number, indiceJornada: number, cambio: Partial<JornadaForm>) {
    setForm(previo => ({
      ...previo,
      ediciones: previo.ediciones.map((e, i) => (i !== indiceEdicion ? e : {
        ...e, jornadas: e.jornadas.map((j, k) => (k === indiceJornada ? { ...j, ...cambio } : j)),
      })),
    }));
  }

  function abrirNuevo() {
    const inicial = formularioVacio();
    // Si existe una sola ubicación activa se deja seleccionada, ya que, es el caso habitual
    // del local (RN-08).
    const ubicacionesActivas = ubicaciones.filter(u => u.activo);
    if (ubicacionesActivas.length === 1) inicial.ubicacionId = String(ubicacionesActivas[0].id);
    setForm(inicial);
    setEditId(null);
    setEstadoEditado(null);
    setErrorForm('');
    setMensaje('');
    setFormAbierto(true);
  }

  async function abrirEdicion(id: number) {
    setErrorForm('');
    setMensaje('');
    try {
      const evento = await obtenerEvento(id);
      setForm(formularioDesdeEvento(evento));
      setEditId(id);
      setEstadoEditado(evento.estado);
      setCierrePendiente(null);
      setCierreDetallePendiente(false);
      setFormAbierto(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el evento.');
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm('');
    const { payload, error: errorLocal } = construirPayload(form, exigePago);
    if (!payload) { setErrorForm(errorLocal ?? 'Datos incompletos.'); return; }
    setGuardando(true);
    try {
      if (editId === null) await crearEvento(payload);
      else await actualizarEvento(editId, payload);
      setMensaje(editId === null
        ? (form.estado === 'BORRADOR' ? 'Evento creado en borrador.' : 'Evento creado y publicado en el catálogo.')
        : 'Cambios guardados.');
      setFormAbierto(false);
      await cargar();
      onChanged?.();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar el evento.');
    } finally {
      setGuardando(false);
    }
  }

  async function confirmarCierre(id: number) {
    setMensaje('');
    try {
      await cerrarEvento(id);
      setMensaje('Evento cerrado, ya no recibe nuevas inscripciones.');
      // Si el cierre se hizo desde el detalle, el formulario se cierra para no guardar encima
      // un estado anterior.
      if (editId === id) setFormAbierto(false);
      await cargar();
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar el evento.');
    } finally {
      setCierrePendiente(null);
      setCierreDetallePendiente(false);
    }
  }

  // En el formulario se muestran los registros activos, junto con los inactivos que ya
  // estaban asociados al evento, para que el administrador vea por qué no se puede guardar.
  const instructoresVisibles = instructores.filter(i => i.activo || form.instructorIds.includes(i.id));
  const opcionesVisibles = opciones.filter(o => o.activo || form.opcionAlimentariaIds.includes(o.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[#111111]">Eventos</h1>
        <p className="text-sm text-[#6b6b6b]">Cursos y catas del sistema. Un evento nuevo queda abierto y publicado en el catálogo, salvo que se guarde como borrador.</p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#111111]">Listado</h2>
        <ActionButton variant="crear" label="Nuevo evento" onClick={abrirNuevo} />
      </div>

      {mensaje && <p className="rounded-md bg-[#e7f4ea] px-3 py-2 text-sm text-[#1a7f37]" role="status">{mensaje}</p>}

      {formAbierto && (
        <form onSubmit={guardar} className="space-y-6 rounded-lg border border-[#e5e5e5] bg-white p-6">
          <h3 className="text-sm font-semibold text-[#111111]">{editId === null ? 'Nuevo evento' : 'Editar evento'}</h3>

          {/* Datos generales */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={CLASE_LABEL} htmlFor="evento-tipo">Tipo de evento *</label>
              <select id="evento-tipo" value={form.tipoEventoId} onChange={e => actualizar('tipoEventoId', e.target.value)} className={CLASE_INPUT}>
                <option value="">Seleccionar</option>
                {tipos.filter(t => t.activo || String(t.id) === form.tipoEventoId).map(t => (
                  <option key={t.id} value={t.id}>{String(t.nombre)}{t.requierePago ? ' (pago previo obligatorio)' : ' (sin pago previo)'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={CLASE_LABEL} htmlFor="evento-ubicacion">Ubicación *</label>
              <select id="evento-ubicacion" value={form.ubicacionId} onChange={e => actualizar('ubicacionId', e.target.value)} className={CLASE_INPUT}>
                <option value="">Seleccionar</option>
                {ubicaciones.filter(u => u.activo || String(u.id) === form.ubicacionId).map(u => (
                  <option key={u.id} value={u.id}>{String(u.nombre)}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={CLASE_LABEL} htmlFor="evento-nombre">Nombre *</label>
              <input id="evento-nombre" type="text" value={form.nombre} onChange={e => actualizar('nombre', e.target.value)} className={CLASE_INPUT} />
            </div>
            <div className="md:col-span-2">
              <label className={CLASE_LABEL} htmlFor="evento-descripcion">Descripción <span className="text-[#9a9a9a]">(opcional)</span></label>
              <textarea id="evento-descripcion" rows={3} value={form.descripcion} onChange={e => actualizar('descripcion', e.target.value)} className={CLASE_INPUT} />
            </div>
            <div>
              <label className={CLASE_LABEL} htmlFor="evento-precio">Precio en pesos {exigePago ? '*' : form.tipoEventoId ? <span className="text-[#9a9a9a]">(0 si es gratuita, el pago no se exige antes de inscribirse)</span> : null}</label>
              <input id="evento-precio" type="number" min={0} step={1} value={form.precio}
                onChange={e => actualizar('precio', e.target.value)} className={CLASE_INPUT} />
            </div>
            <div>
              <label className={CLASE_LABEL} htmlFor="evento-cupo">Cupo máximo {form.controlaCupo ? '*' : <span className="text-[#9a9a9a]">(vacío si no tiene límite)</span>}</label>
              <input id="evento-cupo" type="number" min={1} step={1} value={form.cupoMaximo} onChange={e => actualizar('cupoMaximo', e.target.value)} className={CLASE_INPUT} />
            </div>
            <div className="md:col-span-2">
              <label className={CLASE_LABEL} htmlFor="evento-incluye">Qué incluye <span className="text-[#9a9a9a]">(opcional)</span></label>
              <input id="evento-incluye" type="text" value={form.incluye} onChange={e => actualizar('incluye', e.target.value)} className={CLASE_INPUT} />
            </div>
            <label className="flex items-center gap-2 text-sm text-[#111111]">
              <input type="checkbox" checked={form.controlaCupo} onChange={e => actualizar('controlaCupo', e.target.checked)} />
              Controla cupo (si se desmarca, es un evento de entrada liberada)
            </label>
            <label className="flex items-center gap-2 text-sm text-[#111111]">
              <input type="checkbox" checked={exigePago && form.incluyeCertificado} disabled={!exigePago}
                onChange={e => actualizar('incluyeCertificado', e.target.checked)} />
              Incluye certificado{!exigePago && form.tipoEventoId && <span className="text-xs text-[#9a9a9a]">(no aplica a este tipo de evento)</span>}
            </label>
            <div>
              <label className={CLASE_LABEL} htmlFor="evento-estado">Estado</label>
              <select id="evento-estado" value={form.estado} onChange={e => actualizar('estado', e.target.value as EventoForm['estado'])} className={CLASE_INPUT}>
                {estadoEditado === 'CERRADO' && <option value="">Cerrado (mantener cerrado)</option>}
                <option value="ABIERTO">Abierto (publicado y recibiendo inscripciones)</option>
                <option value="BORRADOR">Borrador (no aparece en el catálogo)</option>
              </select>
            </div>
          </div>

          {/* Instructores y opciones alimentarias */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <fieldset>
              <legend className={CLASE_LABEL}>Instructores {exigeInstructor ? '*' : <span className="text-[#9a9a9a]">(opcional)</span>}</legend>
              <div className="mt-2 space-y-1">
                {instructoresVisibles.length === 0 && <p className="text-sm text-[#9a9a9a]">No hay instructores en los mantenedores.</p>}
                {instructoresVisibles.map(i => (
                  <label key={i.id} className="flex items-center gap-2 text-sm text-[#111111]">
                    <input type="checkbox" checked={form.instructorIds.includes(i.id)} onChange={() => alternarId('instructorIds', i.id)} />
                    {String(i.nombre)}{!i.activo && <span className="text-xs text-[#b3261e]">(inactivo)</span>}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className={CLASE_LABEL}>Opciones alimentarias <span className="text-[#9a9a9a]">(opcional)</span></legend>
              <div className="mt-2 space-y-1">
                {opcionesVisibles.length === 0 && <p className="text-sm text-[#9a9a9a]">No hay opciones alimentarias en los mantenedores.</p>}
                {opcionesVisibles.map(o => (
                  <label key={o.id} className="flex items-center gap-2 text-sm text-[#111111]">
                    <input type="checkbox" checked={form.opcionAlimentariaIds.includes(o.id)} onChange={() => alternarId('opcionAlimentariaIds', o.id)} />
                    {String(o.nombre)}{!o.activo && <span className="text-xs text-[#b3261e]">(inactiva)</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Ediciones y jornadas */}
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-[#111111]">Ediciones *</h4>
              <p className="text-xs text-[#6b6b6b]">Cada edición es una oportunidad de inscripción con su propio cupo. Si un curso se dicta en dos días seguidos, se agrega una edición con dos jornadas, y si se repite en otra fecha, se agrega otra edición.</p>
            </div>
            {form.ediciones.map((edicion, indiceEdicion) => (
              <div key={edicion.id ?? `nueva-${indiceEdicion}`} className="space-y-3 rounded-lg border border-[#e5e5e5] p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[#111111]">Edición {indiceEdicion + 1}</p>
                    {edicion.cuposOcupados > 0 && <p className="text-xs text-[#6b6b6b]">{edicion.cuposOcupados} cupos ocupados</p>}
                  </div>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#111111]" htmlFor={`edicion-cupo-${indiceEdicion}`}>Cupo de la edición</label>
                      <input id={`edicion-cupo-${indiceEdicion}`} type="number" min={1} step={1} placeholder="Igual al evento"
                        value={edicion.cupo} onChange={e => actualizarEdicion(indiceEdicion, { cupo: e.target.value })}
                        className="mt-1 w-36 rounded-lg border border-[#d4d4d4] bg-white px-3 py-1.5 text-sm focus:border-[#111111] focus:outline-none" />
                    </div>
                    <ActionButton type="button" variant="eliminar" size="sm" label="Quitar edición"
                      disabled={form.ediciones.length === 1 || edicion.tieneReservas}
                      title={edicion.tieneReservas ? 'La edición tiene reservas asociadas' : undefined}
                      onClick={() => setForm(previo => ({ ...previo, ediciones: previo.ediciones.filter((_, i) => i !== indiceEdicion) }))} />
                  </div>
                </div>

                {edicion.jornadas.map((jornada, indiceJornada) => (
                  <div key={indiceJornada} className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#111111]" htmlFor={`jornada-fecha-${indiceEdicion}-${indiceJornada}`}>Fecha</label>
                      <input id={`jornada-fecha-${indiceEdicion}-${indiceJornada}`} type="date" value={jornada.fecha}
                        onChange={e => actualizarJornada(indiceEdicion, indiceJornada, { fecha: e.target.value })}
                        className="mt-1 rounded-lg border border-[#d4d4d4] bg-white px-3 py-1.5 text-sm focus:border-[#111111] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#111111]" htmlFor={`jornada-inicio-${indiceEdicion}-${indiceJornada}`}>Inicio</label>
                      <input id={`jornada-inicio-${indiceEdicion}-${indiceJornada}`} type="time" value={jornada.inicio}
                        onChange={e => actualizarJornada(indiceEdicion, indiceJornada, { inicio: e.target.value })}
                        className="mt-1 rounded-lg border border-[#d4d4d4] bg-white px-3 py-1.5 text-sm focus:border-[#111111] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#111111]" htmlFor={`jornada-fin-${indiceEdicion}-${indiceJornada}`}>Término</label>
                      <input id={`jornada-fin-${indiceEdicion}-${indiceJornada}`} type="time" value={jornada.fin}
                        onChange={e => actualizarJornada(indiceEdicion, indiceJornada, { fin: e.target.value })}
                        className="mt-1 rounded-lg border border-[#d4d4d4] bg-white px-3 py-1.5 text-sm focus:border-[#111111] focus:outline-none" />
                    </div>
                    <ActionButton type="button" variant="cancelar" size="sm" label="Quitar jornada" disabled={edicion.jornadas.length === 1}
                      onClick={() => actualizarEdicion(indiceEdicion, { jornadas: edicion.jornadas.filter((_, k) => k !== indiceJornada) })} />
                  </div>
                ))}
                <ActionButton type="button" variant="crear" size="sm" label="Agregar jornada"
                  onClick={() => actualizarEdicion(indiceEdicion, { jornadas: [...edicion.jornadas, { ...JORNADA_VACIA }] })} />
              </div>
            ))}
            <ActionButton type="button" variant="crear" label="Agregar edición" onClick={() => setForm(previo => ({ ...previo, ediciones: [...previo.ediciones, nuevaEdicion()] }))} />
          </div>

          {errorForm && <p className="text-sm text-[#b3261e]" role="alert">{errorForm}</p>}
          {/* Dentro de un formulario el navegador trata como envío a todo botón que no declara su
              tipo, y ActionButton no lo define por defecto, por lo que cada botón que no debe guardar
              el evento lleva type="button". Sin esto, Agregar jornada o Cerrar evento también enviaban
              el formulario, lo que guardaba el evento antes de tiempo o lo dejaba otra vez en ABIERTO
              después del cierre (INC-01 de SCRUM-102). */}
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="guardar" type="submit" loading={guardando} />
            <ActionButton type="button" variant="cancelar" onClick={() => setFormAbierto(false)} />
            {/* Cierre manual desde el detalle del evento, según los criterios de aceptación de SCRUM-25. */}
            {editId !== null && estadoEditado === 'ABIERTO' && (cierreDetallePendiente ? (
              <span className="ms-auto flex items-center gap-2">
                <span className="text-xs text-[#6b6b6b]">¿Cerrar inscripciones?</span>
                <ActionButton type="button" variant="desactivar" size="sm" label="Sí, cerrar" onClick={() => confirmarCierre(editId)} />
                <ActionButton type="button" variant="cancelar" size="sm" label="No" onClick={() => setCierreDetallePendiente(false)} />
              </span>
            ) : (
              <ActionButton type="button" variant="desactivar" label="Cerrar evento" className="ms-auto" onClick={() => setCierreDetallePendiente(true)} />
            ))}
          </div>
        </form>
      )}

      {/* Listado */}
      <div className="rounded-lg border border-[#e5e5e5] bg-white p-6">
        {cargando && <p className="text-sm text-[#6b6b6b]">Cargando...</p>}
        {error && !cargando && <p className="text-sm text-[#b3261e]" role="alert">{error}</p>}
        {!cargando && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-[#e5e5e5] text-sm">
              <thead className="text-left">
                <tr className="*:font-medium *:text-[#111111]">
                  <th className="px-3 py-2 whitespace-nowrap">Nombre</th>
                  <th className="px-3 py-2 whitespace-nowrap">Tipo</th>
                  <th className="px-3 py-2 whitespace-nowrap">Fechas</th>
                  <th className="px-3 py-2 whitespace-nowrap">Ediciones</th>
                  <th className="px-3 py-2 whitespace-nowrap">Precio</th>
                  <th className="px-3 py-2 whitespace-nowrap">Inscritos</th>
                  <th className="px-3 py-2 whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {eventos.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-6 text-center text-[#9a9a9a]">Sin eventos registrados.</td></tr>
                ) : eventos.map(evento => (
                  <tr key={evento.id}>
                    <td className="px-3 py-2 align-top text-[#111111]">
                      {evento.nombre}
                      <span className="block text-xs text-[#9a9a9a]">{evento.ubicacion}</span>
                    </td>
                    <td className="px-3 py-2 align-top text-[#111111]">{evento.tipo}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-[#111111]">
                      {evento.primeraFecha === evento.ultimaFecha
                        ? formatearFecha(evento.primeraFecha)
                        : `${formatearFecha(evento.primeraFecha)} al ${formatearFecha(evento.ultimaFecha)}`}
                    </td>
                    <td className="px-3 py-2 align-top text-[#111111] tabular-nums">{evento.cantidadEdiciones}</td>
                    <td className="px-3 py-2 align-top whitespace-nowrap text-[#111111] tabular-nums">{formatearPrecio(evento.precio)}</td>
                    <td className="px-3 py-2 align-top text-[#111111] tabular-nums">
                      {evento.inscritosActivos}
                      <span className="block text-xs text-[#9a9a9a]">
                        {!evento.controlaCupo ? 'Entrada liberada' : evento.cupoMaximo === null ? 'Sin límite de cupo' : `Cupo ${evento.cupoMaximo} por edición`}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top whitespace-nowrap"><EstadoBadge estado={evento.estado} /></td>
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {cierrePendiente === evento.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#6b6b6b]">¿Cerrar inscripciones?</span>
                          <ActionButton variant="desactivar" size="sm" label="Sí, cerrar" onClick={() => confirmarCierre(evento.id)} />
                          <ActionButton variant="cancelar" size="sm" label="No" onClick={() => setCierrePendiente(null)} />
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          {evento.estado !== 'CANCELADO' && <ActionButton variant="editar" size="sm" onClick={() => abrirEdicion(evento.id)} />}
                          {evento.estado === 'ABIERTO' && <ActionButton variant="desactivar" size="sm" label="Cerrar" onClick={() => setCierrePendiente(evento.id)} />}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
