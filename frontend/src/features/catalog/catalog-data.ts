import type { CatalogEvent } from '@cafecabra/shared';
import type { BookingSession } from '../booking/booking-data';

export interface CatalogItem extends Omit<CatalogEvent, 'image'> {
  image: string;
  imageAlt: string;
  action: string;
  topics: string[];
  sessions: BookingSession[];
}
// Fotografía decorativa provisional, no es una foto oficial del curso.
export const heroImage = 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=85';
export const formatPrice = (price: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);

export function toCatalogItem(event: CatalogEvent): CatalogItem {
  // Fechas alternativas por defecto; las jornadas conjuntas se configuran explícitamente.
  const days = event.dates.flatMap(day => {
    const times = day.schedule?.match(/^(\d{2}:\d{2})\s*[-–]\s*(\d{2}:\d{2})$/);
    return times ? [{ id: day.id, date: day.date, startTime: times[1], endTime: times[2] }] : [];
  });
  const first = days[0];
  const sessions: BookingSession[] = event.status !== 'ABIERTO' ? [] : event.dateMode === 'CONJUNTAS'
    ? first && days.length === event.dates.length ? [{ ...first, courseId: event.id, id: `evento-${event.id}`, days, remainingSeats: event.remainingSeats ?? Infinity }] : []
    : days.map(day => ({ ...day, id: `fecha-${day.id}`, courseId: event.id, days: [day], remainingSeats: event.remainingSeats ?? Infinity }));
  return {
    ...event, image: event.image ?? '', imageAlt: event.title, action: event.type === 'Curso' ? 'Ver curso' : 'Ver evento',
    topics: event.description.split('\n').filter(line => line.startsWith('• ')).map(line => line.slice(2)),
    sessions,
  };
}
