"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LangContext";
import BotCheck from "@/components/BotCheck";
import PromotionModal from "@/components/PromotionModal";

import { SLOTS_LUNCH, SLOTS_DINNER, parisNow } from "@/lib/reservations/model";

type Step = 0 | 1 | 2 | 3 | 4; // Date, Guests, Time, Contact, Success

interface Draft {
  date: string; guests: number; time: string;
  name: string; email: string; phone: string; notes: string; website: string;
}
const INIT: Draft = { date: "", guests: 2, time: "", name: "", email: "", phone: "", notes: "", website: "" };

const slide = {
  initial: (d: number) => ({ opacity: 0, x: d * 60 }),
  animate: { opacity: 1, x: 0 },
  exit: (d: number) => ({ opacity: 0, x: d * -60 }),
};

const inputCls = "w-full rounded-xl px-4 py-3.5 text-fg text-sm placeholder:text-fg-subtle focus:outline-none transition-all";
const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
};

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            animate={{ width: i === step ? 28 : 8, backgroundColor: i <= step ? "#7CB895" : "var(--border-strong)" }}
            transition={{ duration: 0.3 }}
            className="h-2 rounded-full"
          />
        </div>
      ))}
    </div>
  );
}

const RESTAURANT_TZ = "Europe/Paris";

function getIsoInTz(dt: Date, timeZone: string = RESTAURANT_TZ): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function getTodayInTz(timeZone: string = RESTAURANT_TZ): Date {
  return new Date(`${parisNow().date}T12:00:00Z`);
}

function getCurrentTimeInTz(timeZone: string = RESTAURANT_TZ): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  let hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return { hour, minute };
}

