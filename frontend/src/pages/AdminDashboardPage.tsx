import { useState } from 'react';
import { Link } from 'react-router-dom';

// Panel de administración (DUMMY). Estética minimalista estilo HyperUI.
// Paleta: negro, blanco y acento #e6bb08. Datos de ejemplo, sin funcionalidad real todavía.

const NAV = [
  { key: 'panel', label: 'Panel' },
  { key: 'eventos', label: 'Eventos' },
  { key: 'inscritos', label: 'Inscritos' },
  { key: 'pagos', label: 'Pagos' },
  { key: 'mantenedores', label: 'Mantenedores' },
  { key: 'configuracion', label: 'Configuración' },
];

const STATS = [
  { label: 'Eventos activos', value: '3', hint: '2 cursos, 1 cata' },
  { label: 'Inscritos del mes', value: '48', hint: '+12 vs. mes anterior' },
  { label: 'Reservas pendientes', value: '7', hint: 'A la espera de pago' },
  { label: 'Ingresos del mes', value: '$1.240.000', hint: 'Pagos conciliados' },
];

const PROXIMOS = [
  { evento: 'Máster Class de Latte Art', tipo: 'Curso', fecha: '12 nov 2026', cupos: '2 / 4', estado: 'Abierto' },
  { evento: 'Curso Barista Integral', tipo: 'Curso', fecha: '19 nov 2026', cupos: '5 / 8', estado: 'Abierto' },
  { evento: 'Cata de café de especialidad', tipo: 'Cata', fecha: '22 nov 2026', cupos: 'Sin límite', estado: 'Abierto' },
  { evento: 'Latte Art Personalizado', tipo: 'Curso', fecha: '28 nov 2026', cupos: '0 / 1', estado: 'Cerrado' },
];

const INSCRIPCIONES = [
  { alumno: 'Camila Rojas', evento: 'Máster Class de Latte Art', estado: 'Confirmado', fecha: 'Hoy, 11:20' },
  { alumno: 'Diego Soto', evento: 'Curso Barista Integral', estado: 'Reservado', fecha: 'Hoy, 09:05' },
  { alumno: 'Valentina Pérez', evento: 'Cata de café de especialidad', estado: 'Confirmado', fecha: 'Ayer, 18:42' },
  { alumno: 'Martín Fuentes', evento: 'Máster Class de Latte Art', estado: 'Expirado', fecha: 'Ayer, 14:10' },
];

const SEMANAS = [
  { label: 'Sem 1', valor: 60, acento: false },
  { label: 'Sem 2', valor: 45, acento: false },
  { label: 'Sem 3', valor: 80, acento: false },
  { label: 'Sem 4', valor: 100, acento: true },
];

function estadoClase(estado: string): string {
  if (estado === 'Confirmado' || estado === 'Abierto') return 'bg-[#fdf3c9] text-[#7a6200]';
  if (estado === 'Reservado') return 'bg-[#f1f1ef] text-[#555]';
  return 'bg-[#eceae4] text-[#8a8378]';
}

export function AdminDashboardPage() {
  const [active, setActive] = useState('panel');

  return (
    <div className="min-h-screen flex bg-[#f5f5f4] text-[#111111] font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-[#111111] text-white">
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-sm font-bold tracking-[0.18em] uppercase">Café Cabra</span>
        </div>
        <nav className="flex-1 px-2 py-5 space-y-1">
          {NAV.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
              className={`w-full text-left pl-3 pr-3 py-2 rounded text-sm border-l-[3px] transition-colors ${
                active === item.key
                  ? 'border-[#e6bb08] bg-white/5 text-white font-semibold'
                  : 'border-transparent text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-2 py-5 border-t border-white/10">
          <Link to="/" className="block px-3 py-2 rounded text-sm text-white/60 hover:bg-white/5 hover:text-white">
            ← Volver al sitio
          </Link>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 shrink-0 bg-white border-b border-[#e5e5e5] flex items-center justify-between px-5 sm:px-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#9a9a9a]">Administración</p>
            <h1 className="text-lg font-bold -mt-0.5">Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm text-[#6b6b6b]">diego.altamirano.h@usach.cl</span>
            <span className="h-9 w-9 rounded-full bg-[#111111] text-white grid place-items-center text-sm font-semibold">DA</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8">
          {/* Stat cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {STATS.map(stat => (
              <div key={stat.label} className="bg-white border border-[#e5e5e5] rounded-lg p-5">
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#9a9a9a]">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold tabular-nums">{stat.value}</p>
                <p className="mt-1 text-xs text-[#6b6b6b]">{stat.hint}</p>
              </div>
            ))}
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Próximos eventos */}
            <section className="lg:col-span-2 bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5]">
                <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Próximos eventos</h2>
                <button type="button" className="text-xs font-semibold text-[#111111] hover:underline">Ver todos</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#9a9a9a] border-b border-[#eeeeee]">
                      <th className="font-medium px-5 py-3">Evento</th>
                      <th className="font-medium px-5 py-3">Fecha</th>
                      <th className="font-medium px-5 py-3">Cupos</th>
                      <th className="font-medium px-5 py-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PROXIMOS.map(row => (
                      <tr key={row.evento} className="border-b border-[#f3f3f1] last:border-0">
                        <td className="px-5 py-3">
                          <span className="font-medium">{row.evento}</span>
                          <span className="block text-xs text-[#9a9a9a]">{row.tipo}</span>
                        </td>
                        <td className="px-5 py-3 text-[#6b6b6b] whitespace-nowrap">{row.fecha}</td>
                        <td className="px-5 py-3 text-[#6b6b6b] tabular-nums whitespace-nowrap">{row.cupos}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClase(row.estado)}`}>{row.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Inscripciones por semana (barras dummy) */}
            <section className="bg-white border border-[#e5e5e5] rounded-lg p-5">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Inscripciones por semana</h2>
              <div className="mt-6 flex items-end gap-4 h-40">
                {SEMANAS.map(col => (
                  <div key={col.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-[#efefec] rounded-t" style={{ height: `${col.valor}%` }}>
                      <div className={`w-full h-full rounded-t ${col.acento ? 'bg-[#e6bb08]' : 'bg-[#111111]'}`} />
                    </div>
                    <span className="text-[11px] text-[#9a9a9a]">{col.label}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-[#6b6b6b]">Datos de ejemplo.</p>
            </section>
          </div>

          {/* Últimas inscripciones */}
          <section className="bg-white border border-[#e5e5e5] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e5e5]">
              <h2 className="text-sm font-bold uppercase tracking-[0.12em]">Últimas inscripciones</h2>
              <button type="button" className="text-xs font-semibold text-[#111111] hover:underline">Ver todas</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.1em] text-[#9a9a9a] border-b border-[#eeeeee]">
                    <th className="font-medium px-5 py-3">Alumno</th>
                    <th className="font-medium px-5 py-3">Evento</th>
                    <th className="font-medium px-5 py-3">Estado</th>
                    <th className="font-medium px-5 py-3">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {INSCRIPCIONES.map(row => (
                    <tr key={`${row.alumno}-${row.fecha}`} className="border-b border-[#f3f3f1] last:border-0">
                      <td className="px-5 py-3 font-medium">{row.alumno}</td>
                      <td className="px-5 py-3 text-[#6b6b6b]">{row.evento}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoClase(row.estado)}`}>{row.estado}</span>
                      </td>
                      <td className="px-5 py-3 text-[#6b6b6b] whitespace-nowrap">{row.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-[#9a9a9a]">Panel de demostración. Los datos son de ejemplo y aún no reflejan la base real.</p>
        </main>
      </div>
    </div>
  );
}