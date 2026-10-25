import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { BookingSteps } from '../components/BookingSteps';
import type { CatalogItem } from '../features/catalog/catalog-data';
import { formatSessionDate, validateDraft, validatePersonalDetails, type BookingSession, type EnrollmentDraft } from '../features/booking/booking-data';
import { ReservationSummary } from '../features/booking/ReservationSummary';
import { DietaryFields, InstagramField, TransferFields } from '../features/booking/EnrollmentExtraFields';
import { dietaryLabel } from '../features/booking/enrollment-options';
import type { EnrollmentReceipt, FreeEnrollmentRequest, PaidEnrollmentRequest } from '@cafecabra/shared';

const clpFormat = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
function formatDeadline(epoch: number): string {
  return epoch ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(epoch * 1000)) : '';
}

export function EnrollmentPage({ course, session, draft, onChange, step }: {
  course: CatalogItem;
  session: BookingSession;
  draft: EnrollmentDraft;
  onChange: (draft: EnrollmentDraft) => void;
  step: 'personal' | 'transfer';
}) {
  const navigate = useNavigate();
  const isTransfer = step === 'transfer';
  const hasDietaryFields = course.type === 'Curso';
  const enrollmentData = hasDietaryFields ? draft : { ...draft, dietaryPreference: '', dietaryOther: '', allergyStatus: '' as const, allergyDetails: '' };
  const personalPath = `/cursos/${course.id}/inscripcion?sesion=${session.id}`;
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({});
  const review = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const sending = useRef(false);
  const [pending, setPending] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [receipt, setReceipt] = useState<EnrollmentReceipt | null>(null);

  async function confirmEnrollment() {
    if (sending.current || receipt) return;
    sending.current = true;
    setPending(true);
    setSaveError('');
    try {
      const base: FreeEnrollmentRequest = {
        eventId: course.id, requestId: requestId.current, name: draft.name, email: draft.email, phone: draft.phone,
        instagram: draft.instagram, dietaryPreference: enrollmentData.dietaryPreference, dietaryOther: enrollmentData.dietaryOther,
        allergyStatus: enrollmentData.allergyStatus, allergyDetails: enrollmentData.allergyDetails, notes: draft.notes, confirmed: draft.confirmed,
      };
      const body: FreeEnrollmentRequest | PaidEnrollmentRequest = course.requiresPayment
        ? { ...base, payerSameAsAttendee: draft.payerSameAsAttendee, payerName: draft.payerName, payerRut: draft.payerRut, originBank: draft.originBank, accountLastFour: draft.accountLastFour }
        : base;
      const response = await fetch('/api/inscripciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error ?? 'No pudimos guardar tu inscripción.');
      setReceipt(saved);
      review.current?.close();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No pudimos guardar tu inscripción. Intenta nuevamente.');
    } finally { sending.current = false; setPending(false); }
  }

  if (receipt) {
    const transfer = receipt.transfer;
    return <main id="contenido" className="container experience-page">
      <section className="panel course-information" role="status">
        <p className="eyebrow">CAFÉ CABRA</p>
        {receipt.status === 'RESERVADO' && transfer ? <>
          <h1>Reserva creada — realiza tu transferencia</h1>
          <p>{course.title}</p>
          <p>Para confirmar tu cupo, transfiere <strong>{clpFormat.format(transfer.monto)}</strong> con estos datos:</p>
          <dl className="review-data">
            <div><dt>Titular</dt><dd>{transfer.titular}</dd></div>
            <div><dt>RUT</dt><dd>{transfer.rut}</dd></div>
            <div><dt>Banco</dt><dd>{transfer.banco}</dd></div>
            <div><dt>Tipo de cuenta</dt><dd>{transfer.tipoCuenta}</dd></div>
            <div><dt>N° de cuenta</dt><dd>{transfer.numeroCuenta}</dd></div>
            <div><dt>Correo</dt><dd>{transfer.correo}</dd></div>
            <div><dt>Código de reserva</dt><dd>{receipt.code}</dd></div>
          </dl>
          <p>Agrega <strong>{transfer.correo}</strong> en la notificación de la transferencia o envíanos el comprobante a ese correo.{formatDeadline(transfer.expiraEn) && <> Tienes plazo hasta el <strong>{formatDeadline(transfer.expiraEn)}</strong>.</>}</p>
          <p className="muted">Te enviamos estos datos también a tu correo.</p>
        </> : <>
          <h1>Tu inscripción está confirmada</h1>
          <p>{course.title}</p>
          <p>Tu lugar en el evento está reservado. ¡Te esperamos!</p>
        </>}
        <ReservationSummary course={course} session={session} persisted />
        <Link className="button button-dark confirmation-home" to="/" reloadDocument>Volver al inicio</Link>
      </section>
    </main>;
  }

  function update(field: keyof EnrollmentDraft, value: string | boolean) {
    onChange({ ...draft, [field]: value });
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = !isTransfer && course.requiresPayment ? validatePersonalDetails(enrollmentData) : validateDraft(enrollmentData, course.requiresPayment);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (!isTransfer && course.requiresPayment) {
      navigate(`/cursos/${course.id}/transferencia?sesion=${session.id}`);
    } else {
      review.current?.showModal();
    }
  }

  return (
    <main id="contenido" className="container experience-page">
      <Breadcrumbs items={[{ label: 'Cursos', to: '/#cursos' }, { label: course.title, to: `/cursos/${course.id}` }, { label: 'Disponibilidad', to: `/cursos/${course.id}/agenda?sesion=${session.id}` }, ...(isTransfer ? [{ label: 'Inscripción', to: personalPath }, { label: 'Transferencia' }] : [{ label: 'Inscripción' }])]} />
      <BookingSteps current={isTransfer ? 2 : 1} requiresPayment={course.requiresPayment} />
      <div className="page-heading"><h1>{isTransfer ? 'Datos de transferencia' : 'Completa tu inscripción'}</h1><p className="muted">{isTransfer ? 'Completa los datos del titular que hará el pago.' : `Ingresa tus datos para revisar tu selección en ${course.title}.`}</p></div>
      <form ref={form} className="panel booking-grid" noValidate onSubmit={submit}>
        <section className="enrollment-content" aria-labelledby="your-data-title">
          <h2 id="your-data-title">{isTransfer ? 'Titular de la transferencia' : 'Tus datos'}</h2><p className="muted">Los campos marcados con * son obligatorios.</p>
          <div className="form-fields">
            {!isTransfer && <>
            <div className="field"><label htmlFor="name">Nombre completo *</label><input id="name" name="name" autoComplete="name" required maxLength={120} value={draft.name} placeholder="Ej. Juan Pérez" onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <p className="field-error" id="name-error">{errors.name}</p>}</div>
            <div className="field"><label htmlFor="phone">Teléfono *</label><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={25} value={draft.phone} placeholder="+56 9 1234 5678" onChange={event => update('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} />{errors.phone && <p className="field-error" id="phone-error">{errors.phone}</p>}</div>
            <div className="field"><label htmlFor="email">Correo electrónico *</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={draft.email} placeholder="nombre@ejemplo.cl" onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <p className="field-error" id="email-error">{errors.email}</p>}</div>
            <InstagramField draft={draft} errors={errors} update={update} />
            <div className="field"><label htmlFor="notes">Observaciones <span className="muted">(opcional)</span></label><textarea id="notes" name="notes" rows={4} maxLength={1000} value={draft.notes} placeholder="Escribe aquí alguna solicitud o comentario" onChange={event => update('notes', event.target.value)} /></div>
            {hasDietaryFields && <DietaryFields draft={draft} errors={errors} update={update} />}
            </>}
            {isTransfer && <TransferFields draft={draft} errors={errors} update={update} />}
            {(isTransfer || !course.requiresPayment) &&
            <div><label className="checkbox-field"><input name="confirmed" type="checkbox" required checked={draft.confirmed} onChange={event => update('confirmed', event.target.checked)} aria-invalid={Boolean(errors.confirmed)} aria-describedby={errors.confirmed ? 'confirmed-error' : undefined} /><span>Confirmo que mis datos son correctos y deseo revisar mi selección.</span></label>{errors.confirmed && <p className="field-error" id="confirmed-error">{errors.confirmed}</p>}</div>
            }
          </div>
          <p className="form-demo-note">{course.requiresPayment ? 'Al confirmar crearemos tu reserva y te enviaremos los datos de transferencia por correo.' : 'Tus datos se guardarán al confirmar la inscripción en el siguiente paso.'}</p>
        </section>
        <ReservationSummary course={course} session={session}>
          <button type="submit" className="button button-dark">{!isTransfer && course.requiresPayment ? 'Continuar a transferencia' : 'Revisar inscripción'} <span aria-hidden="true">→</span></button>
          <Link className="button button-outline" to={isTransfer ? personalPath : `/cursos/${course.id}/agenda?sesion=${session.id}`}>{isTransfer ? 'Volver a mis datos' : 'Cambiar fecha u horario'}</Link>
        </ReservationSummary>
      </form>
      <dialog ref={review} className="course-dialog" aria-labelledby="review-title" onCancel={event => { if (pending) event.preventDefault(); }} onClick={event => { if (!pending && event.target === event.currentTarget) review.current?.close(); }}>
        <div className="dialog-content">
          <button type="button" className="dialog-close" aria-label="Cerrar revisión" disabled={pending} onClick={() => review.current?.close()}>×</button>
          <p className="eyebrow">REVISIÓN DE INSCRIPCIÓN</p><h2 id="review-title">Revisa tus datos</h2>
          <p>{course.title} · {formatSessionDate(session.date)} · {session.startTime} – {session.endTime}</p>
          <dl className="review-data">
            <div><dt>Nombre</dt><dd>{draft.name}</dd></div><div><dt>Correo</dt><dd>{draft.email}</dd></div><div><dt>Teléfono</dt><dd>{draft.phone}</dd></div>
            {draft.instagram.trim() && <div><dt>Instagram</dt><dd>@{draft.instagram.trim().replace(/^@/, '')}</dd></div>}
            {hasDietaryFields && <>
            <div><dt>Preferencia alimentaria</dt><dd>{dietaryLabel(draft.dietaryPreference)}{draft.dietaryPreference === 'other' && `: ${draft.dietaryOther}`}</dd></div>
            <div><dt>Alergias o intolerancias</dt><dd>{draft.allergyStatus === 'yes' ? draft.allergyDetails : draft.allergyStatus === 'no' ? 'No declara alergias o intolerancias' : draft.allergyStatus === 'undisclosed' ? 'Prefiere no informar' : 'No informado'}</dd></div>
            </>}
            {course.requiresPayment && <>
              <div><dt>Titular que pagará</dt><dd>{draft.payerSameAsAttendee ? draft.name : draft.payerName}</dd></div>
              <div><dt>RUT del titular</dt><dd>{draft.payerRut}</dd></div>
              <div><dt>Banco de origen</dt><dd>{draft.originBank}</dd></div>
              {draft.accountLastFour.trim() && <div><dt>Cuenta de origen (últimos 4 dígitos)</dt><dd>•••• {draft.accountLastFour}</dd></div>}
            </>}
            {draft.notes.trim() && <div><dt>Observaciones</dt><dd>{draft.notes}</dd></div>}
          </dl>
          <p className="dialog-note">{course.requiresPayment ? 'Al confirmar crearemos tu reserva y te mostraremos los datos para transferir. Tu cupo se mantiene hasta que venza el plazo de pago.' : 'Al confirmar reservaremos tu lugar en el evento.'}</p>
          {saveError && <p role="alert" className="field-error">{saveError}</p>}
          <button type="button" className="button button-dark" disabled={pending} onClick={confirmEnrollment}>{pending ? (course.requiresPayment ? 'Creando reserva…' : 'Guardando inscripción…') : (course.requiresPayment ? 'Confirmar y ver datos de transferencia' : 'Confirmar inscripción gratuita')}</button>
          <button type="button" className="button button-outline" disabled={pending} onClick={() => review.current?.close()}>{isTransfer ? 'Volver a transferencia' : 'Volver a mis datos'} <span aria-hidden="true">→</span></button>
        </div>
      </dialog>
    </main>
  );
}