// Contratos públicos, sin secretos ni acceso a datos.
export * from './instituciones-financieras';
export * from './tipos-cuenta';

export interface CatalogEdition {
  id: string; capacity: number | null; remainingSeats: number | null;
  status: 'ABIERTO' | 'CERRADO' | 'CANCELADO';
  dates: { id: string; date: string; schedule: string | null }[];
}

export interface CatalogEvent {
  id: string; title: string; description: string; type: string;
  status: 'BORRADOR' | 'ABIERTO' | 'CERRADO' | 'CANCELADO';
  price: number; capacity: number | null; remainingSeats: number | null;
  requiresPayment: boolean; location: string; instructors: string[];
  includes: string; certificate: boolean; image: string | null;
  images: string[];
  editions: CatalogEdition[];
  dateMode: 'INDEPENDIENTES' | 'CONJUNTAS';
  dates: { id: string; date: string; schedule: string | null }[];
}
export interface CatalogResponse { events: CatalogEvent[] }

export type ReservationStatus = 'RESERVADO' | 'EN_ESPERA' | 'CONFIRMADO' | 'CANCELADO' | 'EXPIRADO';
export interface AdminEnrollment {
  id: number; code: string; attendee: string; contact: string; email: string; event: string;
  status: ReservationStatus; createdAt: number; expiresAt: number | null;
  amount: number; amountRecorded: boolean; paid: boolean;
  editionId: string | null;
  dates: { date: string; schedule: string | null }[];
}
export interface AdminEnrollmentDetail extends AdminEnrollment {
  phone: string | null; payerRut: string | null; bank: string | null; accountSuffix: string | null;
  notes: string; accountType: string; canConfirm: boolean; canCancel: boolean;
  dates: { date: string; schedule: string | null }[];
  dateMode: 'CONJUNTAS' | 'INDEPENDIENTES';
  editionOptions: CatalogEdition[];
  needsEdition: boolean;
  decision: { action: 'CONFIRMAR' | 'CANCELAR'; reason: string; date: number } | null;
  notification: { id: string; status: 'PENDIENTE' | 'ENVIANDO' | 'ENVIADO' | 'ERROR'; attempts: number; subject: string; message: string; sentAt: number | null } | null;
}
export interface AdminEnrollmentList { items: AdminEnrollment[]; total: number; page: number; pageSize: number }



// --- Panel de administración (lectura) ---
export interface AdminEventoProximo {
  id: number;
  nombre: string;
  tipo: string;
  fecha: string | null; // 'YYYY-MM-DD' de la próxima jornada, o null si no hay futura.
  cupos: string;         // "ocupados / total" o "Sin límite".
  estado: string;        // Etiqueta: Abierto, Cerrado, etc.
}
export interface AdminInscripcionReciente {
  id: number;
  alumno: string;
  evento: string;
  estado: string;   // Etiqueta: Confirmado, Reservado, Expirado, etc.
  creadoEn: number; // epoch en segundos.
}
export interface AdminSemana {
  label: string;
  valor: number;
  acento: boolean;
}

export interface AdminEstadoConteo {
  label: string;
  valor: number;
}
// --- Mantenedores (RF-31) ---
export interface Ubicacion {
  id: number;
  nombre: string;
  direccion: string | null;
  referencia: string | null;
  activo: boolean;
}
export interface TipoEvento {
  id: number;
  nombre: string;
  requierePago: boolean;
  activo: boolean;
}
export interface Instructor {
  id: number;
  nombre: string;
  bio: string | null;
  fotoUrl: string | null;
  email: string | null;
  activo: boolean;
}
export interface OpcionAlimentaria {
  id: number;
  nombre: string;
  activo: boolean;
}

// --- Tiempo real (WebSocket / Pub-Sub) ---
export type RealtimeTipo = 'RESERVA_NUEVA' | 'CUPO_CAMBIO' | 'RESERVA_EXPIRADA';
export interface RealtimeEvento {
  tipo: RealtimeTipo;
  eventId?: string;       // Evento afectado, cuando aplica.
  titulo?: string;        // Nombre del curso/evento, para mostrar en la notificación.
  detalle?: string;       // Texto corto para la campanita (ej. nombre del inscrito).
  ts: number;             // epoch en ms del momento del evento.
}

export interface AdminPanelResponse {
  stats: {
    eventosActivos: number;
    cursosActivos: number;
    catasActivos: number;
    inscritosMes: number;
    reservasPendientes: number;
    montoReservadoMes: number;
  };
  proximosEventos: AdminEventoProximo[];
  inscripcionesRecientes: AdminInscripcionReciente[];
  inscripcionesPorSemana: AdminSemana[];
  reservasPorEstado: AdminEstadoConteo[];
}

export interface FreeEnrollmentRequest {
  eventId: string;
  editionId: string;
  requestId: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  dietaryPreference: string;
  dietaryOther: string;
  allergyStatus: string;
  allergyDetails: string;
  notes: string;
  confirmed: boolean;
}
export interface PaidEnrollmentRequest extends FreeEnrollmentRequest {
  payerSameAsAttendee: boolean;
  payerName: string;
  payerRut: string;
  originBank: string;
  accountType: string;
  accountLastFour: string;
}

export interface TransferDetails {
  titular: string;
  rut: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  correo: string;
  monto: number;
  expiraEn: number;
}
export interface EnrollmentReceipt {
  code: string;
  status: 'CONFIRMADO' | 'RESERVADO';
  eventId: string;
  editionId: string;
  transfer?: TransferDetails;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  service: string;
  time: string;
  environment: string;
  database?: 'ok' | 'error';
  tables?: string[];
  tableCount?: number;
  entorno?: string | null;
  error?: string;
}
