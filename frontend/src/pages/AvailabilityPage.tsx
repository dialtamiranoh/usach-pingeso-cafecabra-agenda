import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { BookingSteps } from '../components/BookingSteps';
import type { CatalogItem } from '../features/catalog/catalog-data';
import { demoSessions, formatSessionDate, demoLocation } from '../features/booking/booking-data';
import { SessionCalendar } from '../features/booking/SessionCalendar';
import { ReservationSummary } from '../features/booking/ReservationSummary';

export function AvailabilityPage({ course }: { course: CatalogItem }) {
  const [params, setParams] = useSearchParams();
  const sessions = demoSessions.filter(session => session.courseId === course.id);
  const selected = sessions.find(session => session.id === params.get('sesion') && session.remainingSeats > 0);
  const [date, setDate] = useState(selected?.date ?? '');
  const activeDate = selected?.date ?? date;
  const dailySessions = sessions.filter(session => session.date === activeDate);

  function selectDate(value: string) {
    setDate(value);
    setParams({}, { replace: true });
  }

  return (
    <main id="contenido" className="container experience-page">
      <Breadcrumbs items={[{ label: 'Cursos', to: '/#cursos' }, { label: course.title, to: `/cursos/${course.id}` }, { label: 'Disponibilidad' }]} />
      <BookingSteps current={0} />
      <section className="compact-course">
        <img src={course.image} alt={course.imageAlt} />
        <div><p className="eyebrow">TU PRÓXIMA EXPERIENCIA</p><h1>{course.title}</h1><p className="muted">Selecciona una fecha y un horario para participar.</p><p className="location-line"><span aria-hidden="true">⌖</span>{demoLocation}</p></div>
      </section>
      <div className="page-heading"><h2>Selecciona una fecha</h2><p className="muted">Revisa el calendario y elige el horario que prefieras.</p></div>
      <div className="panel booking-grid">
        <section className="availability-content" aria-labelledby="availability-title">
          <h2 id="availability-title">Disponibilidad del curso</h2><p className="muted">Las fechas y los cupos que ves son de demostración.</p>
          <SessionCalendar sessions={sessions} selectedDate={activeDate} onSelectDate={selectDate} />
          <section className="session-options" aria-labelledby="sessions-title">
            <h3 id="sessions-title">Horarios disponibles</h3>
            {!activeDate ? <p className="selection-hint">Elige un día marcado para ver sus horarios.</p> : <>
              <p className="muted selected-date">{formatSessionDate(activeDate)}</p>
              <div role="group" aria-label="Horarios de la fecha seleccionada">
                {dailySessions.map(session => (
                  <button type="button" key={session.id} className={`session-option ${selected?.id === session.id ? 'selected' : ''}`}
                    disabled={session.remainingSeats === 0} aria-pressed={selected?.id === session.id}
                    onClick={() => setParams({ sesion: session.id }, { replace: true })}>
                    <span>{session.startTime} – {session.endTime}</span><span>{session.remainingSeats ? `${session.remainingSeats} ${session.remainingSeats === 1 ? 'cupo' : 'cupos'}` : 'Sin cupos'}</span>
                  </button>
                ))}
              </div>
            </>}
          </section>
        </section>
        <ReservationSummary course={course} session={selected}>
          {selected ? <Link className="button button-dark" to={`/cursos/${course.id}/inscripcion?sesion=${selected.id}`}>Continuar inscripción <span aria-hidden="true">→</span></Link>
            : <button type="button" className="button button-dark" disabled>Selecciona fecha y horario</button>}
          <Link className="button button-outline" to={`/cursos/${course.id}`}>Volver al curso</Link>
        </ReservationSummary>
      </div>
    </main>
  );
}
