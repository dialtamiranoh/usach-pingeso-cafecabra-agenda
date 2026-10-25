import { Resend } from 'resend';
import type { TransferDetails } from '@cafecabra/shared';

const LOGO = 'https://pub-6fc1f2fb2aec478bb0722992c847da9a.r2.dev/CAFE%20CABRA%20ESCUELA%20BLANCO.png';

export interface EnrollmentEmailInput {
  apiKey: string;
  adminEmail: string;
  clientEmail: string;
  clientName: string;
  courseTitle: string;
  code: string;
  phone: string;
  instagram: string;
  paid: boolean;
  transfer?: TransferDetails;
  payer?: { rut: string; bank: string; account: string };
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function clp(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

function deadline(expiraEn: number): string {
  if (!expiraEn) return '';
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago',
  }).format(new Date(expiraEn * 1000));
}

function layout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">
<tr><td style="background:#111111;padding:32px 40px;text-align:center;"><img src="${LOGO}" alt="Café Cabra Escuela" width="200" style="height:auto;display:block;margin:0 auto;border:0;"></td></tr>
<tr><td style="padding:40px 40px 32px;">${body}</td></tr>
<tr><td style="background:#111111;padding:20px 40px;text-align:center;"><p style="font-size:11px;color:#777777;margin:0;"><a href="https://cafecabra.cl" style="color:#aaaaaa;text-decoration:none;">cafecabra.cl</a><span style="color:#444444;margin:0 8px;">·</span><a href="https://www.instagram.com/cafecabra/" style="color:#aaaaaa;text-decoration:none;">@cafecabra</a></p></td></tr>
</table></td></tr></table>
</body>
</html>`;
}

function dataCard(title: string, rows: [string, string][]): string {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="font-size:13px;color:#999999;padding:6px 0;width:42%;vertical-align:top;">${esc(label)}</td>
      <td style="font-size:13px;color:#111111;font-weight:500;padding:6px 0;vertical-align:top;">${esc(value)}</td>
    </tr>`).join('');
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:20px;">
    <tr><td style="padding:20px 24px;">
      <p style="font-size:10px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#999999;margin:0 0 14px 0;">${esc(title)}</p>
      <table width="100%" cellpadding="0" cellspacing="0">${cells}</table>
    </td></tr>
  </table>`;
}

function callout(text: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td style="background:#fff8e7;border-left:4px solid #f3b228;border-radius:4px;padding:14px 18px;font-size:13px;color:#666666;line-height:1.6;">${text}</td></tr>
  </table>`;
}

const signoffClient = `<p style="font-size:14px;color:#666666;line-height:1.7;margin:0;">¡Nos vemos pronto! ☕<br><strong style="color:#111111;">Café Cabra Escuela</strong></p>`;
const signoffAdmin = `<p style="font-size:14px;color:#666666;line-height:1.7;margin:0;"><strong style="color:#111111;">Café Cabra Escuela</strong></p>`;

function clientHtml(input: EnrollmentEmailInput): string {
  const head = `<h2 style="font-size:20px;color:#111111;margin:0 0 10px 0;">¡Hola ${esc(input.clientName)}! 🐐</h2>`;
  if (!input.paid || !input.transfer) {
    const body = `${head}
      <p style="font-size:14px;color:#666666;line-height:1.65;margin:0 0 28px 0;">
        Tu inscripción en <strong style="color:#111111;">${esc(input.courseTitle)}</strong> quedó <strong style="color:#111111;">confirmada</strong>.<br><br>
        Tu código de reserva es <strong style="color:#111111;">${esc(input.code)}</strong>.
      </p>
      ${callout('Guarda tu código de reserva por si necesitas contactarnos.')}
      ${signoffClient}`;
    return layout(body);
  }
  const t = input.transfer;
  const plazo = deadline(t.expiraEn);
  const body = `${head}
    <p style="font-size:14px;color:#666666;line-height:1.65;margin:0 0 28px 0;">
      Recibimos tu solicitud de inscripción en <strong style="color:#111111;">${esc(input.courseTitle)}</strong>.<br><br>
      Para confirmar tu cupo, realiza la transferencia por <strong style="color:#111111;">${clp(t.monto)}</strong> con los siguientes datos:
    </p>
    ${dataCard('Datos de transferencia', [
      ['Titular', t.titular], ['RUT', t.rut], ['Banco', t.banco],
      ['Tipo de cuenta', t.tipoCuenta], ['N° de cuenta', t.numeroCuenta], ['Correo', t.correo],
    ])}
    ${dataCard('Tu reserva', [['Código', input.code], ['Monto', clp(t.monto)]])}
    ${callout(`Al transferir, agrega <strong style="color:#111111;">${esc(t.correo)}</strong> en el campo de email o notificación del destinatario, o envíanos el comprobante a ese correo.${plazo ? ` Tienes plazo para pagar hasta el <strong style="color:#111111;">${esc(plazo)}</strong>.` : ''}`)}
    ${signoffClient}`;
  return layout(body);
}

function adminHtml(input: EnrollmentEmailInput): string {
  const modalidad = input.paid ? 'Con pago — pendiente de transferencia' : 'Gratuita — confirmada';
  const alumno = dataCard('Datos del alumno', [
    ['Nombre', input.clientName], ['Email', input.clientEmail],
    ['Teléfono', input.phone || '—'], ['Instagram', input.instagram || '—'],
  ]);
  const inscripcion = dataCard('Inscripción', [
    ['Curso', input.courseTitle], ['Código', input.code], ['Modalidad', modalidad],
  ]);
  const bancarios = input.paid && input.payer
    ? dataCard('Datos bancarios declarados por el cliente', [
        ['RUT titular', input.payer.rut], ['Banco', input.payer.bank], ['N° de cuenta', input.payer.account],
      ])
    : '';
  const aviso = input.paid
    ? callout('Confirma el pago cuando llegue la transferencia a <strong style="color:#111111;">pagos@cafecabra.cl</strong> o a la cuenta SumUp.')
    : '';
  const body = `
    <h2 style="font-size:20px;color:#111111;margin:0 0 10px 0;">Nueva inscripción 📋</h2>
    <p style="font-size:14px;color:#666666;line-height:1.65;margin:0 0 28px 0;">
      <strong style="color:#111111;">${esc(input.clientName)}</strong> se inscribió en <strong style="color:#111111;">${esc(input.courseTitle)}</strong>.
    </p>
    ${alumno}
    ${inscripcion}
    ${bancarios}
    ${aviso}
    ${signoffAdmin}`;
  return layout(body);
}

export async function sendEnrollmentEmails(input: EnrollmentEmailInput): Promise<void> {
  const resend = new Resend(input.apiKey);
  const subjectClient = input.paid
    ? `¡Solicitud recibida! – ${input.courseTitle} | Café Cabra`
    : `¡Inscripción confirmada! – ${input.courseTitle} | Café Cabra`;
  const tasks = [
    resend.emails.send({ from: 'Café Cabra <no-reply@cafecabra.cl>', to: [input.clientEmail], subject: subjectClient, html: clientHtml(input) }),
    resend.emails.send({ from: 'Café Cabra <no-reply@cafecabra.cl>', to: [input.adminEmail], subject: `[Nueva inscripción] ${input.clientName} – ${input.courseTitle}`, html: adminHtml(input) }),
  ];
  const results = await Promise.allSettled(tasks);
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Error enviando correo ${index === 0 ? 'al cliente' : 'al admin'}:`, result.reason);
    }
  });
}