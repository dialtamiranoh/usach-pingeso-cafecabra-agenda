// Catálogo de tipos de cuenta desde los cuales el asistente puede realizar la transferencia.
//
// Se usa en el frontend para precargar la lista desplegable del campo "Tipo de cuenta" y en el
// backend para normalizar el texto recibido al nombre canónico antes de guardarlo. A diferencia
// del banco de origen, el tipo de cuenta no participa en la conciliación de pagos (que compara
// monto, banco y cuenta), por lo que se registra solo como dato informativo para el administrador.

export interface TipoCuenta {
  /** Nombre canónico, corresponde al valor que se muestra en la lista y al que se guarda. */
  nombre: string;
  /** Otras formas en que los asistentes suelen escribir el tipo de cuenta. */
  alias: readonly string[];
}

export const TIPOS_CUENTA: readonly TipoCuenta[] = [
  { nombre: 'Cuenta Corriente', alias: ['Corriente', 'Cta Corriente', 'Cuenta cte', 'Cte'] },
  { nombre: 'Cuenta Vista', alias: ['Vista', 'Cuenta a la Vista', 'Chequera Electrónica', 'Chequera Electronica'] },
  { nombre: 'Cuenta de Ahorro', alias: ['Ahorro', 'Cuenta Ahorro', 'Libreta de Ahorro'] },
  { nombre: 'Cuenta RUT', alias: ['CuentaRUT', 'Cuenta Rut', 'RUT'] },
  { nombre: 'Cuenta de Prepago', alias: ['Prepago', 'Billetera', 'Billetera Digital', 'Tarjeta de Prepago'] },
];

// Normaliza el texto a una clave comparable, sin tildes, puntos ni mayúsculas.
export function claveDeComparacionCuenta(texto: string): string {
  return texto
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Devuelve el nombre canónico del catálogo cuando se reconoce el tipo de cuenta por su nombre o
// alias. Si no se encuentra, devuelve el texto recortado tal como lo escribió el asistente.
export function normalizarTipoCuenta(texto: string): string {
  const clave = claveDeComparacionCuenta(texto);
  if (!clave) return '';
  for (const tipo of TIPOS_CUENTA) {
    if (claveDeComparacionCuenta(tipo.nombre) === clave) return tipo.nombre;
    if (tipo.alias.some(alias => claveDeComparacionCuenta(alias) === clave)) return tipo.nombre;
  }
  return texto.trim();
}