/* ── Step 0: Date picker ─────────────────────────────────────────────────── */
function StepDate({ d, next, t }: { d: Draft; next: (v: Partial<Draft>) => void; t: any }) {
  const [date, setDate] = useState(d.date);
  const { lang } = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const days = mounted
    ? (() => {
        const baseDate = getTodayInTz();
        return Array.from({ length: 30 }, (_, i) => {
          const dt = new Date(baseDate);
          dt.setUTCDate(dt.getUTCDate() + i);
          return dt;
        });
      })()
    : [];

  const locale = lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : "fr-FR";
  const fmtWeekday = (dt: Date) => new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: RESTAURANT_TZ }).format(dt);
  const fmtDayMonth = (dt: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: RESTAURANT_TZ }).format(dt);
  const iso = (dt: Date) => getIsoInTz(dt);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <h3 className="text-3xl text-fg uppercase mb-1.5" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
        {t({ fr: "Choisir une Date", en: "Choose a Date", es: "Elegir una Fecha", it: "Scegli une Data" })}
      </h3>
      <p className="text-fg/40 text-sm mb-3" style={{ fontFamily: "var(--font-inter)" }}>
        {t({ fr: "Sélectionnez votre date préférée", en: "Select your preferred date", es: "Seleccione su fecha preferida", it: "Seleziona la tua data preferita" })}
      </p>

      <div
        data-lenis-prevent="true"
        className="flex-1 min-h-0 max-h-[220px] sm:max-h-[240px] overflow-y-auto mb-4 pr-2 show-scrollbar"
        style={{ overscrollBehavior: "contain", touchAction: "pan-y" }}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {!mounted ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-[58px] rounded-xl border border-theme bg-surface2/30 animate-pulse" />
            ))
          ) : (
            days.map((dt) => {
              const v = iso(dt); const sel = date === v;
              return (
                <button key={v} onClick={() => setDate(v)}
                  className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border transition-all ${sel ? "bg-[#7CB895] text-[#0A0A0A] border-[#7CB895] shadow-[0_0_12px_rgba(124,184,149,0.3)] font-semibold" : "border-theme bg-surface2/30 hover:border-[#7CB895]/50 hover:bg-surface2/70"}`}
                  style={{ fontFamily: "var(--font-inter)" }}>
                  <span className={`text-[0.55rem] uppercase tracking-wider mb-0.5 ${sel ? "text-[#0A0A0A]/70 font-bold" : "text-fg/40"}`}>
                    {fmtWeekday(dt)}
                  </span>
                  <span className={`text-xs sm:text-sm ${sel ? "text-[#0A0A0A] font-bold" : "text-fg"}`}>
                    {fmtDayMonth(dt)}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <button disabled={!date} onClick={() => next({ date })}
        className="w-full mt-auto py-3.5 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-[0.15em] uppercase rounded-xl disabled:opacity-30 hover:bg-[#6aaa83] transition-colors"
        style={{ fontFamily: "var(--font-inter)" }}>{t({ fr: "Suivant →", en: "Next →", es: "Siguiente →", it: "Avanti →" })}</button>
    </div>
  );
}

/* ── Step 1: Guest count (1–40 with slider for large parties) ────────────── */
function StepGuests({ d, next, back, t }: { d: Draft; next: (v: Partial<Draft>) => void; back: () => void; t: any }) {
  const [guests, setGuests] = useState(d.guests);
  const inter: React.CSSProperties = { fontFamily: "var(--font-inter)" };
  const isLarge = guests > 10;
  const isEvent = guests > 12;

  return (
    <div className="flex flex-col flex-1">
      <h3 className="text-3xl text-fg uppercase mb-1.5" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
        {t({ fr: "Nombre de Couverts", en: "Number of Guests", es: "Número de Comensales", it: "Numero di Ospiti" })}
      </h3>
      <p className="text-fg/40 text-sm" style={{ ...inter, marginBottom: "16px" }}>{t({ fr: "Combien serez-vous ?", en: "How many guests?", es: "¿Cuántos serán?", it: "Quanti sarete?" })}</p>

      {/* Pills 1–10 */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setGuests(n)}
            className={`py-3 rounded-xl text-base font-semibold border transition-all ${guests === n ? "bg-[#7CB895] text-[#0A0A0A] border-[#7CB895]" : "border-theme bg-surface2/30 text-fg-muted hover:border-[#7CB895]/40"}`}>
            {n}
          </button>
        ))}
      </div>

      {/* Large group toggle */}
      <button
        onClick={() => setGuests(guests <= 10 ? 12 : guests)}
        className={`w-full py-2.5 mb-3 text-xs tracking-widest uppercase rounded-xl border transition-all ${isLarge ? "bg-[#F3CDA0]/10 border-[#F3CDA0]/30 text-[#F3CDA0]" : "border-theme text-fg-subtle hover:border-theme-strong"}`}
        style={inter}
      >
        {isLarge ? `✓ ${t({ fr: "Grand groupe", en: "Large group", es: "Grupo grande", it: "Gruppo grande" })} — ${guests} ${t({ fr: "personnes", en: "guests", es: "personas", it: "ospiti" })}` : t({ fr: "+ de 10 personnes?", en: "More than 10 guests?", es: "¿Más de 10 personas?", it: "Più di 10 ospiti?" })}
      </button>

      {/* Slider for 11–40 */}
      {isLarge && (
        <div className="mb-3 px-1">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setGuests((g) => Math.max(11, g - 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-theme-strong text-fg-muted hover:border-[#7CB895]/40 hover:text-[#7CB895] transition-all text-lg font-light"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-[2.5rem] text-[#7CB895]" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>{guests}</span>
              <span className="text-fg/30 text-xs ml-1" style={inter}>{t({ fr: "personnes", en: "guests", es: "personas", it: "ospiti" })}</span>
            </div>
            <button
              onClick={() => setGuests((g) => Math.min(40, g + 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-theme-strong text-fg-muted hover:border-[#7CB895]/40 hover:text-[#7CB895] transition-all text-lg font-light"
            >+</button>
          </div>
          <input
            type="range" min={11} max={40} value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "#7CB895", background: `linear-gradient(to right, #7CB895 ${((guests - 11) / 29) * 100}%, var(--border-strong) 0%)` }}
          />
          <div className="flex justify-between text-[0.55rem] text-fg/25 mt-1.5" style={inter}>
            <span>11</span><span>25</span><span>40</span>
          </div>
        </div>
      )}

      {/* Event inquiry notice */}
      {isEvent && (
        <div className="mb-3 px-4 py-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(243,205,160,0.08)", border: "1px solid rgba(243,205,160,0.2)", color: "#F3CDA0", ...inter }}>
          🎉 {t({
            fr: `Pour les groupes de ${guests} personnes, précisez vos besoins dans les notes. La demande reste soumise à la confirmation du restaurant.`,
            en: `For a group of ${guests}, include any special requirements in your notes. Your request remains subject to restaurant confirmation.`,
            es: `Para grupos de ${guests} personas, indique sus necesidades en las notas. La solicitud está sujeta a confirmación del restaurante.`,
            it: `Per gruppi di ${guests} persone, indicate le esigenze nelle note. La richiesta resta soggetta alla conferma del ristorante.`
          })}
        </div>
      )}

      <div className="flex gap-3 mt-auto">
        <button onClick={back} className="flex-1 py-4 border border-theme text-fg-muted text-sm tracking-widest uppercase rounded-xl hover:bg-surface2/50 transition-colors" style={inter}>← {t({ fr: "Retour", en: "Back", es: "Volver", it: "Indietro" })}</button>
        <button onClick={() => next({ guests })} className="flex-1 py-4 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-widest uppercase rounded-xl hover:bg-[#6aaa83] transition-colors" style={inter}>{t({ fr: "Suivant →", en: "Next →", es: "Siguiente →", it: "Avanti →" })}</button>
      </div>
    </div>
  );
}

