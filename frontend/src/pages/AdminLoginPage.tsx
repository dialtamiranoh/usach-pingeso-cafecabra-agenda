import { useState } from 'react';
import { Link } from 'react-router-dom';
import { signInAdmin } from '../features/admin/useAdminSession';
import { FaArrowLeftLong } from 'react-icons/fa6';

// Login del panel, construido con el markup de formulario de HyperUI (card + inputs + botón
// con hover invertido), adaptado a la paleta del panel: negro, blanco y acento #e6bb08.
export function AdminLoginPage({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setEnviando(true);
    const mensaje = await signInAdmin(email.trim().toLowerCase(), password);
    setEnviando(false);
    if (mensaje) { setError(mensaje); return; }
    onLoggedIn();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-[#f5f5f4] font-sans p-6">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-md space-y-4 rounded-lg border border-[#e5e5e5] bg-white p-6"
      >
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#9a9a9a]">Café Cabra</p>
          <h1 className="mt-1 text-xl font-bold text-[#111111]">Panel de administración</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">Ingresa con tu cuenta de administrador.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111]" htmlFor="admin-email">
            Correo
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
            id="admin-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="tu@correo.cl"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#111111]" htmlFor="admin-password">
            Contraseña
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none"
            id="admin-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="********"
          />
        </div>

        {error && <p className="text-sm text-[#b3261e]" role="alert">{error}</p>}

        <button
          className="block w-full rounded-lg border border-[#111111] bg-[#111111] px-12 py-3 text-sm font-medium text-white transition-colors hover:bg-transparent hover:text-[#111111] disabled:opacity-60"
          type="submit"
          disabled={enviando}
        >
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>

        <Link to="/" className="flex items-center justify-center gap-1 text-xs text-[#6b6b6b] hover:underline">
          <FaArrowLeftLong aria-hidden="true" /> Volver al sitio
        </Link>
      </form>
    </div>
  );
}