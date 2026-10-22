import { isValidRut } from './enrollment-options';

// Selección de inscripción para un evento; todas sus jornadas están incluidas.
export interface BookingSession {
  id: string;
  courseId: string;
  date: string;
  startTime: string;
  endTime: string;
  remainingSeats: number;
  days: { date: string; startTime: string; endTime: string }[];
}

export const formatSessionDate = (date: string) => new Intl.DateTimeFormat('es-CL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
}).format(new Date(`${date}T12:00:00Z`));

export interface EnrollmentDraft {
  name: string;
  phone: string;
  email: string;
  instagram: string;
  dietaryPreference: string;
  dietaryOther: string;
  allergyStatus: '' | 'no' | 'yes' | 'undisclosed';
  allergyDetails: string;
  payerSameAsAttendee: boolean;
  payerName: string;
  payerRut: string;
  originBank: string;
  accountLastFour: string;
  notes: string;
  confirmed: boolean;
}

export const emptyDraft: EnrollmentDraft = {
  name: '', phone: '', email: '', instagram: '', dietaryPreference: '', dietaryOther: '',
  allergyStatus: '', allergyDetails: '', payerSameAsAttendee: true, payerName: '',
  payerRut: '', originBank: '', accountLastFour: '', notes: '', confirmed: false,
};

export function validatePersonalDetails(draft: EnrollmentDraft): Partial<Record<keyof EnrollmentDraft, string>> {
  const errors: Partial<Record<keyof EnrollmentDraft, string>> = {};
  if (draft.name.trim().length < 3) errors.name = 'Ingresa tu nombre completo.';
  const phone = draft.phone.replace(/\D/g, '');
  if (!/^[+\d\s().-]+$/.test(draft.phone) || phone.length < 9 || phone.length > 15) {
    errors.phone = 'Ingresa un teléfono válido, por ejemplo +56 9 1234 5678.';
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Ingresa un correo electrónico válido.';
  if (draft.instagram.trim() && !/^@?[a-zA-Z0-9._]{1,30}$/.test(draft.instagram.trim())) {
    errors.instagram = 'Ingresa tu usuario de Instagram, con o sin @, sin enlaces ni espacios.';
  }
  if (draft.dietaryPreference === 'other' && !draft.dietaryOther.trim()) errors.dietaryOther = 'Cuéntanos cuál es tu preferencia alimentaria.';
  if (draft.allergyStatus === 'yes' && !draft.allergyDetails.trim()) errors.allergyDetails = 'Indica qué alimentos o ingredientes debemos considerar.';
  return errors;
}

export function validateTransferDetails(draft: EnrollmentDraft): Partial<Record<keyof EnrollmentDraft, string>> {
  const errors: Partial<Record<keyof EnrollmentDraft, string>> = {};
    if (!draft.payerSameAsAttendee && draft.payerName.trim().length < 3) errors.payerName = 'Ingresa el nombre completo del titular que hará la transferencia.';
    if (!isValidRut(draft.payerRut)) errors.payerRut = 'Ingresa un RUT válido con dígito verificador, por ejemplo 12.345.678-5.';
    if (draft.originBank.trim().length < 2) errors.originBank = 'Indica el banco desde el que se hará la transferencia.';
    if (draft.accountLastFour.trim() && !/^\d{4}$/.test(draft.accountLastFour.trim())) errors.accountLastFour = 'Ingresa solo los últimos cuatro dígitos de la cuenta.';
  return errors;
}

export function validateDraft(draft: EnrollmentDraft, requiresPayment = false): Partial<Record<keyof EnrollmentDraft, string>> {
  const errors = { ...validatePersonalDetails(draft), ...(requiresPayment ? validateTransferDetails(draft) : {}) };
  if (!draft.confirmed) errors.confirmed = 'Confirma que los datos ingresados son correctos.';
  return errors;
}
