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
export function providerConfigured() { return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()); }
export async function sendReservationEmail(to:string, message:ReturnType<typeof rendered>, key:string, send = fetch, from = process.env.RESEND_FROM_EMAIL) {
 if (!providerConfigured() || !from) throw new Error('provider_missing');
 let response: Response;
 try { response = await send('https://api.resend.com/emails', {method:'POST', signal:AbortSignal.timeout(15000), headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type':'application/json','Idempotency-Key':key}, body:JSON.stringify({from,to:[to],...message})}); }
 catch { throw new Error('provider_uncertain'); }
 if (!response.ok) throw new Error(`provider_http_${response.status}`);
 let body;
 try { body = await response.json(); } catch { throw new Error('provider_uncertain'); }
 if (typeof body.id !== 'string') throw new Error('provider_uncertain');
 return body.id as string;
}
