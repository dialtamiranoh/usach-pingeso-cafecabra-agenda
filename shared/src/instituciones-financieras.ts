// Catálogo de instituciones financieras desde las cuales el asistente puede realizar
// la transferencia (SCRUM-91).
//
// Este catálogo se utiliza en dos partes del sistema, primeramente en el frontend, donde
// alimenta las sugerencias (<datalist>) del campo "Banco de origen", y posteriormente en el
// backend, donde el texto recibido se normaliza al nombre canónico antes de ser guardado en
// reservas.banco_origen, ya que, la conciliación de pagos compara monto, banco y cuenta, por
// lo que se necesita que el banco quede registrado siempre de la misma forma y no con
// variantes como "bco estado" o "BancoEstado".
//
// El campo continúa aceptando texto libre, sin embargo, cuando la institución no se encuentra
// en el catálogo se guarda el texto tal como lo escribió el asistente, el cual queda sujeto a
// revisión manual por parte del administrador.
//
// Fuentes utilizadas para construir el listado, las cuales se deben revisar periódicamente:
//   - Bancos: listado de bancos establecidos en Chile (tasas.cl).
//   - Emisores no bancarios: registro de la CMF de Emisores de Tarjetas de Pago con Provisión
//     de Fondos no Bancarias, además de cooperativas y billeteras de uso común.

export type TipoInstitucionFinanciera = 'BANCO' | 'EMISOR_PREPAGO' | 'COOPERATIVA';

export interface InstitucionFinanciera {
  /** Nombre canónico, corresponde al valor que se muestra en la lista y al que se guarda en la base de datos. */
  nombre: string;
  tipo: TipoInstitucionFinanciera;
  /** Otras formas en que los asistentes suelen escribir la institución, como abreviaciones y nombres antiguos, entre otros. */
  alias: readonly string[];
}

export const INSTITUCIONES_FINANCIERAS: readonly InstitucionFinanciera[] = [
  // Bancos
  { nombre: 'BancoEstado', tipo: 'BANCO', alias: ['Banco del Estado', 'Banco del Estado de Chile', 'Banco Estado', 'Cuenta RUT', 'CuentaRUT'] },
  { nombre: 'Banco de Chile', tipo: 'BANCO', alias: ['Banchile', 'Banco Edwards', 'Banco Edwards Citi', 'Banco CrediChile'] },
  { nombre: 'Banco Santander', tipo: 'BANCO', alias: ['Santander', 'Banco Santander-Chile', 'Santander Chile'] },
  { nombre: 'BCI', tipo: 'BANCO', alias: ['Banco BCI', 'Banco de Crédito e Inversiones', 'Bci', 'Banco Nova'] },
  { nombre: 'Scotiabank', tipo: 'BANCO', alias: ['Scotiabank Chile', 'Banco Scotiabank', 'Scotia'] },
  { nombre: 'Banco Itaú', tipo: 'BANCO', alias: ['Itaú', 'Itau', 'Banco Itau', 'Banco Itaú Chile', 'Itaú Corpbanca', 'Corpbanca'] },
  { nombre: 'Banco BICE', tipo: 'BANCO', alias: ['BICE', 'Bice'] },
  { nombre: 'Banco Security', tipo: 'BANCO', alias: ['Security'] },
  { nombre: 'Banco Falabella', tipo: 'BANCO', alias: ['Falabella'] },
  { nombre: 'Banco Ripley', tipo: 'BANCO', alias: ['Ripley'] },
  { nombre: 'Banco Consorcio', tipo: 'BANCO', alias: ['Consorcio'] },
  { nombre: 'Banco Internacional', tipo: 'BANCO', alias: ['Internacional'] },
  { nombre: 'Tenpo Bank', tipo: 'BANCO', alias: ['Tenpo', 'Tenpo Bank Chile', 'Tenpo Payments'] },
  { nombre: 'Tanner Banco Digital', tipo: 'BANCO', alias: ['Tanner'] },
  { nombre: 'Banco BTG Pactual', tipo: 'BANCO', alias: ['BTG', 'BTG Pactual'] },
  { nombre: 'HSBC Bank Chile', tipo: 'BANCO', alias: ['HSBC'] },
  { nombre: 'JP Morgan Chase Bank', tipo: 'BANCO', alias: ['JP Morgan', 'JPMorgan'] },
  { nombre: 'Bank of China', tipo: 'BANCO', alias: ['Bank of China Agencia en Chile'] },
  { nombre: 'China Construction Bank', tipo: 'BANCO', alias: ['China Construction Bank Agencia en Chile', 'CCB'] },

  // Emisores de prepago y billeteras digitales
  { nombre: 'Mercado Pago', tipo: 'EMISOR_PREPAGO', alias: ['MercadoPago', 'Mercado Pago Emisora'] },
  { nombre: 'MACH', tipo: 'EMISOR_PREPAGO', alias: ['Mach', 'Cuenta MACH'] },
  { nombre: 'Copec Pay', tipo: 'EMISOR_PREPAGO', alias: ['CopecPay', 'Copec'] },
  { nombre: 'Tapp', tipo: 'EMISOR_PREPAGO', alias: ['Tapp Caja Los Andes', 'Caja Los Andes', 'Los Andes Tarjetas de Prepago'] },
  { nombre: 'Prepago Los Héroes', tipo: 'EMISOR_PREPAGO', alias: ['Los Héroes', 'Los Heroes', 'Caja Los Héroes'] },
  { nombre: 'Global66', tipo: 'EMISOR_PREPAGO', alias: ['Global 66', 'Global Card'] },
  { nombre: 'SumUp', tipo: 'EMISOR_PREPAGO', alias: ['Sum Up', 'SumUp Chile'] },

  // Cooperativas
  { nombre: 'Coopeuch', tipo: 'COOPERATIVA', alias: ['Cuenta Vista Coopeuch'] },
];

/**
 * Genera la clave con la cual se compara el texto, para esto se pasa a minúsculas, se
 * eliminan las tildes, los puntos, los guiones y los espacios repetidos, y finalmente se
 * reemplaza la abreviación "bco" por "banco".
 */
function claveDeComparacion(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^bco\b/, 'banco');
}

// Índice que relaciona cada clave con su nombre canónico, el cual se construye una sola vez
// al momento de cargar el módulo.
const nombreCanonicoPorClave = new Map<string, string>();
for (const institucion of INSTITUCIONES_FINANCIERAS) {
  nombreCanonicoPorClave.set(claveDeComparacion(institucion.nombre), institucion.nombre);
  for (const alias of institucion.alias) {
    nombreCanonicoPorClave.set(claveDeComparacion(alias), institucion.nombre);
  }
}

/**
 * Entrega el nombre canónico cuando el texto corresponde a una institución del catálogo, ya
 * sea por su nombre o por alguno de sus alias, sin considerar mayúsculas ni tildes. En caso de
 * no reconocer la institución, se entrega el texto original sin espacios al inicio ni al final.
 */
export function normalizarInstitucionFinanciera(texto: string): string {
  const recortado = texto.trim();
  return nombreCanonicoPorClave.get(claveDeComparacion(recortado)) ?? recortado;
}
