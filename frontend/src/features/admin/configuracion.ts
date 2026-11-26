// Mantenedor de configuración de negocio (RF-31 / RN-29): lee y guarda claves de la tabla
// configuracion sin tocar código. Los campos se agrupan por tema para la pantalla.

export interface CampoConfig {
  clave: string;
  label: string;
  tipo: 'text' | 'email' | 'numero' | 'banco' | 'tipoCuenta';
  ayuda?: string;
  placeholder?: string;
}

export interface GrupoConfig {
  titulo: string;
  descripcion: string;
  campos: CampoConfig[];
}

export const GRUPOS_CONFIG: GrupoConfig[] = [
  {
    titulo: 'Cuenta de transferencia',
    descripcion: 'Datos que se muestran al inscrito para que realice el pago por transferencia.',
    campos: [
      { clave: 'pago:titular', label: 'Titular de la cuenta', tipo: 'text', placeholder: 'CAFE CABRA SpA' },
      { clave: 'pago:rut', label: 'RUT del titular', tipo: 'text', placeholder: '77.144.117-3' },
      { clave: 'pago:banco', label: 'Banco', tipo: 'banco' },
      { clave: 'pago:tipo_cuenta', label: 'Tipo de cuenta', tipo: 'tipoCuenta' },
      { clave: 'pago:numero_cuenta', label: 'Número de cuenta', tipo: 'text', placeholder: '1188100117' },
      { clave: 'pago:correo_notificacion', label: 'Correo para el aviso de transferencia', tipo: 'email', placeholder: 'pagos@cafecabra.cl' },
    ],
  },
  {
    titulo: 'Vencimiento de solicitudes',
    descripcion: 'Tiempo que una reserva espera el pago antes de expirar y liberar el cupo.',
    campos: [
      { clave: 'pago:plazo_horas', label: 'Plazo de pago (horas)', tipo: 'numero', ayuda: 'Entre 1 y 168 horas (7 días).', placeholder: '12' },
    ],
  },
  {
    titulo: 'Notificaciones',
    descripcion: 'Correo que recibe el aviso cuando llega una nueva inscripción.',
    campos: [
      { clave: 'notificaciones:admin_email', label: 'Correo del administrador', tipo: 'email', placeholder: 'admin@cafecabra.cl' },
    ],
  },
];

export interface ConfigResponse {
  valores: Record<string, string>;
  entorno: string;
}

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { credentials: 'include', ...options });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? 'No se pudo completar la operación.');
  return body;
}

export function leerConfiguracion() {
  return api<ConfigResponse>('/api/admin/mantenedores/configuracion');
}

export function guardarConfiguracion(valores: Record<string, string>) {
  return api<ConfigResponse>('/api/admin/mantenedores/configuracion', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valores }),
  });
}