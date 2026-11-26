import { Resend } from 'resend';
import type { TransferDetails } from '@cafecabra/shared';
import {
  REMITENTE, esc, clp, fechaHoraLarga, fechaLarga, asunto,
  layout, encabezado, dataCard, callout, signoffCliente, signoffAdmin,
} from './plantilla';

export interface EnrollmentEmailInput {
  apiKey: string;
  adminEmail: string;
  clientEmail: string;
  clientName: string;
  courseTitle: string;
  dates?: { date: string; schedule: string }[];
  code: string;
  phone: string;
  instagram: string;
  paid: boolean;
  transfer?: TransferDetails;
  payer?: { rut: string; bank: string; accountType: string; account: string };
}

function datesCard(input: EnrollmentEmailInput): string {
  if (!input.dates?.length) return '';
  return dataCard('Fechas de tu inscripción', input.dates.map(day => [fechaLarga(day.date), day.schedule]));
}

function clientHtml(input: EnrollmentEmailInput): string {
  if (!input.paid || !input.transfer) {
    const body = `${encabezado(`¡Hola ${esc(input.clientName)}! 🐐`,
      `Tu inscripción en <strong style="color:#111111;">${esc(input.courseTitle)}</strong> quedó <strong style="color:#111111;">confirmada</strong>.<br><br>Tu código de reserva es <strong style="color:#111111;">${esc(input.code)}</strong>.`)}
      ${datesCard(input)}
      ${callout('Guarda tu código de reserva por si necesitas contactarnos.')}
      ${signoffCliente}`;
    return layout(body);
  }
  const t = input.transfer;
  const plazo = fechaHoraLarga(t.expiraEn);
  const body = `${encabezado(`¡Hola ${esc(input.clientName)}! 🐐`,
    `Recibimos tu solicitud de inscripción en <strong style="color:#111111;">${esc(input.courseTitle)}</strong>.<br><br>Para confirmar tu cupo, realiza la transferencia por <strong style="color:#111111;">${clp(t.monto)}</strong> con los siguientes datos:`)}
    ${dataCard('Datos de transferencia', [
      ['Titular', t.titular], ['RUT', t.rut], ['Banco', t.banco],
      ['Tipo de cuenta', t.tipoCuenta], ['N° de cuenta', t.numeroCuenta], ['Correo', t.correo],
    ])}
    ${dataCard('Tu reserva', [['Código', input.code], ['Monto', clp(t.monto)]])}
    ${datesCard(input)}
    ${callout(`Al transferir, agrega <strong style="color:#111111;">${esc(t.correo)}</strong> en el campo de email o notificación del destinatario, o envíanos el comprobante a ese correo.${plazo ? ` Tienes plazo para pagar hasta el <strong style="color:#111111;">${esc(plazo)}</strong>.` : ''}`)}
    ${signoffCliente}`;
  return layout(body);
}

function adminHtml(input: EnrollmentEmailInput): string {
  const modalidad = input.paid ? 'Con pago - pendiente de transferencia' : 'Gratuita - confirmada';
  const alumno = dataCard('Datos del alumno', [
    ['Nombre', input.clientName], ['Email', input.clientEmail],
    ['Teléfono', input.phone || '-'], ['Instagram', input.instagram || '-'],
  ]);
  const inscripcion = dataCard('Inscripción', [
    ['Curso', input.courseTitle], ['Código', input.code], ['Modalidad', modalidad],
  ]);
  const bancarios = input.paid && input.payer
    ? dataCard('Datos bancarios declarados por el cliente', [
        ['RUT titular', input.payer.rut], ['Banco', input.payer.bank], ['Tipo de cuenta', input.payer.accountType], ['N° de cuenta', input.payer.account],
      ])
    : '';
  const aviso = input.paid
    ? callout('Confirma el pago cuando llegue la transferencia a <strong style="color:#111111;">pagos@cafecabra.cl</strong> o a la cuenta SumUp.')
    : '';
  const body = `${encabezado('Nueva inscripción 📋',
    `<strong style="color:#111111;">${esc(input.clientName)}</strong> se inscribió en <strong style="color:#111111;">${esc(input.courseTitle)}</strong>.`)}
    ${alumno}
    ${inscripcion}
    ${datesCard(input)}
    ${bancarios}
    ${aviso}
    ${signoffAdmin}`;
  return layout(body);
}

export async function sendEnrollmentEmails(input: EnrollmentEmailInput): Promise<void> {
  const resend = new Resend(input.apiKey);
  const subjectClient = input.paid
    ? asunto(`Solicitud recibida: ${input.courseTitle}`)
    : asunto(`Inscripción confirmada: ${input.courseTitle}`);
  const tasks = [
    resend.emails.send({ from: REMITENTE, to: [input.clientEmail], subject: subjectClient, html: clientHtml(input) }),
    resend.emails.send({ from: REMITENTE, to: [input.adminEmail], subject: asunto(`Nueva inscripción: ${input.clientName} - ${input.courseTitle}`), html: adminHtml(input) }),
  ];
  const results = await Promise.allSettled(tasks);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Error enviando correo ${index === 0 ? 'al cliente' : 'al admin'}:`, result.reason);
    }
  });
}