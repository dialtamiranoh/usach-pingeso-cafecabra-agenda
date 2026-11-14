import { AdminEnrollments } from '../features/admin/AdminEnrollments';
import { useRealtime } from '../features/admin/useRealtime';
import { EstadoBadge } from '../components/EstadoBadge';
import { ActionButton } from '../components/ActionButton';

interface Notificacion { id: number; texto: string; ts: number; }

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChartConfiguration } from 'chart.js/auto';
import { useAdminPanel, formatFechaEvento, formatFechaInscripcion, formatMonto } from '../features/admin/useAdminPanel';
import { ChartCanvas } from '../features/admin/ChartCanvas';
import { MantenedoresPage } from './MantenedoresPage';
import { FaGauge, FaCalendarDays, FaUsers, FaMoneyBillTransfer, FaSliders, FaGear } from 'react-icons/fa6';

// Panel de administración. Portado del template analytics-dashboard de HyperUI
// (sidebar colapsable, tarjetas, gráfico de línea, dona y tabla) con Chart.js,
// adaptado a la paleta negro / blanco / #e6bb08 y a los datos reales de /api/admin/panel.

const NAV = [
  { key: 'panel', label: 'Panel', Icon: FaGauge },
  { key: 'eventos', label: 'Eventos', Icon: FaCalendarDays },
  { key: 'inscritos', label: 'Inscritos', Icon: FaUsers },
  { key: 'pagos', label: 'Pagos', Icon: FaMoneyBillTransfer },
  { key: 'mantenedores', label: 'Mantenedores', Icon: FaSliders },
  { key: 'configuracion', label: 'Configuración', Icon: FaGear },
];

// Colores de la dona por estado de reserva.
const COLORES_ESTADO: Record<string, string> = {
  Confirmado: '#111111', Reservado: '#e6bb08', Expirado: '#d4d4d4', 'En espera': '#9a9a9a', Cancelado: '#8a8378',
};

// function estadoClase(estado: string): string {
//   if (estado === 'Confirmado' || estado === 'Abierto') return 'bg-[#fdf3c9] text-[#7a6200]';
//   if (estado === 'Reservado' || estado === 'En espera') return 'bg-[#f1f1ef] text-[#555]';
//   return 'bg-[#eceae4] text-[#8a8378]';
// }



function detalleEventos(cursos: number, catas: number): string {
  const partes: string[] = [];
  if (cursos > 0) partes.push(`${cursos} ${cursos === 1 ? 'curso' : 'cursos'}`);
  if (catas > 0) partes.push(`${catas} ${catas === 1 ? 'cata' : 'catas'}`);
  return partes.length ? partes.join(', ') : 'Sin eventos activos';
}