/* ── Step 2: Time slot ───────────────────────────────────────────────────── */
function StepTime({ d, next, back, t }: { d: Draft; next: (v: Partial<Draft>) => void; back: () => void; t: any }) {
  const [time, setTime] = useState(d.time);
  const isTodayInTz = d.date === getIsoInTz(new Date());
  const nowTz = isTodayInTz ? getCurrentTimeInTz() : null;

  const isSlotPast = (slot: string) => {
    if (!nowTz) return false;
    const [sh, sm] = slot.split(":").map(Number);
    return nowTz.hour > sh || (nowTz.hour === sh && nowTz.minute >= sm);
  };

  const SlotGroup = ({ label, slots }: { label: string; slots: string[] }) => (
    <div className="mb-4">
      <div className="text-[0.6rem] tracking-[0.3em] uppercase text-fg/30 mb-2" style={{ fontFamily: "var(--font-inter)" }}>{label}</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((s) => {
          const disabled = isSlotPast(s);
          const sel = time === s;
          return (
            <button
              key={s}
              disabled={disabled}
              onClick={() => setTime(s)}
              className={`py-3 rounded-xl text-sm border transition-all ${
                sel
                  ? "bg-[#7CB895] text-[#0A0A0A] border-[#7CB895] font-semibold"
                  : "border-theme bg-surface2/30 text-fg-muted hover:border-[#7CB895]/40"
              } disabled:opacity-30 disabled:pointer-events-none disabled:hover:border-theme`}
              style={{ fontFamily: "var(--font-inter)" }}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <div className="flex flex-col flex-1">
      <h3 className="text-3xl text-fg uppercase mb-1.5" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>{t({ fr: "Choisir un Horaire", en: "Choose a Time", es: "Elegir un Horario", it: "Scegli un Orario" })}</h3>
      <p className="text-fg/40 text-sm" style={{ fontFamily: "var(--font-inter)", marginBottom: "16px" }}>{d.date} · {d.guests} {t({ fr: "convives", en: "guests", es: "comensales", it: "ospiti" })}</p>
      <SlotGroup label={t({ fr: "Déjeuner", en: "Lunch", es: "Almuerzo", it: "Pranzo" })} slots={SLOTS_LUNCH} />
      <SlotGroup label={t({ fr: "Dîner", en: "Dinner", es: "Cena", it: "Cena" })} slots={SLOTS_DINNER} />
      <div className="flex gap-3 mt-auto pt-4">
        <button onClick={back} className="flex-1 py-4 border border-theme text-fg-muted text-sm tracking-widest uppercase rounded-xl hover:bg-surface2/50 transition-colors" style={{ fontFamily: "var(--font-inter)" }}>← {t({ fr: "Retour", en: "Back", es: "Volver", it: "Indietro" })}</button>
        <button disabled={!time || isSlotPast(time)} onClick={() => next({ time })} className="flex-1 py-4 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-widest uppercase rounded-xl disabled:opacity-30 hover:bg-[#6aaa83] transition-colors" style={{ fontFamily: "var(--font-inter)" }}>{t({ fr: "Suivant →", en: "Next →", es: "Siguiente →", it: "Avanti →" })}</button>
      </div>
    </div>
  );
}

/* ── Step 3: Contact info + Bot gate ─────────────────────────────────────── */
function StepContact({ d, onSubmit, back, t }: {
  d: Draft; onSubmit: (v: Partial<Draft> & { captcha_token: string; captcha_answer: number }) => void;
  back: () => void; t: any;
}) {
  const [form, setForm] = useState({ name: d.name, email: d.email, phone: d.phone, notes: d.notes, website: d.website });
  const [err, setErr] = useState("");
  const [showBot, setShowBot] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleConfirm = () => {
    if (!form.name || !form.email) { setErr(t({ fr: "Nom et e-mail requis.", en: "Name and email required.", es: "Nombre y correo requeridos.", it: "Nome ed email obbligatori." })); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr(t({ fr: "E-mail invalide.", en: "Invalid email.", es: "Correo inválido.", it: "Email non valida." })); return; }
    setErr("");
    setShowBot(true); // ← trigger bot check
  };

  const handlePass = (token: string, answer: number) => {
    setShowBot(false);
    onSubmit({ ...form, captcha_token: token, captcha_answer: answer });
  };

  return (
    <>
      <div className="flex flex-col flex-1">
        <h3 className="text-3xl text-fg uppercase mb-1.5" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
          {t({ fr: "Vos Coordonnées", en: "Your Details", es: "Sus Datos", it: "I Tuoi Dati" })}
        </h3>
        <p className="text-fg/40 text-sm" style={{ fontFamily: "var(--font-inter)", marginBottom: "16px" }}>
          {d.date} · {d.time} · {d.guests} {t({ fr: "convives", en: "guests", es: "comensales", it: "ospiti" })}
        </p>
        <div className="space-y-2.5 mb-4">
          <input type="text" placeholder={t({ fr: "Nom complet *", en: "Full name *", es: "Nombre completo *", it: "Nome completo *" })} maxLength={120} value={form.name} onChange={set("name")} className={inputCls} style={inputStyle} />
          <input type="email" placeholder={t({ fr: "E-mail *", en: "Email *", es: "Correo *", it: "Email *" })} maxLength={254} value={form.email} onChange={set("email")} className={inputCls} style={inputStyle} />
          <input type="tel" placeholder={t({ fr: "Téléphone", en: "Phone", es: "Teléfono", it: "Telefono" })} maxLength={40} value={form.phone} onChange={set("phone")} className={inputCls} style={inputStyle} />
          <textarea placeholder={t({ fr: "Notes ou allergies…", en: "Notes or allergies…", es: "Notas o alergias…", it: "Note o allergie…" })} rows={2} maxLength={2000} value={form.notes} onChange={set("notes")} className={`${inputCls} resize-none`} style={inputStyle} />
          {/* ── Honeypot: hidden, must stay empty ── */}
          <input type="text" name="website" value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off"
            className="absolute opacity-0 pointer-events-none h-0 overflow-hidden" aria-hidden="true" />
        </div>
        {err && <p className="text-red-400 text-xs mb-3">⚠ {err}</p>}
        <div className="mt-auto pt-2 space-y-2">
          <div className="flex gap-3">
            <button onClick={back} className="flex-1 py-3.5 border border-theme text-fg-muted text-sm tracking-widest uppercase rounded-xl hover:bg-surface2/50 transition-colors" style={{ fontFamily: "var(--font-inter)" }}>← {t({ fr: "Retour", en: "Back", es: "Volver", it: "Indietro" })}</button>
            <button onClick={handleConfirm} className="flex-1 py-3.5 bg-[#F3CDA0] text-[#0A0A0A] font-semibold text-sm tracking-widest uppercase rounded-xl hover:bg-[#e8bb88] transition-colors" style={{ fontFamily: "var(--font-inter)" }}>
              {t({ fr: "Envoyer la demande", en: "Send request", es: "Enviar solicitud", it: "Invia richiesta" })}
            </button>
          </div>
          <p className="text-fg/30 text-[0.6rem] text-center tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
            🔒 {t({ fr: "Vérification anti-robot requise à l'étape suivante", en: "Anti-bot check required at the next step", es: "Verificación anti-robot requerida en el siguiente paso", it: "Verifica anti-robot richiesta al prossimo passaggio" })}
          </p>
        </div>
      </div>

      {/* ── Bot check modal ── */}
      <AnimatePresence>
        {showBot && <BotCheck onPass={handlePass} onClose={() => setShowBot(false)} />}
      </AnimatePresence>
    </>
  );
}

/* ── Step 4: Success ─────────────────────────────────────────────────────── */
function StepSuccess({ d, reset, t }: { d: Draft; reset: () => void; t: any }) {
  return (
    <div className="text-center py-8">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
        className="text-6xl mb-5">🥂</motion.div>
      <h3 className="text-[2.5rem] text-[#7CB895] uppercase mb-2" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
        {t({ fr: "Réservation Envoyée!", en: "Booking Sent!", es: "¡Reserva Enviada!", it: "Prenotazione Inviata!" })}
      </h3>
      <p className="text-fg/50 text-sm leading-relaxed max-w-sm mx-auto mb-2" style={{ fontFamily: "var(--font-inter)" }}>
        {t({
          fr: `Merci ${d.name.split(" ")[0]}! Votre demande pour le ${d.date} à ${d.time} est reçue. Votre table n’est pas encore confirmée.`,
          en: `Thank you ${d.name.split(" ")[0]}! Your request for ${d.date} at ${d.time} is received. Your table is not yet confirmed.`,
          es: `¡Gracias ${d.name.split(" ")[0]}! Hemos recibido su solicitud para el ${d.date} a las ${d.time}. Su mesa aún no está confirmada.`,
          it: `Grazie ${d.name.split(" ")[0]}! Richiesta ricevuta per il ${d.date} alle ${d.time}. Il tavolo non è ancora confermato.`
        })}
      </p>
      <button onClick={reset}
        className="mt-6 text-xs tracking-widest uppercase text-[#7CB895] border border-[#7CB895]/30 px-6 py-2.5 rounded-full hover:bg-[#7CB895]/10 transition-colors"
        style={{ fontFamily: "var(--font-inter)" }}>
        {t({ fr: "Nouvelle réservation", en: "New Booking", es: "Nueva reserva", it: "Nuova prenotazione" })}
      </button>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function ReservationSection({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang();
  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<Draft>(INIT);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const startedAt = useRef<number>(Date.now());
  const submissionKey = useRef<string>("");
  const submissionPayload = useRef<string>("");
  const submitting = useRef(false);

  // Track when the section first mounts for timing check
  useEffect(() => { startedAt.current = Date.now(); }, []);

  // Lock body scroll & stop Lenis smooth scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    (window as any).lenis?.stop();
    return () => {
      document.body.style.overflow = "";
      (window as any).lenis?.start();
    };
  }, []);

  const next = async (vals: Partial<Draft> & { captcha_token?: string; captcha_answer?: number }) => {
    const updated = { ...draft, ...vals };
    setDraft(updated);

    if (step === 3) {
      // ── Submit via bot-protected API route ──
      if (submitting.current) return;
      submitting.current = true;
      const fingerprint = JSON.stringify({name:updated.name,email:updated.email,phone:updated.phone,notes:updated.notes,date:updated.date,time:updated.time,guests:updated.guests,lang});
      if (!submissionKey.current || submissionPayload.current !== fingerprint) {submissionKey.current = crypto.randomUUID(); submissionPayload.current = fingerprint;}
      setLoading(true); setErr("");
      try {
        const res = await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...updated,
            party_size: updated.guests,
            lang, submission_key: submissionKey.current,
            captcha_token: vals.captcha_token,
            captcha_answer: vals.captcha_answer,
            form_started: startedAt.current,
            website: updated.website,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.error === "rate_limited" ? t({fr:"Trop de demandes aujourd’hui. Appelez le restaurant.",en:"Too many requests today. Please call the restaurant.",es:"Demasiadas solicitudes hoy. Llame al restaurante.",it:"Troppe richieste oggi. Chiama il ristorante."}) : t({fr:"Envoi impossible. Vérifiez les champs et la date, puis réessayez.",en:"Could not submit. Check the fields and date, then retry.",es:"No se pudo enviar. Revise los campos y la fecha y reintente.",it:"Invio non riuscito. Controlla i campi e la data e riprova."})); setLoading(false); return; }
        setLoading(false);
        // Trigger promo modal — onClose will advance to step 4
        setShowPromo(true);
        return;
      } catch {
        setErr(t({fr:"Réponse non reçue. Réessayez avec les mêmes informations pour éviter un doublon.",en:"No response received. Retry with the same details to avoid a duplicate.",es:"Sin respuesta. Reintente con los mismos datos para evitar duplicados.",it:"Nessuna risposta. Riprova con gli stessi dati per evitare duplicati."})); setLoading(false); return;
      } finally { submitting.current = false; }
      setLoading(false);
    }

    setDir(1);
    setStep((s) => (s + 1) as Step);
  };

  const back = () => { setDir(-1); setStep((s) => (s - 1) as Step); };
  const reset = () => { submissionKey.current = ""; submissionPayload.current = ""; setDraft(INIT); setDir(-1); setStep(0); startedAt.current = Date.now(); };

  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.04em", lineHeight: 0.92 };

  const STEP_COMPONENTS = [
    <StepDate key={0} d={draft} next={next} t={t} />,
    <StepGuests key={1} d={draft} next={next} back={back} t={t} />,
    <StepTime key={2} d={draft} next={next} back={back} t={t} />,
    <StepContact key={3} d={draft} onSubmit={next} back={back} t={t} />,
    <StepSuccess key={4} d={draft} reset={reset} t={t} />,
  ];

  return (
    <motion.div
      data-lenis-prevent="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-10"
    >
      {/* Backdrop clickable zone */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      {/* Modal Card */}
      <motion.div
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25, duration: 0.4 }}
        className="relative w-full max-w-5xl rounded-3xl bg-bg border border-border shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-10"
      >
        {/* Floating close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-[110] p-2 text-fg-subtle hover:text-fg hover:bg-surface2/50 rounded-full transition-all duration-200"
          aria-label="Close reservation"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        {/* Modal content */}
        <div data-lenis-prevent="true" className="relative px-6 py-12 md:p-12 lg:p-16 overflow-y-auto max-h-[85vh]">
          {/* Subtle glow */}
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] pointer-events-none blur-[120px] opacity-[0.06]"
            style={{ background: "radial-gradient(circle, #F3CDA0, transparent 70%)" }} aria-hidden />

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            {/* Left copy */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:block"
            >
              <span className="block text-[#F3CDA0] text-[0.65rem] tracking-[0.45em] uppercase mb-5"
                style={{ fontFamily: "var(--font-inter)" }}>{t({ fr: "Réservations", en: "Reservations", es: "Reservas", it: "Prenotazioni" })}</span>
              <h2 className="text-[clamp(2.5rem,6vw,5.5rem)] text-fg uppercase mb-6" style={bebas}>
                {t({ fr: "Votre", en: "Your", es: "Su", it: "Il Tuo" })}{" "}<span style={{ color: "#F3CDA0" }}>{t({ fr: "Table", en: "Table", es: "Mesa", it: "Tavolo" })}</span><br />
                {t({ fr: "Vous Attend.", en: "Awaits.", es: "Le Espera.", it: "Vi Aspetta." })}
              </h2>
              <p className="text-fg/45 text-sm leading-relaxed max-w-sm mb-10" style={{ fontFamily: "var(--font-inter)" }}>
                {t({
                  fr: "Envoyez votre demande en 4 étapes. Confirmation du restaurant requise. Pour les groupes de +8 personnes, appelez-nous.",
                  en: "Request a table in 4 steps. Restaurant confirmation required. For groups of 8+, please call us.",
                  es: "Solicite una mesa en 4 pasos. Se requiere confirmación del restaurante. Para grupos de +8, llámenos.",
                  it: "Richiedi un tavolo in 4 passaggi. È necessaria la conferma del ristorante. Per gruppi di +8, chiamateci."
                })}
              </p>
              {[
                { emoji: "📅", label: t({ fr: "Date", en: "Date", es: "Fecha", it: "Data" }) },
                { emoji: "👥", label: t({ fr: "Couverts", en: "Guests", es: "Comensales", it: "Ospiti" }) },
                { emoji: "🕐", label: t({ fr: "Horaire", en: "Time", es: "Horario", it: "Orario" }) },
                { emoji: "✏️", label: t({ fr: "Coordonnées", en: "Details", es: "Datos", it: "Dati" }) },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-3 mb-3 transition-opacity ${step === i ? "opacity-100" : "opacity-30"}`}>
                  <span className="text-sm">{s.emoji}</span>
                  <span className="text-fg/60 text-sm" style={{ fontFamily: "var(--font-inter)" }}>{s.label}</span>
                  {step > i && <span className="text-[#7CB895] text-xs ml-auto">✓</span>}
                </div>
              ))}
              {/* Security badge */}
              <div className="flex items-center gap-2 mt-6 text-fg/20">
                <span className="text-sm">🔒</span>
                <span className="text-[0.6rem] tracking-widest uppercase" style={{ fontFamily: "var(--font-inter)" }}>
                  {t({ fr: "Protégé contre les robots", en: "Bot-protected booking", es: "Reserva protegida contra bots", it: "Prenotazione protetta anti-bot" })}
                </span>
              </div>
              {err && <p className="text-red-400 text-xs mt-4">⚠ {err}</p>}
            </motion.div>

            {/* Right: step form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-lg mx-auto"
            >
              <div
                className="rounded-2xl p-6 sm:p-8 backdrop-blur-sm min-h-[480px] sm:min-h-[500px] flex flex-col"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}
              >
                {err && <p role="alert" className="text-red-400 text-sm mb-3">{err}</p>}
                {step < 4 && <StepIndicator step={step} total={4} />}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4 my-auto">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-[#7CB895] border-t-transparent rounded-full" />
                    <p className="text-fg/30 text-xs tracking-widest uppercase" style={{ fontFamily: "var(--font-inter)" }}>
                      {t({ fr: "Envoi en cours…", en: "Sending…", es: "Enviando…", it: "Invio in corso…" })}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait" custom={dir}>
                    <motion.div key={step} custom={dir}
                      variants={slide} initial="initial" animate="animate" exit="exit"
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 flex flex-col"
                    >
                      {STEP_COMPONENTS[step]}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* ── Promotion Modal (fires after successful booking) ── */}
      <AnimatePresence>
        {showPromo && (
          <PromotionModal
            booking={{ name: draft.name, date: draft.date, time: draft.time, guests: draft.guests }}
            onClose={() => {
              setShowPromo(false);
              setDir(1);
              setStep(4 as Step);
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
