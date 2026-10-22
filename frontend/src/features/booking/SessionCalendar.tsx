import { useEffect, useState } from 'react';
import { formatSessionDate, type BookingSession } from './booking-data';

export function SessionCalendar({ sessions, selectedDate, selectedDates = [selectedDate], onSelectDate }: {
  sessions: BookingSession[];
  selectedDate: string;
  selectedDates?: string[];
  onSelectDate: (date: string) => void;
}) {
  const months = [...new Set(sessions.map(session => session.date.slice(0, 7)))].sort();
  const [month, setMonth] = useState(selectedDate.slice(0, 7) || months[0]);
  useEffect(() => {
    if (selectedDate) setMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);
  const [year, monthNumber] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const offset = (start.getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const monthIndex = months.indexOf(month);
  const label = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(start);

  return (
    <div className="calendar">
      <div className="calendar-toolbar">
        <button type="button" className="calendar-arrow" aria-label="Mes anterior" disabled={monthIndex === 0} onClick={() => setMonth(months[monthIndex - 1])}>←</button>
        <h3 aria-live="polite">{label}</h3>
        <button type="button" className="calendar-arrow" aria-label="Mes siguiente" disabled={monthIndex === months.length - 1} onClick={() => setMonth(months[monthIndex + 1])}>→</button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">{['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'].map(day => <span key={day}>{day}</span>)}</div>
      <div className="calendar-days" role="group" aria-label={`Fechas de ${label}`}>
        {Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: days }, (_, index) => {
          const day = index + 1;
          const date = `${month}-${String(day).padStart(2, '0')}`;
          const daySessions = sessions.filter(session => session.date === date);
          const available = daySessions.some(session => session.remainingSeats > 0);
          const full = daySessions.length > 0 && !available;
          return (
            <button key={date} type="button" className={`calendar-day ${available ? 'available' : ''} ${selectedDates.includes(date) ? 'selected' : ''} ${full ? 'full' : ''}`}
              disabled={!available} aria-pressed={selectedDates.includes(date)}
              aria-label={`${formatSessionDate(date)}${available ? ', disponible' : full ? ', sin cupos' : ', sin actividad'}`}
              onClick={() => onSelectDate(date)}>{day}</button>
          );
        })}
      </div>
      <div className="calendar-legend"><span><i className="available" />Disponible</span><span><i className="selected" />Seleccionado</span><span><i className="full" />Sin cupos</span></div>
    </div>
  );
}
