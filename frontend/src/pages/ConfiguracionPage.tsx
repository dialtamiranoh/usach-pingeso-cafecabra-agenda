import { useEffect, useState } from 'react';
import { TIPOS_CUENTA, INSTITUCIONES_FINANCIERAS, type TipoInstitucionFinanciera } from '@cafecabra/shared';
import { GRUPOS_CONFIG, leerConfiguracion, guardarConfiguracion } from '../features/admin/configuracion';
import { ActionButton } from '../components/ActionButton';
import { EstadoBadge } from '../components/EstadoBadge';

const CAMPO = 'mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none';

// Mismos grupos de bancos que usa la inscripción con pago.
const GRUPOS_BANCO: { tipo: TipoInstitucionFinanciera; etiqueta: string }[] = [
  { tipo: 'BANCO', etiqueta: 'Bancos' },
  { tipo: 'EMISOR_PREPAGO', etiqueta: 'Billeteras y prepago' },
  { tipo: 'COOPERATIVA', etiqueta: 'Cooperativas' },
];

// Mantenedor de configuración de negocio: cuenta de transferencia, vencimiento de
// solicitudes y correo de notificación. Un solo formulario, guardado atómico.
export function ConfiguracionPage() {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [entorno, setEntorno] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  useEffect(() => {
    leerConfiguracion()
      .then(r => { setValores(r.valores); setEntorno(r.entorno); })
      .catch(e => setError(e instanceof Error ? e.message : 'No se pudo cargar la configuración.'))
      .finally(() => setCargando(false));
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setOk(''); setGuardando(true);
    try {
      const r = await guardarConfiguracion(valores);
      setValores(r.valores); setEntorno(r.entorno);
      setOk('Configuración guardada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  const set = (clave: string, valor: string) => setValores(prev => ({ ...prev, [clave]: valor }));
  const esProd = entorno === 'production';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[#111111]">Configuración</h1>
          <p className="text-sm text-[#6b6b6b]">Parámetros de negocio editables sin tocar código.</p>
        </div>
        {entorno && <EstadoBadge estado={esProd ? 'Producción' : 'Desarrollo'} tono={esProd ? 'peligro' : 'info'} />}
      </div>

      {cargando && <p className="text-sm text-[#6b6b6b]">Cargando configuración...</p>}
      {error && cargando && <p className="text-sm text-[#b3261e]" role="alert">{error}</p>}

      {!cargando && (
        <form onSubmit={guardar} className="space-y-6">
          {GRUPOS_CONFIG.map(grupo => (
            <section key={grupo.titulo} className="rounded-lg border border-[#e5e5e5] bg-white p-6">
              <h2 className="text-sm font-semibold text-[#111111]">{grupo.titulo}</h2>
              <p className="mt-0.5 text-sm text-[#6b6b6b]">{grupo.descripcion}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {grupo.campos.map(campo => (
                  <div key={campo.clave}>
                    <label className="block text-sm font-medium text-[#111111]" htmlFor={campo.clave}>{campo.label}</label>
                    {campo.tipo === 'banco' ? (
                      // Mismo catálogo de bancos que la inscripción con pago (INSTITUCIONES_FINANCIERAS).
                      <select id={campo.clave} className={CAMPO} value={valores[campo.clave] ?? ''} onChange={e => set(campo.clave, e.target.value)}>
                        <option value="">Selecciona una opción</option>
                        {GRUPOS_BANCO.map(grupoBanco => (
                          <optgroup key={grupoBanco.tipo} label={grupoBanco.etiqueta}>
                            {INSTITUCIONES_FINANCIERAS.filter(i => i.tipo === grupoBanco.tipo).map(i => (
                              <option key={i.nombre} value={i.nombre}>{i.nombre}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : campo.tipo === 'tipoCuenta' ? (
                      // Mismo catálogo de tipos de cuenta que la inscripción con pago (TIPOS_CUENTA).
                      <select id={campo.clave} className={CAMPO} value={valores[campo.clave] ?? ''} onChange={e => set(campo.clave, e.target.value)}>
                        <option value="">Selecciona una opción</option>
                        {TIPOS_CUENTA.map(tipo => <option key={tipo.nombre} value={tipo.nombre}>{tipo.nombre}</option>)}
                      </select>
                    ) : (
                      <input
                        id={campo.clave}
                        className={CAMPO}
                        type={campo.tipo === 'email' ? 'email' : campo.tipo === 'numero' ? 'number' : 'text'}
                        inputMode={campo.tipo === 'numero' ? 'numeric' : undefined}
                        min={campo.tipo === 'numero' ? 1 : undefined}
                        max={campo.tipo === 'numero' ? 168 : undefined}
                        value={valores[campo.clave] ?? ''}
                        placeholder={campo.placeholder}
                        onChange={e => set(campo.clave, e.target.value)}
                      />
                    )}
                    {campo.ayuda && <p className="mt-1 text-xs text-[#9a9a9a]">{campo.ayuda}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}

          {ok && <p className="text-sm text-[#1a7f37]" role="status">{ok}</p>}
          {error && <p className="text-sm text-[#b3261e]" role="alert">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton variant="guardar" type="submit" loading={guardando} />
            {esProd && <p className="text-xs text-[#b3261e]">Estás editando la configuración de producción.</p>}
          </div>
        </form>
      )}
    </div>
  );
}