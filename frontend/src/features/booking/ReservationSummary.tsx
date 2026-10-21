import type { ReactNode } from 'react';
import type { CatalogItem } from '../catalog/catalog-data';
import { demoLocation, formatSessionDate, type DemoSession } from './booking-data';

export function ReservationSummary({ course, session, children }: { course: CatalogItem; session?: DemoSession; children?: ReactNode }) {
  return (
    <aside className="reservation-summary" aria-label="Resumen de tu selección">
      <p className="eyebrow">TU EXPERIENCIA</p>
      <h2>Tu reserva</h2>
      <p className="muted">Resumen de la selección realizada</p>
      <div className="summary-box">
        <dl>
          <div><dt>Curso o actividad</dt><dd>{course.title}</dd></div>
          <div><dt>Fecha</dt><dd>{session ? formatSessionDate(session.date) : 'Selecciona una fecha'}</dd></div>
          <div><dt>Horario</dt><dd>{session ? `${session.startTime} – ${session.endTime}` : 'Selecciona un horario'}</dd></div>
          <div><dt>Ubicación</dt><dd>{demoLocation}</dd></div>
        </dl>
        {children}
      </div>
      <p className="summary-disclaimer">Selección de ejemplo. No se está reservando un cupo.</p>
    </aside>
  );
}
