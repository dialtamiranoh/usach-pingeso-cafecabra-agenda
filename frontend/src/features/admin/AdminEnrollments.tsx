import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { FaXmark, FaChevronLeft, FaChevronRight, FaMagnifyingGlass, FaArrowsRotate, FaArrowLeftLong } from 'react-icons/fa6';
import type { AdminEnrollmentDetail, AdminEnrollmentList, ReservationStatus } from '@cafecabra/shared';
import { formatMonto } from './useAdminPanel';
import { formatSessionDate } from '../booking/booking-data';
import { EstadoBadge } from '../../components/EstadoBadge';
import { ActionButton } from '../../components/ActionButton';

const LABELS: Record<ReservationStatus, string> = { RESERVADO: 'Pendiente de pago', CONFIRMADO: 'Confirmada', CANCELADO: 'Cancelada', EXPIRADO: 'Expirada', EN_ESPERA: 'En espera' };
const NOTICES = { PENDIENTE: 'Pendiente de envío', ENVIANDO: 'En proceso de envío', ENVIADO: 'Aceptada por el servicio de correo', ERROR: 'Error de envío' };
const dateTime = (value: number | null) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(value * 1000)) : 'Sin plazo registrado';

// Clases reutilizadas en la pantalla, alineadas con el resto del panel (Tailwind / HyperUI).
const CAMPO = 'w-full rounded-lg border border-[#d4d4d4] bg-white px-3 py-2 text-sm text-[#111111] focus:border-[#111111] focus:outline-none';
const BTN_UTIL = 'inline-flex items-center justify-center gap-2 rounded-md border border-[#d4d4d4] px-3 py-1.5 text-sm font-medium text-[#111111] transition-colors hover:bg-[#f5f5f4] disabled:cursor-not-allowed disabled:opacity-50';
const BTN_PRIMARIO = 'inline-flex items-center justify-center gap-2 rounded-md bg-[#111111] px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:opacity-50';
const NOTA = 'rounded-md bg-[#fdf3c9] px-3 py-2 text-xs text-[#7a6200]';

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'No pudimos completar la operación.');
  return body;
}

// Fila de un dl: término a la izquierda, valor a la derecha.
function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,11rem)_1fr] gap-2 py-1.5">
    <dt className="text-[#6b6b6b]">{termino}</dt><dd className="text-[#111111]">{children}</dd>
  </div>;
}

