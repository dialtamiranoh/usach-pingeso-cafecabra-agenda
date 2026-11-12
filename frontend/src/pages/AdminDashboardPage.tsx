import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChartConfiguration } from 'chart.js/auto';
import { useAdminPanel, formatFechaEvento, formatFechaInscripcion, formatMonto } from '../features/admin/useAdminPanel';
import { ChartCanvas } from '../features/admin/ChartCanvas';

// Panel de administración. Portado del template analytics-dashboard de HyperUI
// (sidebar colapsable, tarjetas, gráfico de línea, dona y tabla) con Chart.js,
// adaptado a la paleta negro / blanco / #e6bb08 y a los datos reales de /api/admin/panel.

const NAV = [
  { key: 'panel', label: 'Panel' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'inscritos', label: 'Inscritos' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'mantenedores', label: 'Mantenedores' },
  { key: 'configuracion', label: 'Configuración' },
];

// Colores de la dona por estado de reserva.
const COLORES_ESTADO: Record<string, string> = {
  Confirmado: '#111111', Reservado: '#e6bb08', Expirado: '#d4d4d4', 'En espera': '#9a9a9a', Cancelado: '#8a8378',
};

function estadoClase(estado: string): string {
  if (estado === 'Confirmado' || estado === 'Abierto') return 'bg-[#fdf3c9] text-[#7a6200]';
  if (estado === 'Reservado' || estado === 'En espera') return 'bg-[#f1f1ef] text-[#555]';
  return 'bg-[#eceae4] text-[#8a8378]';
}

function detalleEventos(cursos: number, catas: number): string {
  const partes: string[] = [];
  if (cursos > 0) partes.push(`${cursos} ${cursos === 1 ? 'curso' : 'cursos'}`);
  if (catas > 0) partes.push(`${catas} ${catas === 1 ? 'cata' : 'catas'}`);
  return partes.length ? partes.join(', ') : 'Sin eventos activos';
}

export function AdminDashboardPage({ email, onLogout }: { email?: string | null; onLogout?: () => void } = {}) {
  const [active, setActive] = useState('panel');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data, loading, error, retry } = useAdminPanel();

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
          <span className="grid h-12 place-content-center rounded-lg bg-[#111111] text-sm font-bold tracking-[0.18em] uppercase text-white">Café Cabra</span>
          <nav aria-label="Panel" className="mt-4">
            <ul className="space-y-1">
              {NAV.map(item => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => { setActive(item.key); setSidebarOpen(false); }}
                    className={`block w-full text-left rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      active === item.key
                        ? 'border-s-2 border-[#e6bb08] bg-[#f5f5f4] text-[#111111]'
                        : 'text-[#6b6b6b] hover:bg-[#f5f5f4] hover:text-[#111111]'
                    }`}
                  >
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
            <h1 className="text-lg font-semibold text-[#111111]">Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-[#6b6b6b]">{email ?? 'Administrador'}</span>
            {onLogout && (
              <button type="button" onClick={onLogout} className="rounded-md bg-[#111111] px-4 py-2 text-sm font-medium text-white transition hover:bg-black">
                Cerrar sesión
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 space-y-6 p-6">
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
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClase(row.estado)}`}>{row.estado}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[#6b6b6b]">{formatFechaInscripcion(row.creadoEn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>}
        </main>
      </div>
    </div>
  );
}