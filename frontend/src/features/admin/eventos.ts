// Acceso a la gestión de cursos y catas del panel (épica E1, RF-01 a RF-04). Sigue el mismo
// patrón de mantenedores.ts, es decir, funciones que llaman a /api/admin/eventos con la
// cookie de sesión y que lanzan un Error con el mensaje del backend cuando la respuesta falla.

export type EstadoEvento = 'BORRADOR' | 'ABIERTO' | 'CERRADO' | 'CANCELADO';

// Fila del listado de la sección Eventos (GET /api/admin/eventos).
export interface EventoResumen {
  id: number;
  nombre: string;
  estado: EstadoEvento;
  tipo: string;
  requierePago: boolean;
  ubicacion: string;
  precio: number;
  cupoMaximo: number | null;
  controlaCupo: boolean;
  cantidadEdiciones: number;
  primeraFecha: string | null;
  ultimaFecha: string | null;
  inscritosActivos: number;
}

// Jornada de una edición, con la fecha en formato AAAA-MM-DD y el horario en HH:MM-HH:MM.
export interface Jornada {
  fecha: string;
  horario: string | null;
}

// Edición tal como la entrega el backend al cargar un evento para editarlo.
export interface EdicionDetalle {
  id: string;
  cupoMaximo: number | null;
  estado: string;
  cuposOcupados: number;
  tieneReservas: boolean;
  jornadas: Jornada[];
}

// Evento completo (GET /api/admin/eventos/:id), con el cual se llena el formulario de edición.
export interface EventoDetalle {
  imagenes: { id: string | null; url: string }[];
  id: number;
  tipoEventoId: number;
  ubicacionId: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  cupoMaximo: number | null;
  controlaCupo: boolean;
  incluyeCertificado: boolean;
  incluye: string | null;
  estado: EstadoEvento;
  instructorIds: number[];
  opcionAlimentariaIds: number[];
  ediciones: EdicionDetalle[];
}

// Cuerpo que se envía al crear o editar. Una edición sin id se crea como nueva, y en la
// edición del evento las ediciones existentes que no se envían se eliminan en el backend.
export interface EventoPayload {
  imagenIds?: string[];
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
  estado?: 'BORRADOR' | 'ABIERTO';
  ediciones: { id?: string; cupoMaximo: number | null; jornadas: { fecha: string; horario: string }[] }[];
}

async function parseError(res: Response): Promise<string> {
  try {
    const cuerpo = await res.json();
    return cuerpo?.error ?? 'Ocurrió un error.';
  } catch {
    return 'Ocurrió un error.';
  }
}

async function pedir<T>(url: string, opciones: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...opciones,
    credentials: 'include',
    headers: opciones.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export function listarEventos(): Promise<EventoResumen[]> {
  return pedir('/api/admin/eventos');
}

export function obtenerEvento(id: number): Promise<EventoDetalle> {
  return pedir(`/api/admin/eventos/${id}`);
}

export function crearEvento(datos: EventoPayload): Promise<EventoDetalle> {
  return pedir('/api/admin/eventos', { method: 'POST', body: JSON.stringify(datos) });
}

export function actualizarEvento(id: number, datos: EventoPayload): Promise<EventoDetalle> {
  return pedir(`/api/admin/eventos/${id}`, { method: 'PATCH', body: JSON.stringify(datos) });
}

export function cerrarEvento(id: number): Promise<EventoDetalle> {
  return pedir(`/api/admin/eventos/${id}/cierre`, { method: 'POST' });
}

// Convierte una fecha AAAA-MM-DD en un texto corto en español, sin depender de la zona
// horaria del navegador, ya que, la fecha se arma a mediodía UTC.
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return '-';
  const valor = new Date(`${fecha}T12:00:00Z`);
  if (Number.isNaN(valor.getTime())) return fecha;
  return valor.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function formatearPrecio(precio: number): string {
  return precio > 0 ? precio.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }) : 'Gratuito';
}
