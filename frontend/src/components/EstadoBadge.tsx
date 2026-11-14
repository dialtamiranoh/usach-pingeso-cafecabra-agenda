// Badge de estado reutilizable (sin íconos). Mapea cada estado del sistema a un color
// semántico. Cubre estados de reserva, de evento, de pago y activo/inactivo. Acepta tanto
// la forma canónica ("Confirmado") como la cruda ("CONFIRMADO", "EN_ESPERA").
//
// Uso:  <EstadoBadge estado={row.estado} />
//       <EstadoBadge estado="Reservado" />
//       <EstadoBadge estado="Interno" tono="info" />   // override cuando no está en el mapa

export type EstadoTono = 'exito' | 'acento' | 'info' | 'neutral' | 'peligro';

const CLASE: Record<EstadoTono, string> = {
  exito: 'bg-[#e7f4ea] text-[#1a7f37]',   // verde: confirmado / abierto / activo
  acento: 'bg-[#fdf3c9] text-[#7a6200]',  // amarillo marca: en curso / pendiente
  info: 'bg-[#e6effc] text-[#1d4ed8]',    // azul: en espera
  neutral: 'bg-[#eceae4] text-[#8a8378]', // gris: borrador / cerrado / expirado / inactivo
  peligro: 'bg-[#fbeae9] text-[#b3261e]', // rojo: cancelado
};

// Clave normalizada -> tono. Las claves van sin tildes, sin espacios ni guiones, en mayúscula.
const MAPA: Record<string, EstadoTono> = {
  // Reservas / pagos
  CONFIRMADO: 'exito', CONCILIADO: 'exito', PAGADO: 'exito',
  RESERVADO: 'acento', PENDIENTE: 'acento',
  ENESPERA: 'info',
  EXPIRADO: 'neutral',
  CANCELADO: 'peligro',
  // Eventos
  ABIERTO: 'exito',
  BORRADOR: 'neutral', CERRADO: 'neutral',
  // Activo / inactivo
  ACTIVO: 'exito', INACTIVO: 'neutral',
};

function normalizar(estado: string): string {
  return estado.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

export function EstadoBadge({ estado, tono, label }: { estado: string; tono?: EstadoTono; label?: string }) {
  const t = tono ?? MAPA[normalizar(estado)] ?? 'neutral';
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CLASE[t]}`}>
      {label ?? estado}
    </span>
  );
}