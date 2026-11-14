import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { AdminEnrollmentDetail, AdminEnrollmentList, ReservationStatus } from '@cafecabra/shared';
import { formatMonto } from './useAdminPanel';
import { formatSessionDate } from '../booking/booking-data';
import { FaArrowRightLong } from 'react-icons/fa6';
import { EstadoBadge } from '../../components/EstadoBadge';
import { ActionButton } from '../../components/ActionButton';


const LABELS: Record<ReservationStatus, string> = { RESERVADO: 'Pendiente de pago', CONFIRMADO: 'Confirmada', CANCELADO: 'Cancelada', EXPIRADO: 'Expirada', EN_ESPERA: 'En espera' };
const NOTICES = { PENDIENTE: 'Pendiente de envío', ENVIANDO: 'En proceso de envío', ENVIADO: 'Aceptada por el servicio de correo', ERROR: 'Error de envío' };
const dateTime = (value: number | null) => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(value * 1000)) : 'Sin plazo registrado';

async function api<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...options });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? 'No pudimos completar la operación.');
  return body;
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
  return <section className="admin-inscritos" aria-labelledby="inscritos-title">
    <div className="admin-inscritos-heading"><div><h2 id="inscritos-title">Inscritos</h2><p>Revisa las inscripciones y valida los pagos recibidos.</p></div><button type="button" className="button button-outline" onClick={() => setRevision(value => value + 1)}>Actualizar</button></div>
    <form className="admin-inscritos-filters" onSubmit={event => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}>
      <label>Estado<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Todas las inscripciones</option>{Object.entries(LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Buscar<input value={search} maxLength={120} onChange={event => setSearch(event.target.value)} placeholder="Nombre, correo, actividad o código" /></label>
      <button className="button button-dark" type="submit">Buscar</button>
    </form>
    {loading && <p role="status">Cargando inscripciones…</p>}
    {error && <p role="alert" className="field-error">{error}</p>}
    {data && !error && <>
      <p className="admin-inscritos-count">{data.total} {data.total === 1 ? 'inscripción' : 'inscripciones'}</p>
      <div className="admin-inscritos-table"><table>
        <thead><tr><th scope="col">Participante</th><th scope="col">Actividad</th><th scope="col">Estado</th><th scope="col">Monto esperado</th><th scope="col">Inscripción</th><th scope="col">Acción</th></tr></thead>
        <tbody>{data.items.map(item => <tr key={item.id}>
          <th scope="row">{item.attendee}<span>{item.email}</span></th><td>{item.event}{item.editionId ? item.dates.map(day => <p key={day.date}>{formatSessionDate(day.date)} · {day.schedule ?? 'Horario por confirmar'}</p>) : <p>Fecha pendiente de asignación</p>}</td>
          <td><span className={`admin-reservation-status status-${item.status}`}>{LABELS[item.status]}</span></td>
          <td>{item.paid ? formatMonto(item.amount) : 'Gratuita'}</td><td>{dateTime(item.createdAt)}</td>
          <td><button className="button button-outline" type="button" onClick={() => setSelectedId(item.id)} aria-label={`Ver detalle de ${item.attendee}`}>Ver detalle</button></td>
        </tr>)}</tbody>
      </table></div>
      {!data.items.length && !loading && <p className="admin-empty">No hay inscripciones para esta búsqueda.</p>}
      <div className="admin-pagination"><button type="button" className="button button-outline" disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button type="button" className="button button-outline" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>
    </>}
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
  return <dialog ref={dialog} className="admin-enrollment-dialog" aria-labelledby="enrollment-detail-title" onClose={onClose} onCancel={event => { if (pending) event.preventDefault(); }}>
    <div className="admin-detail-heading"><h2 id="enrollment-detail-title">Detalle de inscripción</h2><button type="button" aria-label="Cerrar detalle" disabled={pending} onClick={() => dialog.current?.close()}>×</button></div>
    {loading && <p role="status">Cargando detalle…</p>}
    {error && <p role="alert" className="field-error">{error}</p>}
    {message && <p role="status" className="admin-decision-message">{message}</p>}
    {detail && <>
      <p className="admin-detail-event">{detail.event}</p><span className={`admin-reservation-status status-${detail.status}`}>{LABELS[detail.status]}</span>
      <div className="admin-detail-grid">
        <section><h3>Participante y contacto</h3><dl><dt>Participante</dt><dd>{detail.attendee}</dd><dt>Contacto / titular declarado</dt><dd>{detail.contact}</dd><dt>Correo de notificación</dt><dd>{detail.email}</dd><dt>Teléfono</dt><dd>{detail.phone || 'No informado'}</dd><dt>Código</dt><dd>{detail.code}</dd></dl></section>
        <section><h3>Reserva y pago</h3><dl><dt>Monto esperado</dt><dd>{detail.paid ? formatMonto(detail.amount) : 'Inscripción gratuita'}</dd><dt>Plazo de pago</dt><dd>{detail.paid ? dateTime(detail.expiresAt) : 'No aplica'}</dd><dt>RUT declarado</dt><dd>{detail.payerRut || 'No informado'}</dd><dt>Banco / tipo de cuenta</dt><dd>{[detail.bank, detail.accountType].filter(Boolean).join(' · ') || 'No aplica'}</dd><dt>Cuenta de origen (últimos cuatro dígitos)</dt><dd>{detail.accountSuffix ? `•••• ${detail.accountSuffix.slice(-4)}` : 'No informado'}</dd></dl>
          {detail.paid && !detail.amountRecorded && <p className="admin-detail-note">Reserva anterior: no se guardó el precio original. Este monto corresponde al precio actual de la actividad; revísalo antes de confirmar.</p>}
        </section>
      </div>
      {!!detail.dates.length && <section><h3>{detail.dates.length > 1 ? 'Jornadas de esta inscripción' : 'Fecha de esta inscripción'}</h3>{detail.dates.map(day => <p key={day.date}>{formatSessionDate(day.date)} · {day.schedule ?? 'Horario por confirmar'}</p>)}</section>}
      {detail.needsEdition && <form className="admin-decision-form" onSubmit={assignEdition}>
        <h3>Reserva anterior sin fecha asignada</h3><p className="admin-detail-note">Verifica con la persona inscrita qué fecha eligió antes de asignarla. No se puede confirmar el pago mientras falte este dato. Sus cupos se mantienen retenidos de forma conservadora hasta resolverlo.</p>
        <label className="field">Edición elegida<select required value={editionChoice} disabled={pending} onChange={event => setEditionChoice(event.target.value)}><option value="">Selecciona la fecha verificada</option>{detail.editionOptions.map(edition => <option key={edition.id} value={edition.id}>{edition.dates.map(day => `${formatSessionDate(day.date)} · ${day.schedule ?? 'Horario por confirmar'}`).join(' + ')}</option>)}</select></label>
        <button type="submit" className="button button-outline" disabled={pending || !editionChoice}>{pending ? 'Guardando…' : 'Asignar edición'}</button>
      </form>}
      {detail.notes && <section><h3>Observaciones del inscrito</h3><p className="admin-prewrap">{detail.notes}</p></section>}
      {detail.decision && <section className="admin-decision-history"><h3>Decisión registrada</h3><p>{detail.decision.action === 'CONFIRMAR' ? 'Pago confirmado manualmente' : 'Reserva cancelada'} · {dateTime(detail.decision.date)}</p>{detail.decision.reason && <p className="admin-prewrap">Motivo: {detail.decision.reason}</p>}</section>}
      {detail.notification && <section className="admin-notification"><h3>Notificación al inscrito</h3><p>{NOTICES[detail.notification.status]}</p><p>Destinatario: {detail.email}</p>
        {detail.notification.status !== 'ENVIADO' && <button type="button" className="button button-outline" disabled={pending} onClick={retryNotification}>{pending ? 'Procesando…' : 'Reintentar envío'}</button>}
        <details><summary>Ver mensaje</summary><strong>{detail.notification.subject}</strong><p className="admin-prewrap">{detail.notification.message}</p></details>
      </section>}
      {!action && (detail.canConfirm || detail.canCancel) && <div className="admin-decision-actions">
        {detail.canConfirm && <button type="button" className="button button-dark" onClick={() => choose('CONFIRMAR')}>Confirmar pago</button>}
        {detail.canCancel && <button type="button" className="button button-outline" onClick={() => choose('CANCELAR')}>Cancelar reserva</button>}
      </div>}
      {action && <form className="admin-decision-form" onSubmit={submit}>
        <h3>{action === 'CONFIRMAR' ? 'Confirmar pago recibido' : 'Cancelar reserva'}</h3>
        {action === 'CONFIRMAR' ? <label className="checkbox-field"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} disabled={pending} /><span>Verifiqué la transferencia recibida y que el monto corresponde a esta inscripción.</span></label>
          : <label className="field">Motivo de cancelación *<textarea required maxLength={500} rows={3} value={reason} onChange={event => setReason(event.target.value)} disabled={pending} /><span className="field-hint">Este motivo se incluirá en el correo al inscrito.</span></label>}
        <div className="admin-decision-actions"><button type="submit" className="button button-dark" disabled={pending}>{pending ? 'Guardando…' : action === 'CONFIRMAR' ? 'Confirmar pago y notificar' : 'Cancelar reserva y notificar'}</button><button type="button" className="button button-outline" disabled={pending} onClick={() => setAction(null)}>Volver</button></div>
      </form>}
      {!detail.canConfirm && !detail.canCancel && !detail.decision && <p className="admin-detail-note">Esta inscripción ya está confirmada, cancelada o vencida. No se puede confirmar un pago para una reserva expirada.</p>}
    </>}
  </dialog>;
}
