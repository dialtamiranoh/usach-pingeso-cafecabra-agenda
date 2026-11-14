import { useCallback, useEffect, useState } from 'react';
import { FaArrowRightLong } from 'react-icons/fa6';
import { EstadoBadge } from '../components/EstadoBadge';
import { ActionButton } from '../components/ActionButton';

import {
  MANTENEDORES, type TipoMantenedor, type Registro,
  listarMantenedor, crearMantenedor, actualizarMantenedor,
} from '../features/admin/mantenedores';

// Pantalla de mantenedores (RF-31): una pestaña por catálogo, con CRUD y baja lógica.
export function MantenedoresPage() {
  const [tipoActivo, setTipoActivo] = useState<TipoMantenedor>('ubicaciones');
  const def = MANTENEDORES.find(m => m.tipo === tipoActivo)!;

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [formAbierto, setFormAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [valores, setValores] = useState<Record<string, string | boolean>>({});
  const [guardando, setGuardando] = useState(false);
  const [errorForm, setErrorForm] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setRegistros(await listarMantenedor(tipoActivo));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar.');
    } finally {
      setCargando(false);
    }
  }, [tipoActivo]);

  useEffect(() => { cargar(); setFormAbierto(false); }, [cargar]);

  function abrirNuevo() {
    const inicial: Record<string, string | boolean> = {};
    for (const campo of def.campos) inicial[campo.clave] = campo.tipo === 'bool' ? false : '';
    setValores(inicial);
    setEditId(null);
    setErrorForm('');
    setFormAbierto(true);
  }

  function abrirEdicion(row: Registro) {
    const inicial: Record<string, string | boolean> = {};
    for (const campo of def.campos) {
      inicial[campo.clave] = campo.tipo === 'bool' ? Boolean(row[campo.clave]) : String(row[campo.clave] ?? '');
    }
    setValores(inicial);
    setEditId(row.id);
    setErrorForm('');
    setFormAbierto(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm('');
    setGuardando(true);
    try {
      if (editId === null) await crearMantenedor(tipoActivo, valores);
      else await actualizarMantenedor(tipoActivo, editId, valores);
      setFormAbierto(false);
      await cargar();
    } catch (err) {
      setErrorForm(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function alternarActivo(row: Registro) {
    try {
      await actualizarMantenedor(tipoActivo, row.id, { activo: !row.activo });
      await cargar();
    } catch { /* se mantiene el estado anterior */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-[#111111]">Mantenedores</h1>
        <p className="text-sm text-[#6b6b6b]">Catálogos que alimentan la creación de eventos. La baja es lógica: no se eliminan, se desactivan.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-[#e5e5e5]">
        {MANTENEDORES.map(m => (
          <button
            key={m.tipo}
            type="button"
            onClick={() => setTipoActivo(m.tipo)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tipoActivo === m.tipo ? 'border-[#e6bb08] text-[#111111]' : 'border-transparent text-[#6b6b6b] hover:text-[#111111]'
            }`}
          >
            {m.titulo}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#111111]">{def.titulo}</h2>
        <ActionButton variant="crear" label={`Nueva ${def.singular}`} onClick={abrirNuevo} />
      </div>

      {formAbierto && (
        <form onSubmit={guardar} className="space-y-4 rounded-lg border border-[#e5e5e5] bg-white p-6">
          <h3 className="text-sm font-semibold text-[#111111]">{editId === null ? `Nueva ${def.singular}` : `Editar ${def.singular}`}</h3>
          {def.campos.map(campo => (
            <div key={campo.clave}>
              {campo.tipo === 'bool' ? (
                <label className="flex items-center gap-2 text-sm text-[#111111]">
                  <input type="checkbox" checked={Boolean(valores[campo.clave])} onChange={e => setValores(v => ({ ...v, [campo.clave]: e.target.checked }))} />
                  {campo.label}
                </label>
              ) : (
                <>
                  <label className="block text-sm font-medium text-[#111111]" htmlFor={`campo-${campo.clave}`}>
                    {campo.label} {campo.requerido ? '*' : <span className="text-[#9a9a9a]">(opcional)</span>}
                  </label>
                  {campo.tipo === 'textarea' ? (
                    <textarea id={`campo-${campo.clave}`} rows={3} value={String(valores[campo.clave] ?? '')}
                      onChange={e => setValores(v => ({ ...v, [campo.clave]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none" />
                  ) : (
                    <input id={`campo-${campo.clave}`} type="text" value={String(valores[campo.clave] ?? '')}
                      onChange={e => setValores(v => ({ ...v, [campo.clave]: e.target.value }))}
                      className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm focus:border-[#111111] focus:outline-none" />
                  )}
                </>
              )}
            </div>
          ))}
          {errorForm && <p className="text-sm text-[#b3261e]" role="alert">{errorForm}</p>}
          <div className="flex gap-2">
            <ActionButton variant="guardar" type="submit" loading={guardando} />
            <ActionButton variant="cancelar" onClick={() => setFormAbierto(false)} />
          </div>
        </form>
      )}

      <div className="rounded-lg border border-[#e5e5e5] bg-white p-6">
        {cargando && <p className="text-sm text-[#6b6b6b]">Cargando...</p>}
        {error && !cargando && <p className="text-sm text-[#b3261e]" role="alert">{error}</p>}
        {!cargando && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-[#e5e5e5] text-sm">
              <thead className="text-left">
                <tr className="*:font-medium *:text-[#111111]">
                  {def.campos.map(campo => <th key={campo.clave} className="px-3 py-2 whitespace-nowrap">{campo.label}</th>)}
                  <th className="px-3 py-2 whitespace-nowrap">Estado</th>
                  <th className="px-3 py-2 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {registros.length === 0 ? (
                  <tr><td colSpan={def.campos.length + 2} className="px-3 py-6 text-center text-[#9a9a9a]">Sin registros.</td></tr>
                ) : registros.map(row => (
                  <tr key={row.id} className={row.activo ? '' : 'opacity-60'}>
                    {def.campos.map(campo => (
                      <td key={campo.clave} className="px-3 py-2 align-top text-[#111111]">
                        {campo.tipo === 'bool' ? (row[campo.clave] ? 'Sí' : 'No') : (String(row[campo.clave] ?? '') || '-')}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <EstadoBadge estado={row.activo ? 'Activo' : 'Inactivo'} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex gap-3">
                        <ActionButton variant="editar" size="sm" onClick={() => abrirEdicion(row)} />
                        <ActionButton variant={row.activo ? 'desactivar' : 'activar'} size="sm" onClick={() => alternarActivo(row)} />
                      </div>
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