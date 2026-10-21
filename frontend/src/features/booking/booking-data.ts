// Sesiones ficticias para revisar el frontend. No son disponibilidad real.
export interface DemoSession {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  remainingSeats: number;
}

export const demoSessions: DemoSession[] = [
  { id: 'latte-oct-18-am', courseId: 'latte-art', date: '2026-10-18', startTime: '10:00', endTime: '12:00', remainingSeats: 2 },
  { id: 'latte-oct-18-pm', courseId: 'latte-art', date: '2026-10-18', startTime: '15:00', endTime: '17:00', remainingSeats: 0 },
  { id: 'latte-oct-25', courseId: 'latte-art', date: '2026-10-25', startTime: '10:00', endTime: '12:00', remainingSeats: 4 },
  { id: 'latte-nov-07', courseId: 'latte-art', date: '2026-11-07', startTime: '11:00', endTime: '13:00', remainingSeats: 1 },
  { id: 'cata-oct-17', courseId: 'catas', date: '2026-10-17', startTime: '16:00', endTime: '18:00', remainingSeats: 4 },
  { id: 'cata-oct-24', courseId: 'catas', date: '2026-10-24', startTime: '16:00', endTime: '18:00', remainingSeats: 0 },
  { id: 'cata-nov-14', courseId: 'catas', date: '2026-11-14', startTime: '16:00', endTime: '18:00', remainingSeats: 3 },
];

export const demoLocation = 'Café Cabra · Av. Olimpo 735, Maipú';
export const formatSessionDate = (date: string) => new Intl.DateTimeFormat('es-CL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${date}T12:00:00Z`));

export interface EnrollmentDraft {
  name: string;
  phone: string;
  email: string;
  notes: string;
  confirmed: boolean;
}

export const emptyDraft: EnrollmentDraft = { name: '', phone: '', email: '', notes: '', confirmed: false };

export function validateDraft(draft: EnrollmentDraft): Partial<Record<keyof EnrollmentDraft, string>> {
  const errors: Partial<Record<keyof EnrollmentDraft, string>> = {};
  if (draft.name.trim().length < 3) errors.name = 'Ingresa tu nombre completo.';
  const phone = draft.phone.replace(/\D/g, '');
  if (!/^[+\d\s().-]+$/.test(draft.phone) || phone.length < 9 || phone.length > 15) {
    errors.phone = 'Ingresa un teléfono válido, por ejemplo +56 9 1234 5678.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Ingresa un correo electrónico válido.';
  if (!draft.confirmed) errors.confirmed = 'Confirma que los datos ingresados son correctos.';
  return errors;
}
