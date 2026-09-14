'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useLang } from '@/context/LangContext';
import type { Reservation } from '@/lib/postgres/types';
import { newArrivals } from '@/lib/reservations/model';
import { playOrderChime } from '@/components/takeaway/audio/orderChime';

export function useReservationPolling(setReservations:(rows:Reservation[])=>void) {
 const [error,setError]=useState('');
 const [arrival,setArrival]=useState<Reservation|null>(null);
 const [sound,setSound]=useState(false);
 const [problems,setProblems]=useState(0);
 const seen=useRef<Set<string>|null>(null), soundRef=useRef(false), stopped=useRef(false), busy=useRef(false);
 const controller=useRef<AbortController|null>(null);
 const refresh=useCallback(async()=>{
  if(stopped.current || busy.current)return;
  busy.current=true; controller.current=new AbortController();
  try {
   const res=await fetch('/api/admin/reservations',{cache:'no-store',signal:controller.current.signal});
   if(res.status===401){stopped.current=true;throw new Error('session');}
   if(!res.ok)throw new Error('refresh');
   const data=await res.json(); if(stopped.current)return;
   const rows:Reservation[]=data.reservations, arrivals=newArrivals(seen.current,rows);
   seen.current=new Set(rows.map(r=>r.id)); setReservations(rows);setProblems(data.problems);setError('');
   if(arrivals.length){
    const latest=arrivals[arrivals.length-1] as Reservation;setArrival(latest);
    if(soundRef.current){
     const chime=async()=>{
      try {const key=`reservation-chime:${latest.id}`;if(localStorage.getItem(key))return;localStorage.setItem(key,String(Date.now()));await playOrderChime();}catch{setError('sound');}
     };
     if(navigator.locks) await navigator.locks.request('reservation-chime',chime);else await chime();
    }
   }
  }catch(e){if(!stopped.current || (e instanceof Error && e.message==='session'))setError(e instanceof Error && e.message==='session'?'session':'refresh');}
  finally{busy.current=false;}
 },[setReservations]);
 useEffect(()=>{
  stopped.current=false;
  try{soundRef.current=localStorage.getItem('reservation-sound')==='true';setSound(soundRef.current);}catch{}
  const storage=(e:StorageEvent)=>{if(e.key==='reservation-sound'){soundRef.current=e.newValue==='true';setSound(soundRef.current);}};
  window.addEventListener('storage',storage);void refresh();const timer=setInterval(()=>void refresh(),10000);
  return()=>{stopped.current=true;controller.current?.abort();clearInterval(timer);window.removeEventListener('storage',storage);};
 },[refresh]);
 const toggleSound=async()=>{const enabled=!soundRef.current;soundRef.current=enabled;setSound(enabled);try{localStorage.setItem('reservation-sound',String(enabled));if(enabled)await playOrderChime();}catch{setError('sound');}};
 const stop=()=>{stopped.current=true;controller.current?.abort();};
 return {error,arrival,sound,problems,refresh,toggleSound,stop,dismiss:()=>setArrival(null)};
}
export function ReservationAlerts({state,open,settings}:{state:ReturnType<typeof useReservationPolling>;open:(id:string)=>void;settings:()=>void}){
 const {t}=useLang();
 return <div className="mb-5 p-4 bg-surface text-fg border border-theme rounded-xl space-y-3 text-sm">
  <div className="flex flex-wrap gap-4">
   <button onClick={state.toggleSound}>{state.sound?t({fr:'Couper le son',en:'Mute sound',es:'Silenciar',it:'Disattiva audio'}):t({fr:'Activer le son',en:'Enable sound',es:'Activar sonido',it:'Attiva audio'})}</button>
   <button onClick={()=>void state.refresh()}>{t({fr:'Actualiser les réservations',en:'Refresh reservations',es:'Actualizar reservas',it:'Aggiorna prenotazioni'})}</button>
   {state.problems>0 && <button onClick={settings}>{t({fr:'Problèmes de notification',en:'Notification problems',es:'Problemas de notificación',it:'Problemi di notifica'})}: {state.problems}</button>}
  </div>
  {state.error && <p role="alert">{state.error==='session'?t({fr:'Session expirée. Reconnectez-vous.',en:'Session expired. Sign in again.',es:'Sesión caducada. Inicie sesión.',it:'Sessione scaduta. Accedi di nuovo.'}):state.error==='sound'?t({fr:'Son indisponible. Réactivez-le pour réessayer.',en:'Sound unavailable. Enable it again to retry.',es:'Sonido no disponible. Actívelo de nuevo.',it:'Audio non disponibile. Riattivalo.'}):t({fr:'Actualisation impossible. Les données peuvent être anciennes. Réessayez.',en:'Refresh failed. Data may be outdated. Retry.',es:'Error al actualizar. Los datos pueden estar desactualizados. Reintente.',it:'Aggiornamento fallito. I dati potrebbero essere obsoleti. Riprova.'})} {state.error==='session'&&<a href="/admin/login">{t({fr:'Connexion',en:'Sign in',es:'Acceder',it:'Accedi'})}</a>}</p>}
  {state.arrival && <div role="status" className="flex flex-wrap gap-4"><button onClick={()=>open(state.arrival!.id)}>{t({fr:'Nouvelle demande',en:'New request',es:'Nueva solicitud',it:'Nuova richiesta'})}: {state.arrival.name} · {state.arrival.date} · {state.arrival.time}</button><button onClick={state.dismiss} aria-label={t({fr:'Fermer',en:'Dismiss',es:'Cerrar',it:'Chiudi'})}>×</button></div>}
 </div>;
}
export default function ReservationNotificationSettings(){
 const {t}=useLang();const [recipient,setRecipient]=useState(''),[data,setData]=useState<any>(null),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{const res=await fetch('/api/admin/reservation-notifications',{cache:'no-store'});if(!res.ok)throw new Error(String(res.status));const json=await res.json();setData(json);setRecipient(json.recipient);},[]);
 useEffect(()=>{load().catch(()=>setFeedback('error'));},[load]);
 const action=async(path:string,body?:object)=>{setBusy(true);setFeedback('');try{const res=await fetch(`/api/admin/reservation-notifications${path}`,{method:path?'POST':'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});if(!res.ok){setFeedback(res.status===401?'session':res.status===429?'rate':res.status===502?'provider':'error');return;}setFeedback(path==='/test'?'accepted':path==='/retry'?'queued':'saved');await load();}catch{setFeedback('error');}finally{setBusy(false);}};
 const problemLabel=(code:string)=> {
  if(code==='recipient_missing')return t({fr:'Destinataire absent lors de la demande. Contactez le client manuellement.',en:'No recipient when submitted. Contact the customer manually.',es:'Sin destinatario al enviar. Contacte al cliente manualmente.',it:'Destinatario assente all’invio. Contatta il cliente manualmente.'});
  if(code==='provider_missing')return t({fr:'Configuration e-mail manquante sur le serveur.',en:'Server email configuration missing.',es:'Falta configuración de correo del servidor.',it:'Configurazione email del server mancante.'});
  if(code==='site_url_missing')return t({fr:'Lien de gestion absent lors de la demande. Vérifiez SITE_URL pour les prochaines demandes.',en:'Management link missing when submitted. Check SITE_URL for future requests.',es:'Faltaba el enlace de gestión. Revise SITE_URL para futuras solicitudes.',it:'Link gestione assente all’invio. Controlla SITE_URL per le prossime richieste.'});
  if(code==='delivery_uncertain_expired'||code==='attempts_exhausted')return t({fr:'Limite de reprise atteinte. Vérifiez le prestataire avant de contacter le client.',en:'Recovery limit reached. Check the provider before contacting the customer.',es:'Límite de recuperación alcanzado. Revise el proveedor antes de contactar al cliente.',it:'Limite di recupero raggiunto. Verifica il fornitore prima di contattare il cliente.'});
  if(code==='provider_uncertain')return t({fr:'Acceptation incertaine : la livraison n’est pas vérifiée.',en:'Acceptance uncertain: delivery is unverified.',es:'Aceptación incierta: entrega no verificada.',it:'Accettazione incerta: consegna non verificata.'});
  return t({fr:'Échec du prestataire. La livraison n’est pas confirmée.',en:'Provider failure. Delivery is not confirmed.',es:'Error del proveedor. Entrega no confirmada.',it:'Errore del fornitore. Consegna non confermata.'});
 };
 const messages:Record<string,string>={
 error:t({fr:'Échec. Vérifiez les champs et réessayez.',en:'Failed. Check the fields and retry.',es:'Error. Revise los campos y reintente.',it:'Errore. Controlla i campi e riprova.'}),
 session:t({fr:'Session expirée. Reconnectez-vous.',en:'Session expired. Sign in again.',es:'Sesión caducada. Inicie sesión.',it:'Sessione scaduta. Accedi di nuovo.'}),
 rate:t({fr:'Attendez une minute avant un autre test.',en:'Wait one minute before another test.',es:'Espere un minuto antes de otra prueba.',it:'Attendi un minuto prima di un altro test.'}),
 provider:t({fr:'Le prestataire n’a pas confirmé l’acceptation du message.',en:'The provider did not confirm message acceptance.',es:'El proveedor no confirmó la aceptación.',it:'Il fornitore non ha confermato l’accettazione.'}),
 saved:t({fr:'Paramètre enregistré.',en:'Setting saved.',es:'Configuración guardada.',it:'Impostazione salvata.'}),
 queued:t({fr:'Nouvelle tentative en file d’attente.',en:'Retry queued.',es:'Reintento en cola.',it:'Nuovo tentativo in coda.'}),
 accepted:t({fr:'Accepté pour envoi. La livraison en boîte de réception reste non vérifiée.',en:'Accepted for sending. Inbox delivery is unverified.',es:'Aceptado para envío. La entrega no está verificada.',it:'Accettato per l’invio. La consegna non è verificata.'}),
 };
 return <section className="max-w-3xl bg-surface text-fg border border-theme p-5 sm:p-8 rounded-xl space-y-5">
 <h2 className="text-2xl">{t({fr:'Notifications de réservation',en:'Reservation Notifications',es:'Notificaciones de reservas',it:'Notifiche prenotazioni'})}</h2>
 {!data && <button onClick={()=>load().catch(()=>setFeedback('error'))}>{t({fr:'Charger les paramètres',en:'Load settings',es:'Cargar configuración',it:'Carica impostazioni'})}</button>}
 {data && <>
 {!data.providerConfigured && <p role="alert">{t({fr:'Configuration e-mail du serveur manquante.',en:'Server email provider configuration is missing.',es:'Falta la configuración de correo del servidor.',it:'Configurazione email del server mancante.'})}</p>}
 {!data.siteUrlConfigured && <p role="alert">{t({fr:'SITE_URL manque sur le serveur : lien de gestion indisponible.',en:'Server SITE_URL is missing: management link unavailable.',es:'Falta SITE_URL en el servidor: enlace de gestión no disponible.',it:'SITE_URL mancante sul server: link gestione non disponibile.'})}</p>}
 {!data.recipient && <p role="alert">{t({fr:'Aucun destinataire : les alertes e-mail du restaurant sont indisponibles.',en:'No recipient: restaurant email alerts are unavailable.',es:'Sin destinatario: las alertas por correo no están disponibles.',it:'Nessun destinatario: avvisi email al ristorante non disponibili.'})}</p>}
 <form className="space-y-3" onSubmit={e=>{e.preventDefault();void action('',{recipient});}}>
 <label className="block">{t({fr:'E-mail du restaurant',en:'Restaurant recipient email',es:'Correo del restaurante',it:'Email del ristorante'})}<input type="email" maxLength={254} value={recipient} onChange={e=>setRecipient(e.target.value)} className="block mt-2 w-full bg-bg border border-theme p-3 rounded" /></label>
 <p>{t({fr:'Laissez vide et enregistrez pour désactiver les alertes au restaurant. Les anciens messages gardent leur destinataire.',en:'Clear and save to disable restaurant alerts. Existing jobs keep their original recipient.',es:'Vacíe y guarde para desactivar alertas. Los mensajes existentes conservan su destinatario.',it:'Svuota e salva per disattivare gli avvisi. I messaggi esistenti mantengono il destinatario.'})}</p>
 <div className="flex flex-wrap gap-3"><button disabled={busy} className="border border-theme rounded px-4 py-2">{t({fr:'Enregistrer',en:'Save',es:'Guardar',it:'Salva'})}</button><button type="button" disabled={busy||!data.recipient||!data.providerConfigured} onClick={()=>void action('/test')} className="border border-theme rounded px-4 py-2 disabled:opacity-40">{t({fr:'Tester l’adresse enregistrée',en:'Test saved address',es:'Probar dirección guardada',it:'Prova indirizzo salvato'})}</button></div>
 </form>
 <h3>{t({fr:'Problèmes de notification (50 derniers)',en:'Notification problems (latest 50)',es:'Problemas de notificación (últimos 50)',it:'Problemi di notifica (ultimi 50)'})}</h3>
 <button onClick={()=>load().catch(()=>setFeedback('error'))}>{t({fr:'Actualiser',en:'Refresh',es:'Actualizar',it:'Aggiorna'})}</button>
 {data.problems.map((job:any)=><div key={job.id} className="border border-theme rounded p-3 text-sm break-words space-y-2"><a href={`/admin?reservation=${job.reservation_id}`}>{job.reservation_id}</a><p>{job.audience==='customer'?t({fr:'Client',en:'Customer',es:'Cliente',it:'Cliente'}):t({fr:'Restaurant',en:'Restaurant',es:'Restaurante',it:'Ristorante'})} · {problemLabel(job.last_error)} · {t({fr:'Tentatives',en:'Attempts',es:'Intentos',it:'Tentativi'})}: {job.attempts}</p><button disabled={busy||!job.retryable||!data.providerConfigured} onClick={()=>void action('/retry',{id:job.id})} className="border border-theme rounded px-3 py-2 disabled:opacity-40">{t({fr:'Réessayer sans changer le destinataire',en:'Retry with original recipient',es:'Reintentar con el destinatario original',it:'Riprova con il destinatario originale'})}</button></div>)}
 </>}
 {feedback && <p role="status">{messages[feedback]}</p>}
 </section>;
}
