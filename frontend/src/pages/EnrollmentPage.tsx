import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { BookingSteps } from '../components/BookingSteps';
import type { CatalogItem } from '../features/catalog/catalog-data';
import { formatSessionDate, validateDraft, type DemoSession, type EnrollmentDraft } from '../features/booking/booking-data';
import { ReservationSummary } from '../features/booking/ReservationSummary';

export function EnrollmentPage({ course, session, draft, onChange }: {
  course: CatalogItem;
  session: DemoSession;
  draft: EnrollmentDraft;
  onChange: (draft: EnrollmentDraft) => void;
}) {
  const [errors, setErrors] = useState<ReturnType<typeof validateDraft>>({});
  const review = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);

  function update(field: keyof EnrollmentDraft, value: string | boolean) {
    onChange({ ...draft, [field]: value });
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const first = Object.keys(nextErrors)[0];
      form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    review.current?.showModal();
  }

  return (
    <main id="contenido" className="container experience-page">
      <Breadcrumbs items={[{ label: 'Cursos', to: '/#cursos' }, { label: course.title, to: `/cursos/${course.id}` }, { label: 'Disponibilidad', to: `/cursos/${course.id}/agenda?sesion=${session.id}` }, { label: 'Inscripción' }]} />
      <BookingSteps current={1} />
      <div className="page-heading"><h1>Completa tu inscripción</h1><p className="muted">Ingresa tus datos para revisar tu selección en {course.title}.</p></div>
      <form ref={form} className="panel booking-grid" noValidate onSubmit={submit}>
        <section className="enrollment-content" aria-labelledby="your-data-title">
          <h2 id="your-data-title">Tus datos</h2><p className="muted">Los campos marcados con * son obligatorios.</p>
          <div className="form-fields">
            <div className="field"><label htmlFor="name">Nombre completo *</label><input id="name" name="name" autoComplete="name" required maxLength={120} value={draft.name} placeholder="Ej. Juan Pérez" onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <p className="field-error" id="name-error">{errors.name}</p>}</div>
            <div className="field"><label htmlFor="phone">Teléfono *</label><input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={25} value={draft.phone} placeholder="+56 9 1234 5678" onChange={event => update('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined} />{errors.phone && <p className="field-error" id="phone-error">{errors.phone}</p>}</div>
            <div className="field"><label htmlFor="email">Correo electrónico *</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={draft.email} placeholder="nombre@ejemplo.cl" onChange={event => update('email', event.target.value)} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} />{errors.email && <p className="field-error" id="email-error">{errors.email}</p>}</div>
            <div className="field"><label htmlFor="notes">Observaciones <span className="muted">(opcional)</span></label><textarea id="notes" name="notes" rows={4} maxLength={1000} value={draft.notes} placeholder="Escribe aquí alguna solicitud o comentario" onChange={event => update('notes', event.target.value)} /></div>
            <div><label className="checkbox-field"><input name="confirmed" type="checkbox" required checked={draft.confirmed} onChange={event => update('confirmed', event.target.checked)} aria-invalid={Boolean(errors.confirmed)} aria-describedby={errors.confirmed ? 'confirmed-error' : undefined} /><span>Confirmo que mis datos son correctos y deseo revisar mi selección.</span></label>{errors.confirmed && <p className="field-error" id="confirmed-error">{errors.confirmed}</p>}</div>
          </div>
          <p className="form-demo-note">Este formulario es una demostración. Tus datos permanecen en esta página y no se envían a ningún servicio.</p>
        </section>
        <ReservationSummary course={course} session={session}>
          <button type="submit" className="button button-dark">Revisar inscripción <span aria-hidden="true">→</span></button>
          <Link className="button button-outline" to={`/cursos/${course.id}/agenda?sesion=${session.id}`}>Cambiar fecha u horario</Link>
        </ReservationSummary>
      </form>
      <dialog ref={review} className="course-dialog" aria-labelledby="review-title" onClick={event => { if (event.target === event.currentTarget) review.current?.close(); }}>
        <div className="dialog-content">
          <button type="button" className="dialog-close" aria-label="Cerrar revisión" onClick={() => review.current?.close()}>×</button>
          <p className="eyebrow">REVISIÓN DE EJEMPLO</p><h2 id="review-title">Tu selección está lista</h2>
          <p>{course.title} · {formatSessionDate(session.date)} · {session.startTime} – {session.endTime}</p>
          <dl className="review-data"><div><dt>Nombre</dt><dd>{draft.name}</dd></div><div><dt>Correo</dt><dd>{draft.email}</dd></div><div><dt>Teléfono</dt><dd>{draft.phone}</dd></div>{draft.notes.trim() && <div><dt>Observaciones</dt><dd>{draft.notes}</dd></div>}</dl>
          <p className="dialog-note">No se ha registrado una reserva ni enviado un correo. El pago y la confirmación se conectarán en una próxima etapa.</p>
          <button type="button" className="button button-dark" onClick={() => review.current?.close()}>Volver a mis datos <span aria-hidden="true">→</span></button>
        </div>
      </dialog>
    </main>
  );
}
