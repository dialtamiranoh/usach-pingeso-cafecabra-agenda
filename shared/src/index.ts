// Contratos públicos, sin secretos ni acceso a datos.
export interface CatalogEvent {
  id: string; title: string; description: string; type: string;
  status: 'BORRADOR' | 'ABIERTO' | 'CERRADO' | 'CANCELADO';
  price: number; capacity: number | null; remainingSeats: number | null;
  requiresPayment: boolean; location: string; instructors: string[];
  includes: string; certificate: boolean; image: string | null;
  dateMode: 'INDEPENDIENTES' | 'CONJUNTAS';
  dates: { id: string; date: string; schedule: string | null }[];
}
export interface CatalogResponse { events: CatalogEvent[] }
export interface FreeEnrollmentRequest {
  eventId: string;
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
  payerRut: string;
  bankName: string;
  accountNumber: string;
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