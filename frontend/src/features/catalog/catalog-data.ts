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
  const sessions: BookingSession[] = event.status !== 'ABIERTO' ? [] : (event.editions ?? []).flatMap(edition => {
    if (edition.status !== 'ABIERTO') return [];
    const days = edition.dates.flatMap(day => {
      const times = day.schedule?.match(/^([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*([01]\d|2[0-3]):[0-5]\d$/);
      if (!times) return [];
      const [startTime, endTime] = day.schedule!.split(/\s*[-–]\s*/);
      return startTime < endTime ? [{ date: day.date, startTime, endTime }] : [];
    });
    if (!days.length || days.length !== edition.dates.length) return [];
    return [{ ...days[0], id: edition.id, courseId: event.id, days, remainingSeats: edition.remainingSeats ?? Infinity }];
  });
  return {
    ...event, image: event.image ?? '', images: event.images?.length ? event.images : event.image ? [event.image] : [], imageAlt: event.title, action: event.type === 'Curso' ? 'Ver curso' : 'Ver evento',
    topics: event.description.split('\n').filter(line => line.startsWith('• ')).map(line => line.slice(2)),
    sessions,
  };
}