export function AdminDashboardPage({ email, onLogout }: { email?: string | null; onLogout?: () => void } = {}) {
  const [active, setActive] = useState('panel');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inscritosVersion, setInscritosVersion] = useState(0);
  const { data, loading, error, retry } = useAdminPanel();

    // Campanita y tiempo real.
  const [notis, setNotis] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [campanitaAbierta, setCampanitaAbierta] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useRealtime(evento => {
    // Cualquier evento refresca los datos del panel en vivo.
    retry();
    setInscritosVersion(value => value + 1);
    if (evento.tipo === 'RESERVA_NUEVA') {
      const texto = `Nueva inscripción${evento.detalle ? `: ${evento.detalle}` : ''}${evento.titulo ? ` en ${evento.titulo}` : ''}`;
      setNotis(prev => [{ id: evento.ts, texto, ts: evento.ts }, ...prev].slice(0, 20));
      setNoLeidas(n => n + 1);
      setToast(texto);
      window.setTimeout(() => setToast(null), 5000);
    }
  });

  const semanaLabels = data ? data.inscripcionesPorSemana.map(s => s.label) : [];
  const semanaValores = data ? data.inscripcionesPorSemana.map(s => s.valor) : [];

  // Sparkline de la tarjeta de monto (inscripciones por semana, sin ejes).
  const sparklineConfig = useMemo<ChartConfiguration>(() => ({
    type: 'line',
    data: { labels: semanaLabels, datasets: [{ data: semanaValores, borderColor: '#e6bb08', borderWidth: 2, pointRadius: 0, tension: 0.35, fill: false }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } } },
  }), [semanaLabels.join(), semanaValores.join()]);

  // Gráfico de línea principal: inscripciones por semana.
  const lineConfig = useMemo<ChartConfiguration>(() => ({
    type: 'line',
    data: { labels: semanaLabels, datasets: [{ label: 'Inscripciones', data: semanaValores, borderColor: '#111111', backgroundColor: 'rgba(17,17,17,0.08)', borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, pointHoverBackgroundColor: '#111111', pointHoverBorderColor: '#ffffff', pointHoverBorderWidth: 2, tension: 0.35, fill: true }] },
    options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: '#6b6b6b' } }, y: { beginAtZero: true, grid: { color: '#eeeeee' }, ticks: { color: '#6b6b6b', precision: 0 } } } },
  }), [semanaLabels.join(), semanaValores.join()]);

  // Dona: reservas por estado.
  const estadoLabels = data ? data.reservasPorEstado.map(e => e.label) : [];
  const estadoValores = data ? data.reservasPorEstado.map(e => e.valor) : [];
  const donutConfig = useMemo<ChartConfiguration>(() => ({
    type: 'doughnut',
    data: { labels: estadoLabels, datasets: [{ data: estadoValores, backgroundColor: estadoLabels.map(l => COLORES_ESTADO[l] ?? '#cccccc'), borderColor: '#ffffff', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#6b6b6b' } } } },
  }), [estadoLabels.join(), estadoValores.join()]);

  const stats = data ? [
    { label: 'Monto reservado del mes', value: formatMonto(data.stats.montoReservadoMes), hint: 'Reservas activas, sin conciliar', spark: true },
    { label: 'Inscritos del mes', value: String(data.stats.inscritosMes), hint: 'Reservas activas del mes', spark: false },
    { label: 'Reservas pendientes', value: String(data.stats.reservasPendientes), hint: 'A la espera de pago', spark: false },
    { label: 'Eventos activos', value: String(data.stats.eventosActivos), hint: detalleEventos(data.stats.cursosActivos, data.stats.catasActivos), spark: false },
  ] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f5f4] text-[#111111] font-sans">
      {/* Overlay móvil */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 start-0 z-40 flex w-64 flex-col justify-between overflow-y-auto border-e border-[#e5e5e5] bg-white transition-transform duration-300 lg:static lg:shrink-0 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4">
            <span className="grid h-14 place-content-center rounded-lg bg-[#111111] px-3">
            <img src="/images/cafe-cabra-escuela-blanco.png" alt="Café Cabra Escuela" className="h-8 w-auto object-contain" />
          </span>
          <nav aria-label="Panel" className="mt-4">
            <ul className="space-y-1">
              {NAV.map(item => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => { setActive(item.key); setSidebarOpen(false); }}
                    className={`flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                      active === item.key
                        ? 'border-s-2 border-[#e6bb08] bg-[#f5f5f4] text-[#111111]'
                        : 'text-[#6b6b6b] hover:bg-[#f5f5f4] hover:text-[#111111]'
                    }`}
                  >
                    <item.Icon className="size-4 shrink-0" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="sticky inset-x-0 bottom-0 border-t border-[#e5e5e5]">
          <div className="flex items-center gap-2 bg-white p-4">
            <span className="size-10 rounded-full bg-[#111111] text-white grid place-items-center text-sm font-semibold">
              {(email ?? 'A').slice(0, 2).toUpperCase()}
            </span>
            <p className="text-xs text-[#111111] min-w-0">
              <strong className="block font-medium">Administrador</strong>
              <span className="block truncate text-[#6b6b6b]">{email ?? ''}</span>
            </p>
          </div>
                    <Link to="/" className="block border-t border-[#e5e5e5] p-4 text-xs text-[#6b6b6b] hover:bg-[#f5f5f4]">← Volver al sitio</Link>
          {onLogout && (
            <button type="button" onClick={onLogout} className="block w-full border-t border-[#e5e5e5] p-4 text-left text-xs font-medium text-[#6b6b6b] hover:bg-[#f5f5f4]">
              Cerrar sesión
            </button>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-[#e5e5e5] bg-white px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(v => !v)}
              className="cursor-pointer rounded-md p-2 text-[#6b6b6b] transition-colors hover:bg-[#f5f5f4] lg:hidden"
              aria-label="Abrir menú"
            >
              <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-[#111111]">{NAV.find(item => item.key === active)?.label ?? 'Panel'}</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Campanita */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setCampanitaAbierta(v => !v); setNoLeidas(0); }}
                className="relative rounded-md p-2 text-[#6b6b6b] transition-colors hover:bg-[#f5f5f4]"
                aria-label="Notificaciones"
              >
                <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {noLeidas > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-[#e6bb08] px-1 text-[10px] font-bold text-[#111111]">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </button>
              {campanitaAbierta && (
                <div className="absolute end-0 z-50 mt-2 w-72 rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
                  <div className="border-b border-[#e5e5e5] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#9a9a9a]">Notificaciones</div>
                  {notis.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-[#9a9a9a]">Sin notificaciones.</p>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-[#f3f3f1]">
                      {notis.map(n => (
                        <li key={n.id} className="px-4 py-3 text-sm">
                          <p className="text-[#111111]">{n.texto}</p>
                          <p className="mt-0.5 text-xs text-[#9a9a9a]">{formatFechaInscripcion(Math.floor(n.ts / 1000))}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <span className="hidden sm:inline text-sm text-[#6b6b6b]">{email ?? 'Administrador'}</span>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
          {active === 'mantenedores' ? <MantenedoresPage /> : active === 'inscritos' ? <AdminEnrollments refreshKey={inscritosVersion} onChanged={retry} /> : <>
          {loading && <p className="text-sm text-[#6b6b6b]">Cargando panel...</p>}

          {error && !loading && (
            <article className="rounded-lg border border-[#e5e5e5] bg-white p-6">
              <p className="text-sm text-[#b3261e]" role="alert">{error}</p>
              <button type="button" onClick={retry} className="mt-3 inline-block rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black">Reintentar</button>
            </article>
          )}

          {data && !loading && !error && <>
          {/* Tarjetas */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(stat => (
              <article key={stat.label} className="flex flex-col gap-4 rounded-lg border border-[#e5e5e5] bg-white p-6">
                <div>
                  <strong className="block text-sm font-medium text-[#6b6b6b]">{stat.label}</strong>
                  <p className="mt-1"><span className="text-2xl font-semibold text-[#111111] tabular-nums">{stat.value}</span></p>
                  <p className="mt-1 text-xs text-[#9a9a9a]">{stat.hint}</p>
                </div>
                {stat.spark && <div className="h-10"><ChartCanvas config={sparklineConfig} ariaLabel="Tendencia de inscripciones por semana" className="!h-10 !w-full" /></div>}
              </article>
            ))}
          </div>

          {/* Línea + dona */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-lg border border-[#e5e5e5] bg-white p-6 lg:col-span-2">
              <h2 className="text-sm font-medium text-[#111111]">Inscripciones por semana</h2>
              <div className="mt-4 h-64"><ChartCanvas config={lineConfig} ariaLabel="Gráfico de inscripciones por semana" className="!h-64 !w-full" /></div>
            </div>
            <div className="rounded-lg border border-[#e5e5e5] bg-white p-6">
              <h2 className="text-sm font-medium text-[#111111]">Reservas por estado</h2>
              {estadoValores.some(v => v > 0)
                ? <div className="mt-4 h-64"><ChartCanvas config={donutConfig} ariaLabel="Distribución de reservas por estado" className="!h-64 !w-full" /></div>
                : <p className="mt-4 text-sm text-[#9a9a9a]">Aún no hay reservas.</p>}
            </div>
          </div>

          {/* Tabla: últimas inscripciones */}
          <div className="rounded-lg border border-[#e5e5e5] bg-white p-6">
            <h2 className="text-sm font-medium text-[#111111]">Últimas inscripciones</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y-2 divide-[#e5e5e5] text-sm">
                <thead className="text-left">
                  <tr className="*:font-medium *:text-[#111111]">
                    <th className="px-3 py-2 whitespace-nowrap">Alumno</th>
                    <th className="px-3 py-2 whitespace-nowrap">Evento</th>
                    <th className="px-3 py-2 whitespace-nowrap">Estado</th>
                    <th className="px-3 py-2 whitespace-nowrap">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5]">
                  {data.inscripcionesRecientes.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-[#9a9a9a]">Aún no hay inscripciones.</td></tr>
                  ) : data.inscripcionesRecientes.map(row => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 whitespace-nowrap font-medium text-[#111111]">{row.alumno}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-[#6b6b6b]">{row.evento}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <EstadoBadge estado={row.estado} /></td>
                      <td className="px-3 py-2 whitespace-nowrap text-[#6b6b6b]">{formatFechaInscripcion(row.creadoEn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>}
          </>}
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-4 end-4 z-50 max-w-xs rounded-lg border border-[#e5e5e5] bg-white px-4 py-3 shadow-lg">
          <p className="text-sm font-medium text-[#111111]">{toast}</p>
        </div>
      )}
    </div>
  );
}
