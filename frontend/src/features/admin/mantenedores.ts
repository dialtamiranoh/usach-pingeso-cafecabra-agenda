// Configuración y acceso a los mantenedores (RF-31). Cada mantenedor comparte el mismo
// patrón de CRUD, por lo que se describe con metadatos y se renderiza de forma genérica.

export type TipoMantenedor = 'ubicaciones' | 'tipos-evento' | 'instructores' | 'opciones';

export interface CampoDef {
  clave: string;
  label: string;
  tipo: 'texto' | 'textarea' | 'bool';
  requerido?: boolean;
}

export interface MantenedorDef {
  tipo: TipoMantenedor;
  titulo: string;
  singular: string;
  campos: CampoDef[];
}

export const MANTENEDORES: MantenedorDef[] = [
  {
    tipo: 'ubicaciones', titulo: 'Ubicaciones', singular: 'ubicación',
    campos: [
      { clave: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
      { clave: 'direccion', label: 'Dirección', tipo: 'texto' },
      { clave: 'referencia', label: 'Referencia', tipo: 'texto' },
    ],
  },
  {
    tipo: 'instructores', titulo: 'Instructores', singular: 'instructor',
    campos: [
      { clave: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
      { clave: 'email', label: 'Correo', tipo: 'texto' },
      { clave: 'fotoUrl', label: 'URL de foto', tipo: 'texto' },
      { clave: 'bio', label: 'Biografía', tipo: 'textarea' },
    ],
  },
  {
    tipo: 'opciones', titulo: 'Opciones alimentarias', singular: 'opción',
    campos: [
      { clave: 'nombre', label: 'Nombre', tipo: 'texto', requerido: true },
    ],
  },
];

// Un registro de mantenedor: siempre trae id y activo, más sus campos propios.
export interface Registro {
  id: number;
  activo: boolean;
  [clave: string]: unknown;
}

async function parseError(res: Response): Promise<string> {
  try { const b = await res.json(); return b?.error ?? 'Ocurrió un error.'; } catch { return 'Ocurrió un error.'; }
}

export async function listarMantenedor(tipo: TipoMantenedor): Promise<Registro[]> {
  const res = await fetch(`/api/admin/mantenedores/${tipo}`, { credentials: 'include' });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function crearMantenedor(tipo: TipoMantenedor, datos: Record<string, unknown>): Promise<Registro> {
  const res = await fetch(`/api/admin/mantenedores/${tipo}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function actualizarMantenedor(tipo: TipoMantenedor, id: number, datos: Record<string, unknown>): Promise<Registro> {
  const res = await fetch(`/api/admin/mantenedores/${tipo}/${id}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}