import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { BookingSteps } from '../components/BookingSteps';
import type { CatalogItem } from '../features/catalog/catalog-data';
import { formatSessionDate } from '../features/booking/booking-data';
import { SessionCalendar } from '../features/booking/SessionCalendar';
import { ReservationSummary } from '../features/booking/ReservationSummary';

export function AvailabilityPage({ course }: { course: CatalogItem }) {
  const [params, setParams] = useSearchParams();
  const sessions = course.sessions;
  const selected = sessions.find(session => session.id === params.get('sesion') && session.remainingSeats > 0);
  const [date, setDate] = useState(selected?.date ?? '');
  const activeDate = date || selected?.date || '';
  const calendarSessions = sessions.flatMap(session => session.days.map(day => ({ ...session, ...day })));
  const dailySessions = sessions.filter(session => session.days.some(day => day.date === activeDate));
  const selectedDates = [...new Set(dailySessions.flatMap(session => session.days.map(day => day.date)))];
  const multiDay = course.dateMode === 'CONJUNTAS' && course.dates.length > 1;

  function selectDate(value: string) {
    setDate(value);
    setParams({}, { replace: true });
  }

  return (
    <main id="contenido" className="container experience-page">
      <Breadcrumbs items={[{ label: 'Cursos', to: '/#cursos' }, { label: course.title, to: `/cursos/${course.id}` }, { label: 'Disponibilidad' }]} />
      <BookingSteps current={0} requiresPayment={course.requiresPayment} />
      <section className="compact-course">
        {course.image ? <img src={course.image} alt={course.imageAlt} /> : null}
        <div><p className="eyebrow">TU PRÓXIMA EXPERIENCIA</p><h1>{course.title}</h1><p className="muted">Selecciona una fecha y un horario para participar.</p><p className="location-line"><span aria-hidden="true">⌖</span>{course.location}</p></div>
      </section>
      <div className="page-heading"><h2>Selecciona una fecha</h2><p className="muted">{multiDay ? 'Elige cualquiera de las jornadas para ver los horarios del curso completo.' : 'Revisa el calendario y elige el horario que prefieras.'}</p></div>
      <div className="panel booking-grid">
        <section className="availability-content" aria-labelledby="availability-title">
          <h2 id="availability-title">Disponibilidad del curso</h2><p className="muted">{multiDay ? 'La inscripción incluye todas las jornadas indicadas.' : 'Elige la fecha en la que deseas participar. Cada fecha se reserva por separado.'}</p>
          {sessions.length ? <SessionCalendar sessions={calendarSessions} selectedDate={activeDate} selectedDates={selectedDates} onSelectDate={selectDate} /> : <p>Las fechas y horarios de inscripción están por confirmar.</p>}
          <section className="session-options" aria-labelledby="sessions-title">
            <h3 id="sessions-title">Horarios disponibles</h3>
            {!activeDate ? <p className="selection-hint">Elige un día marcado para ver sus horarios.</p> : <>
              <p className="muted selected-date">{multiDay ? 'Una inscripción incluye las siguientes jornadas:' : formatSessionDate(activeDate)}</p>
              <div role="group" aria-label="Horarios del curso seleccionado">
                {dailySessions.map(session => (
                  <button type="button" key={session.id} className={`session-option ${selected?.id === session.id ? 'selected' : ''}`}
                    disabled={session.remainingSeats === 0} aria-pressed={selected?.id === session.id}
                    onClick={() => setParams({ sesion: session.id }, { replace: true })}>
                    <span className="session-schedule">{session.days.map(day => <span key={day.date}>{multiDay && <span className="session-day-label">{formatSessionDate(day.date)}</span>}<span>{day.startTime} – {day.endTime}</span></span>)}</span><span>{session.remainingSeats ? `${Number.isFinite(session.remainingSeats) ? session.remainingSeats : "Sin límite de"} ${session.remainingSeats === 1 ? 'cupo' : 'cupos'}` : 'Sin cupos'}</span>
                  </button>
                ))}
              </div>
            </>}
          </section>
        </section>
        <ReservationSummary course={course} session={selected} dateSelected={Boolean(activeDate)} previewDays={dailySessions[0]?.days}>
          {selected ? <Link className="button button-dark" to={`/cursos/${course.id}/inscripcion?sesion=${selected.id}`}>Continuar inscripción <span aria-hidden="true">→</span></Link>
            : <button type="button" className="button button-dark" disabled>Selecciona fecha y horario</button>}
          <Link className="button button-outline" to={`/cursos/${course.id}`}>Volver al curso</Link>
        </ReservationSummary>
      </div>
    </main>
  );
}
