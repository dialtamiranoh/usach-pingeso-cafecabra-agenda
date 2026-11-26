// Plantilla única de correos de Café Cabra. Todos los correos del sistema (solicitud de
// inscripción, inscripción confirmada, nueva inscripción, comprobante, confirmación y
// cancelación) se arman con estos helpers para compartir encabezado, cuerpo, tarjetas,
// callouts, pie y asunto, con la misma paleta del sitio (#111111 y acento #e6bb08).

export const REMITENTE = 'Café Cabra <no-reply@cafecabra.cl>';
const LOGO = 'https://pub-6fc1f2fb2aec478bb0722992c847da9a.r2.dev/CAFE%20CABRA%20ESCUELA%20BLANCO.png';
const ACENTO = '#e6bb08'; // Amarillo de Café Cabra, igual que en el sitio.

// Escapa texto para interpolar de forma segura dentro del HTML.
export function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function clp(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
}

// Fecha y hora larga en zona de Chile (para plazos de pago).
export function fechaHoraLarga(epoch: number): string {
  if (!epoch) return '';
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Santiago' }).format(new Date(epoch * 1000));
}

// Fecha larga de una jornada (YYYY-MM-DD) sin corrimiento de zona.
export function fechaLarga(fecha: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${fecha}T12:00:00Z`));
}

// Asunto unificado de todos los correos: "<detalle> | Café Cabra".
export function asunto(detalle: string): string {
  return `${detalle} | Café Cabra`;
}

// Estructura base: fondo, tarjeta centrada, header negro con logo y footer con enlaces.
export function layout(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center" style="padding:32px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.10);">
<tr><td style="background:#111111;padding:32px 40px;text-align:center;"><img src="${LOGO}" alt="Café Cabra Escuela" width="200" style="height:auto;display:block;margin:0 auto;border:0;"></td></tr>
<tr><td style="padding:40px 40px 32px;">${body}</td></tr>
<tr><td style="background:#111111;padding:20px 40px;text-align:center;"><p style="font-size:11px;color:#777777;margin:0;"><a href="https://cafecabra.cl" style="color:#aaaaaa;text-decoration:none;">cafecabra.cl</a><span style="color:#444444;margin:0 8px;">•</span><a href="https://www.instagram.com/cafecabra/" style="color:#aaaaaa;text-decoration:none;">@cafecabra</a></p></td></tr>
</table></td></tr></table>
</body>
</html>`;
}

// Título del correo con un párrafo introductorio.
export function encabezado(titulo: string, intro: string): string {
  return `<h2 style="font-size:20px;color:#111111;margin:0 0 10px 0;">${titulo}</h2>
    <p style="font-size:14px;color:#666666;line-height:1.65;margin:0 0 28px 0;">${intro}</p>`;
}

// Tarjeta gris con un título y pares etiqueta/valor.
export function dataCard(title: string, rows: [string, string][]): string {
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

// Bloque de aviso con el acento del sitio. El texto admite HTML (ya viene escapado).
export function callout(text: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
    <tr><td style="background:#fdf3c9;border-left:4px solid ${ACENTO};border-radius:4px;padding:14px 18px;font-size:13px;color:#666666;line-height:1.6;">${text}</td></tr>
  </table>`;
}

export const signoffCliente = `<p style="font-size:14px;color:#666666;line-height:1.7;margin:0;">¡Nos vemos pronto! ☕<br><strong style="color:#111111;">Café Cabra Escuela</strong></p>`;
export const signoffAdmin = `<p style="font-size:14px;color:#666666;line-height:1.7;margin:0;"><strong style="color:#111111;">Café Cabra Escuela</strong></p>`;

// Convierte un mensaje en texto plano (con saltos de línea) en párrafos HTML. Respaldo para
// cuando no se puede reconstruir la versión con tarjetas.
export function textoAParrafo(texto: string): string {
  const cuerpo = esc(texto).replace(/\n/g, '<br>');
  return `<p style="font-size:14px;color:#666666;line-height:1.7;margin:0;">${cuerpo}</p>`;
}