export function AdminEnrollments({ refreshKey, onChanged }: { refreshKey: number; onChanged: () => void }) {
  const [data, setData] = useState<AdminEnrollmentList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    const params = new URLSearchParams({ estado: status, q: query, page: String(page) });
    api<AdminEnrollmentList>(`/api/admin/inscritos?${params}`, { signal: controller.signal })
      .then(body => { if (!controller.signal.aborted) setData(body); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [status, query, page, revision, refreshKey]);

  return <section aria-labelledby="inscritos-title" className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="inscritos-title" className="text-lg font-semibold text-[#111111]">Inscritos</h2>
        <p className="text-sm text-[#6b6b6b]">Revisa las inscripciones y valida los pagos recibidos.</p>
      </div>
      <button type="button" className={BTN_UTIL} onClick={() => setRevision(value => value + 1)}><FaArrowsRotate aria-hidden="true" /> Actualizar</button>
    </div>

    <form className="flex flex-wrap items-end gap-3 rounded-lg border border-[#e5e5e5] bg-white p-4" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[#111111]">Estado</span>
        <select className={CAMPO} value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>
          <option value="">Todas las inscripciones</option>
          {Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-[#111111]">Buscar</span>
        <input className={CAMPO} value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder="Nombre, correo, actividad o código" />
      </label>
      <button className={BTN_PRIMARIO} type="submit"><FaMagnifyingGlass aria-hidden="true" /> Buscar</button>
    </form>

    {loading && <p role="status" className="text-sm text-[#6b6b6b]">Cargando inscripciones...</p>}
    {error && <p role="alert" className="text-sm text-[#b3261e]">{error}</p>}

    {data && !error && <div className="space-y-4">
      <p className="text-sm text-[#6b6b6b]">{data.total} {data.total === 1 ? 'inscripción' : 'inscripciones'}</p>
      <div className="overflow-x-auto rounded-lg border border-[#e5e5e5] bg-white">
        <table className="min-w-full divide-y divide-[#e5e5e5] text-sm">
          <thead className="text-left">
            <tr className="*:whitespace-nowrap *:px-3 *:py-2 *:font-medium *:text-[#111111]">
              <th scope="col">Participante</th><th scope="col">Actividad</th><th scope="col">Estado</th><th scope="col">Monto esperado</th><th scope="col">Inscripción</th><th scope="col">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5e5e5]">
            {data.items.map(item => <tr key={item.id} className="*:px-3 *:py-2 *:align-top">
              <th scope="row" className="text-left font-normal">
                <span className="block font-medium text-[#111111]">{item.attendee}</span>
                <span className="block text-xs text-[#6b6b6b]">{item.email}</span>
              </th>
              <td className="text-[#111111]">
                {item.event}
                {item.editionId
                  ? item.dates.map(day => <p key={day.date} className="text-xs text-[#6b6b6b]">{formatSessionDate(day.date)} • {day.schedule ?? 'Horario por confirmar'}</p>)
                  : <p className="text-xs text-[#6b6b6b]">Fecha pendiente de asignación</p>}
              </td>
              <td><EstadoBadge estado={item.status} label={LABELS[item.status]} /></td>
              <td className="whitespace-nowrap text-[#111111]">{item.paid ? formatMonto(item.amount) : 'Gratuita'}</td>
              <td className="whitespace-nowrap text-[#6b6b6b]">{dateTime(item.createdAt)}</td>
              <td><ActionButton variant="ver" label="Ver detalle" size="sm" onClick={() => setSelectedId(item.id)} aria-label={`Ver detalle de ${item.attendee}`} /></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!data.items.length && !loading && <p className="text-sm text-[#9a9a9a]">No hay inscripciones para esta búsqueda.</p>}
      <div className="flex items-center justify-between gap-4">
        <button type="button" className={BTN_UTIL} disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}><FaChevronLeft aria-hidden="true" /> Anterior</button>
        <span className="text-sm text-[#6b6b6b]">Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</span>
        <button type="button" className={BTN_UTIL} disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage(value => value + 1)}>Siguiente <FaChevronRight aria-hidden="true" /></button>
      </div>
    </div>}

    {selectedId !== null && <EnrollmentDetail key={selectedId} id={selectedId} onClose={() => setSelectedId(null)} onChanged={() => { setRevision(value => value + 1); onChanged(); }} />}
  </section>;
}

function EnrollmentDetail({ id, onClose, onChanged }: { id: number; onClose: () => void; onChanged: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [detail, setDetail] = useState<AdminEnrollmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [action, setAction] = useState<'CONFIRMAR' | 'CANCELAR' | null>(null);
  const [reason, setReason] = useState('');
  const [verified, setVerified] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const [editionChoice, setEditionChoice] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    const controller = new AbortController();
    api<AdminEnrollmentDetail>(`/api/admin/inscritos/${id}`, { signal: controller.signal })
      .then(value => { if (!controller.signal.aborted) setDetail(value); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!action || busy.current) return;
    if (action === 'CONFIRMAR' && !verified) { setError('Confirma que revisaste la transferencia y el monto.'); return; }
    if (action === 'CANCELAR' && !reason.trim()) { setError('Indica el motivo que recibirá la persona inscrita.'); return; }
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const updated = await api<AdminEnrollmentDetail>(`/api/admin/inscritos/${id}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: requestId.current, action, reason: action === 'CANCELAR' ? reason : '', paymentVerified: verified }), signal: AbortSignal.timeout(20000) });
      setDetail(updated); setAction(null); setMessage(action === 'CONFIRMAR' ? 'Inscripción confirmada.' : 'Reserva cancelada. El cupo quedó disponible.'); onChanged();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos guardar la decisión.');
      try {
        const current = await api<AdminEnrollmentDetail>(`/api/admin/inscritos/${id}`);
        setDetail(current);
        if (current.decision || (action === 'CONFIRMAR' ? !current.canConfirm : !current.canCancel)) { setAction(null); onChanged(); }
      } catch { /* Conserva la solicitud para un reintento con el mismo identificador. */ }
    } finally { busy.current = false; setPending(false); }
  }
  async function retryNotification() {
    if (busy.current) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const updated = await api<AdminEnrollmentDetail>(`/api/admin/inscritos/${id}/notificacion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20000) });
      setDetail(updated);
      setMessage(updated.notification?.status === 'ENVIADO' ? 'El servicio de correo aceptó la notificación.' : 'La decisión está guardada. El correo sigue pendiente; revisa la configuración del servicio o vuelve a intentarlo.');
    } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos reenviar el correo.'); }
    finally { busy.current = false; setPending(false); }
  }

  async function assignEdition(event: FormEvent) {
    event.preventDefault();
    if (busy.current || !editionChoice) return;
    busy.current = true; setPending(true); setError(''); setMessage('');
    try {
      const updated = await api<AdminEnrollmentDetail>(`/api/admin/inscritos/${id}/edicion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ editionId: editionChoice }) });
      setDetail(updated); setMessage('La reserva quedó vinculada a la fecha elegida.'); onChanged();
    } catch (error) { setError(error instanceof Error ? error.message : 'No pudimos asignar la edición.'); }
    finally { busy.current = false; setPending(false); }
  }

  function choose(value: 'CONFIRMAR' | 'CANCELAR') { setAction(value); setError(''); setMessage(''); setVerified(false); setReason(''); requestId.current = crypto.randomUUID(); }

  return <dialog ref={dialog} aria-labelledby="enrollment-detail-title" onClose={onClose} onCancel={event => { if (pending) event.preventDefault(); }}
    className="m-auto w-full max-w-2xl rounded-lg bg-white p-0 backdrop:bg-black/50">
    <div className="max-h-[85vh] space-y-5 overflow-y-auto p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="enrollment-detail-title" className="text-lg font-semibold text-[#111111]">Detalle de inscripción</h2>
        <button type="button" aria-label="Cerrar detalle" disabled={pending} onClick={() => dialog.current?.close()}
          className="rounded-md p-1 text-[#6b6b6b] transition-colors hover:bg-[#f5f5f4] disabled:opacity-50"><FaXmark aria-hidden="true" className="size-5" /></button>
      </div>

      {loading && <p role="status" className="text-sm text-[#6b6b6b]">Cargando detalle...</p>}
      {error && <p role="alert" className="text-sm text-[#b3261e]">{error}</p>}
      {message && <p role="status" className="rounded-md bg-[#e7f4ea] px-3 py-2 text-sm text-[#1a7f37]">{message}</p>}

      {detail && <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-medium text-[#111111]">{detail.event}</p>
          <EstadoBadge estado={detail.status} label={LABELS[detail.status]} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#111111]">Participante y contacto</h3>
            <dl className="divide-y divide-[#f0efec] text-sm">
              <Dato termino="Participante">{detail.attendee}</Dato>
              <Dato termino="Contacto / titular declarado">{detail.contact}</Dato>
              <Dato termino="Correo de notificación">{detail.email}</Dato>
              <Dato termino="Teléfono">{detail.phone || 'No informado'}</Dato>
              <Dato termino="Código">{detail.code}</Dato>
            </dl>
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#111111]">Reserva y pago</h3>
            <dl className="divide-y divide-[#f0efec] text-sm">
              <Dato termino="Monto esperado">{detail.paid ? formatMonto(detail.amount) : 'Inscripción gratuita'}</Dato>
              <Dato termino="Plazo de pago">{detail.paid ? dateTime(detail.expiresAt) : 'No aplica'}</Dato>
              <Dato termino="RUT declarado">{detail.payerRut || 'No informado'}</Dato>
              <Dato termino="Banco / tipo de cuenta">{[detail.bank, detail.accountType].filter(Boolean).join(' • ') || 'No aplica'}</Dato>
              <Dato termino="Cuenta de origen (últimos cuatro dígitos)">{detail.accountSuffix ? `•••• ${detail.accountSuffix.slice(-4)}` : 'No informado'}</Dato>
            </dl>
            {detail.paid && !detail.amountRecorded && <p className={NOTA}>Reserva anterior: no se guardó el precio original. Este monto corresponde al precio actual de la actividad; revísalo antes de confirmar.</p>}
          </section>
        </div>

        {!!detail.dates.length && <section className="space-y-1">
          <h3 className="text-sm font-semibold text-[#111111]">{detail.dates.length > 1 ? 'Jornadas de esta inscripción' : 'Fecha de esta inscripción'}</h3>
          {detail.dates.map(day => <p key={day.date} className="text-sm text-[#111111]">{formatSessionDate(day.date)} • {day.schedule ?? 'Horario por confirmar'}</p>)}
        </section>}

        {detail.needsEdition && <form className="space-y-3 rounded-lg border border-[#e5e5e5] bg-[#faf9f7] p-4" onSubmit={assignEdition}>
          <h3 className="text-sm font-semibold text-[#111111]">Reserva anterior sin fecha asignada</h3>
          <p className={NOTA}>Verifica con la persona inscrita qué fecha eligió antes de asignarla. No se puede confirmar el pago mientras falte este dato. Sus cupos se mantienen retenidos de forma conservadora hasta resolverlo.</p>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-[#111111]">Edición elegida</span>
            <select required className={CAMPO} value={editionChoice} disabled={pending} onChange={event => setEditionChoice(event.target.value)}>
              <option value="">Selecciona la fecha verificada</option>
              {detail.editionOptions.map(edition => <option key={edition.id} value={edition.id}>{edition.dates.map(day => `${formatSessionDate(day.date)} • ${day.schedule ?? 'Horario por confirmar'}`).join(' + ')}</option>)}
            </select>
          </label>
          <ActionButton variant="guardar" label="Asignar edición" type="submit" loading={pending} disabled={!editionChoice} />
        </form>}

        {detail.notes && <section className="space-y-1">
          <h3 className="text-sm font-semibold text-[#111111]">Observaciones del inscrito</h3>
          <p className="whitespace-pre-wrap text-sm text-[#111111]">{detail.notes}</p>
        </section>}

        {detail.decision && <section className="space-y-1">
          <h3 className="text-sm font-semibold text-[#111111]">Decisión registrada</h3>
          <p className="text-sm text-[#111111]">{detail.decision.action === 'CONFIRMAR' ? 'Pago confirmado manualmente' : 'Reserva cancelada'} • {dateTime(detail.decision.date)}</p>
          {detail.decision.reason && <p className="whitespace-pre-wrap text-sm text-[#111111]">Motivo: {detail.decision.reason}</p>}
        </section>}

        {detail.notification && <section className="space-y-2 rounded-lg border border-[#e5e5e5] p-4">
          <h3 className="text-sm font-semibold text-[#111111]">Notificación al inscrito</h3>
          <p className="text-sm text-[#111111]">{NOTICES[detail.notification.status]}</p>
          <p className="text-sm text-[#6b6b6b]">Destinatario: {detail.email}</p>
          {detail.notification.status !== 'ENVIADO' && <ActionButton variant="comunicar" label={pending ? 'Procesando...' : 'Reintentar envío'} disabled={pending} onClick={retryNotification} />}
          <details className="text-sm text-[#111111]"><summary className="cursor-pointer text-[#6b6b6b]">Ver mensaje</summary><strong className="mt-2 block">{detail.notification.subject}</strong><p className="whitespace-pre-wrap">{detail.notification.message}</p></details>
        </section>}

        {!action && (detail.canConfirm || detail.canCancel) && <div className="flex flex-wrap gap-2">
          {detail.canConfirm && <ActionButton variant="confirmarPago" label="Confirmar pago" onClick={() => choose('CONFIRMAR')} />}
          {detail.canCancel && <ActionButton variant="cancelar" label="Cancelar reserva" onClick={() => choose('CANCELAR')} />}
        </div>}

        {action && <form className="space-y-3 rounded-lg border border-[#e5e5e5] bg-[#faf9f7] p-4" onSubmit={submit}>
          <h3 className="text-sm font-semibold text-[#111111]">{action === 'CONFIRMAR' ? 'Confirmar pago recibido' : 'Cancelar reserva'}</h3>
          {action === 'CONFIRMAR'
            ? <label className="flex items-start gap-2 text-sm text-[#111111]"><input type="checkbox" className="mt-0.5" checked={verified} onChange={event => setVerified(event.target.checked)} disabled={pending} /><span>Verifiqué la transferencia recibida y que el monto corresponde a esta inscripción.</span></label>
            : <label className="block space-y-1 text-sm">
                <span className="font-medium text-[#111111]">Motivo de cancelación *</span>
                <textarea required maxLength={500} rows={3} className={CAMPO} value={reason} onChange={event => setReason(event.target.value)} disabled={pending} />
                <span className="text-xs text-[#6b6b6b]">Este motivo se incluirá en el correo al inscrito.</span>
              </label>}
          <div className="flex flex-wrap gap-2">
            <ActionButton variant={action === 'CONFIRMAR' ? 'confirmarPago' : 'cancelar'} label={pending ? 'Guardando...' : action === 'CONFIRMAR' ? 'Confirmar pago y notificar' : 'Cancelar reserva y notificar'} type="submit" disabled={pending} />
            <button type="button" className={BTN_UTIL} disabled={pending} onClick={() => setAction(null)}><FaArrowLeftLong aria-hidden="true" /> Volver</button>
          </div>
        </form>}

        {!detail.canConfirm && !detail.canCancel && !detail.decision && <p className={NOTA}>Esta inscripción ya está confirmada, cancelada o vencida. No se puede confirmar un pago para una reserva expirada.</p>}
      </div>}
    </div>
  </dialog>;
}
