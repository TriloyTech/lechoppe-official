import nodemailer from 'nodemailer';
import type { SendMailOptions, Transporter } from 'nodemailer';
import { bookingDate, language, type EventKind, type Language } from '../reservations/model.ts';
export interface ReservationMail { kind:EventKind; audience:'customer'|'restaurant'; id:string; name:string; email:string; phone:string; date:string; time:string; party_size:number; lang:Language; notes:string; reason:string; contact:string; managementUrl:string }
const copy = {
 fr: ['Demande de réservation reçue — en attente de confirmation du restaurant.', 'Votre réservation est confirmée.', 'Votre demande de réservation a été refusée.', 'Votre réservation confirmée a été annulée.', 'Référence', 'Convives', 'Motif', 'Notes', 'Nouvelle demande de réservation'],
 en: ['Reservation request received — awaiting restaurant confirmation.', 'Your reservation is confirmed.', 'Your reservation request was declined.', 'Your confirmed reservation was cancelled.', 'Reference', 'Guests', 'Reason', 'Notes', 'New reservation request'],
 es: ['Solicitud recibida — pendiente de confirmación del restaurante.', 'Su reserva está confirmada.', 'Su solicitud de reserva ha sido rechazada.', 'Su reserva confirmada ha sido cancelada.', 'Referencia', 'Comensales', 'Motivo', 'Notas', 'Nueva solicitud de reserva'],
 it: ['Richiesta ricevuta — in attesa di conferma del ristorante.', 'La prenotazione è confermata.', 'La richiesta di prenotazione è stata rifiutata.', 'La prenotazione confermata è stata annullata.', 'Riferimento', 'Ospiti', 'Motivo', 'Note', 'Nuova richiesta di prenotazione'],
};
export const escapeHtml = (v:string) => v.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function rendered(subject:string, text:string) { return {subject, text, html:`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(text)}</div>`}; }
export function renderReservation(input: ReservationMail) {
 const lang = input.audience === 'restaurant' ? 'fr' : language(input.lang), c = copy[lang];
 const title = input.audience === 'restaurant' ? c[8] : c[['received','confirmed','declined','cancelled'].indexOf(input.kind)];
 const lines = ["L'Échoppe", title, `${c[4]}: ${input.id}`, input.name, bookingDate(input.date,input.time,lang), `${c[5]}: ${input.party_size}`];
 if (input.reason) lines.push(`${c[6]}: ${input.reason}`);
 if (input.notes) lines.push(`${c[7]}: ${input.notes}`);
 if (input.audience === 'restaurant') lines.push(input.email,input.phone,input.managementUrl);
 lines.push(input.contact);
 const result = rendered(`${title} — ${input.id}`,lines.filter(Boolean).join('\n\n'));
 if (input.audience === 'restaurant' && input.managementUrl) result.html += `<p><a href="${escapeHtml(input.managementUrl)}">Gérer les réservations</a></p>`;
 return result;
}
export function renderReservationTest() { return rendered("L'Échoppe — Test des notifications de réservation", "Test des notifications de réservation. L'acceptation par le prestataire ne garantit pas la livraison en boîte de réception."); }
export function providerConfigured() {
  const provider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  return Boolean(
    (provider === 'gmail' || (!provider && process.env.GMAIL_SMTP_USER)) &&
    process.env.GMAIL_SMTP_USER?.trim() &&
    process.env.GMAIL_SMTP_APP_PASSWORD?.trim() &&
    process.env.EMAIL_FROM?.trim()
  );
}

export function createSmtpTransporter(): Transporter {
  const user = process.env.GMAIL_SMTP_USER?.trim();
  const pass = process.env.GMAIL_SMTP_APP_PASSWORD?.trim();

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 15000,
  });
}

export function mapSmtpError(err: unknown): Error {
  if (err instanceof Error && /^(provider_(missing|auth_failed|timeout|rejected|uncertain))$/.test(err.message)) {
    return err;
  }
  const anyErr = err as Record<string, any> | null | undefined;
  const code = String(anyErr?.code || '').toUpperCase();
  const responseCode = Number(anyErr?.responseCode) || 0;
  const message = String(anyErr?.message || '').toLowerCase();

  if (code === 'EAUTH' || responseCode === 535 || /auth|password|credential|535|invalid login/i.test(message)) {
    return new Error('provider_auth_failed');
  }

  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    code === 'ECONNRESET' ||
    /timeout|timed out|etimedout|esockettimedout/i.test(message)
  ) {
    return new Error('provider_timeout');
  }

  if (
    (responseCode >= 500 && responseCode < 600) ||
    code === 'EMESSAGE' ||
    (Array.isArray(anyErr?.rejected) && anyErr?.rejected.length > 0) ||
    /rejected|mailbox unavailable|user unknown|recipient rejected/i.test(message)
  ) {
    return new Error('provider_rejected');
  }

  return new Error('provider_uncertain');
}

export type SmtpTransportMock =
  | Transporter
  | { sendMail: (options: SendMailOptions) => Promise<{ messageId?: string; [key: string]: any }> }
  | ((options: SendMailOptions) => Promise<{ messageId?: string; id?: string; [key: string]: any }>);

export async function sendReservationEmail(
  to: string,
  message: ReturnType<typeof rendered>,
  key: string,
  transport?: SmtpTransportMock,
  from = process.env.EMAIL_FROM
) {
  if (!providerConfigured() || !from) throw new Error('provider_missing');

  const mailOptions: SendMailOptions = {
    from,
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    headers: {
      'X-Entity-Ref-ID': key,
      'X-Idempotency-Key': key,
    },
  };

  let info: { messageId?: string; id?: string } | undefined;
  try {
    if (transport && typeof (transport as any).sendMail === 'function') {
      info = await (transport as any).sendMail(mailOptions);
    } else if (typeof transport === 'function') {
      info = await (transport as any)(mailOptions);
    } else {
      const client = createSmtpTransporter();
      info = await client.sendMail(mailOptions);
    }
  } catch (err) {
    throw mapSmtpError(err);
  }

  const messageId = info?.messageId || info?.id;
  if (!messageId || typeof messageId !== 'string') {
    throw new Error('provider_uncertain');
  }

  return messageId;
}
