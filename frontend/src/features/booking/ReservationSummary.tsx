import type { ReactNode } from 'react';
import { formatPrice, type CatalogItem } from '../catalog/catalog-data';
import { formatSessionDate, type BookingSession } from './booking-data';

export function ReservationSummary({ course, session, dateSelected = Boolean(session), previewDays = [], persisted = false, children }: { course: CatalogItem; session?: BookingSession; dateSelected?: boolean; previewDays?: BookingSession['days']; persisted?: boolean; children?: ReactNode }) {
  return (
    <aside className="reservation-summary" aria-label="Resumen de tu selección">
      <p className="eyebrow">TU EXPERIENCIA</p>
      <h2>Tu reserva</h2>
      <p className="muted">Resumen de la selección realizada</p>
      <div className="summary-box">
        <dl>
          <div><dt>Curso o actividad</dt><dd>{course.title}</dd></div>
          <div><dt>Valor por participante</dt><dd>{course.requiresPayment ? formatPrice(course.price) : 'Entrada liberada'}</dd></div>
          <div><dt>{course.dateMode === 'CONJUNTAS' ? 'Jornadas incluidas' : 'Fecha seleccionada'}</dt><dd>{dateSelected ? (session?.days ?? previewDays).map(day => <div key={day.date}>{formatSessionDate(day.date)}</div>) : 'Selecciona una fecha'}</dd></div>
          <div><dt>Horario</dt><dd>{session ? `${session.startTime} – ${session.endTime}` : 'Selecciona un horario'}</dd></div>
          <div><dt>Ubicación</dt><dd>{course.location}</dd></div>
        </dl>
        {children}
      </div>
      {!persisted && <p className="summary-disclaimer">{course.requiresPayment ? 'La inscripción aún no guarda ni reserva un cupo.' : 'El cupo se reserva al confirmar la inscripción.'}</p>}
    </aside>
  );
}
