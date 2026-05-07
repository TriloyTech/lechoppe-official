"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/context/LangContext";
import BotCheck from "@/components/BotCheck";
import PromotionModal from "@/components/PromotionModal";

const SLOTS_LUNCH  = ["12:00","12:30","13:00","13:30","14:00"];
const SLOTS_DINNER = ["19:00","19:30","20:00","20:30","21:00","21:30","22:00"];

type Step = 0 | 1 | 2 | 3 | 4; // Date, Guests, Time, Contact, Success

interface Draft {
  date: string; guests: number; time: string;
  name: string; email: string; phone: string; notes: string;
}
const INIT: Draft = { date:"", guests:2, time:"", name:"", email:"", phone:"", notes:"" };

const slide = {
  initial: (d: number) => ({ opacity: 0, x: d * 60 }),
  animate: { opacity: 1, x: 0 },
  exit:    (d: number) => ({ opacity: 0, x: d * -60 }),
};

const inputCls = "w-full rounded-xl px-4 py-3.5 text-fg text-sm placeholder:text-fg-subtle focus:outline-none transition-all";
const inputStyle: React.CSSProperties = {
  background: "var(--input-bg)",
  border: "1px solid var(--input-border)",
};

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <motion.div
            animate={{ width: i === step ? 28 : 8, backgroundColor: i <= step ? "#7CB895" : "rgba(255,255,255,0.12)" }}
            transition={{ duration: 0.3 }}
            className="h-2 rounded-full"
          />
        </div>
      ))}
    </div>
  );
}

/* ── Step 0: Date picker ─────────────────────────────────────────────────── */
function StepDate({ d, next, t }: { d: Draft; next: (v: Partial<Draft>) => void; t: (fr:string, en:string)=>string }) {
  const [date, setDate] = useState(d.date);
  const { lang } = useLang();
  const days = Array.from({ length: 30 }, (_, i) => {
    const dt = new Date(); dt.setDate(dt.getDate() + i + 1); return dt;
  });
  
  const locale = lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : "fr-FR";
  const fmtWeekday = (dt: Date) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(dt);
  const fmtDayMonth = (dt: Date) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(dt);
  const iso = (dt: Date) => dt.toISOString().split("T")[0];

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-[2.2rem] text-fg uppercase mb-2" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
        {t({ fr: "Choisir une Date", en: "Choose a Date", es: "Elegir una Fecha", it: "Scegli una Data" })}
      </h3>
      <p className="text-fg/40 text-sm mb-4" style={{ fontFamily: "var(--font-inter)" }}>
        {t({ fr: "Sélectionnez votre date préférée", en: "Select your preferred date", es: "Seleccione su fecha preferida", it: "Seleziona la tua data preferita" })}
      </p>
      
      <div className="mb-6 overflow-x-auto pb-4 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex gap-2 min-w-max">
          {days.map((dt) => {
            const v = iso(dt); const sel = date === v;
            return (
              <button key={v} onClick={() => setDate(v)}
                className={`flex-none flex flex-col items-center justify-center py-2 px-4 min-w-[76px] rounded-xl border transition-all ${sel ? "bg-[#7CB895] text-[#0A0A0A] border-[#7CB895] shadow-[0_0_12px_rgba(124,184,149,0.3)]" : "border-white/10 bg-white/[0.02] hover:border-[#7CB895]/50 hover:bg-white/[0.05]"}`}
                style={{ fontFamily: "var(--font-inter)" }}>
                <span className={`text-[0.55rem] uppercase tracking-wider mb-1 ${sel ? "text-[#0A0A0A]/70 font-bold" : "text-fg/40"}`}>
                  {fmtWeekday(dt)}
                </span>
                <span className={`text-sm ${sel ? "text-[#0A0A0A] font-bold" : "text-fg"}`}>
                  {fmtDayMonth(dt)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button disabled={!date} onClick={() => next({ date })}
        className="w-full mt-auto py-4 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-[0.15em] uppercase rounded-xl disabled:opacity-30 hover:bg-[#6aaa83] transition-colors"
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
    <div>
      <h3 className="text-[2.2rem] text-fg uppercase mb-2" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
        {t({ fr: "Nombre de Couverts", en: "Number of Guests", es: "Número de Comensales", it: "Numero di Ospiti" })}
      </h3>
      <p className="text-fg/40 text-sm mb-6" style={inter}>{t({ fr: "Combien serez-vous ?", en: "How many guests?", es: "¿Cuántos serán?", it: "Quanti sarete?" })}</p>

      {/* Pills 1–10 */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} onClick={() => setGuests(n)}
            className={`py-3 rounded-xl text-base font-semibold border transition-all ${guests === n ? "bg-[#7CB895] text-[#0A0A0A] border-[#7CB895]" : "border-white/8 bg-white/[0.03] text-fg/60 hover:border-[#7CB895]/40"}`}>
            {n}
          </button>
        ))}
      </div>

      {/* Large group toggle */}
      <button
        onClick={() => setGuests(guests <= 10 ? 12 : guests)}
        className={`w-full py-2.5 mb-4 text-xs tracking-widest uppercase rounded-xl border transition-all ${isLarge ? "bg-[#F3CDA0]/10 border-[#F3CDA0]/30 text-[#F3CDA0]" : "border-white/8 text-fg/40 hover:border-white/20"}`}
        style={inter}
      >
        {isLarge ? `✓ ${t({ fr: "Grand groupe", en: "Large group", es: "Grupo grande", it: "Gruppo grande" })} — ${guests} ${t({ fr: "personnes", en: "guests", es: "personas", it: "ospiti" })}` : t({ fr: "+ de 10 personnes?", en: "More than 10 guests?", es: "¿Más de 10 personas?", it: "Più di 10 ospiti?" })}
      </button>

      {/* Slider for 11–40 */}
      {isLarge && (
        <div className="mb-4 px-1">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => setGuests((g) => Math.max(11, g - 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/15 text-fg/60 hover:border-[#7CB895]/40 hover:text-[#7CB895] transition-all text-lg font-light"
            >−</button>
            <div className="flex-1 text-center">
              <span className="text-[2.5rem] text-[#7CB895]" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>{guests}</span>
              <span className="text-fg/30 text-xs ml-1" style={inter}>{t({ fr: "personnes", en: "guests", es: "personas", it: "ospiti" })}</span>
            </div>
            <button
              onClick={() => setGuests((g) => Math.min(40, g + 1))}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-white/15 text-fg/60 hover:border-[#7CB895]/40 hover:text-[#7CB895] transition-all text-lg font-light"
            >+</button>
          </div>
          <input
            type="range" min={11} max={40} value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: "#7CB895", background: `linear-gradient(to right, #7CB895 ${((guests - 11) / 29) * 100}%, rgba(255,255,255,0.1) 0%)` }}
          />
          <div className="flex justify-between text-[0.55rem] text-fg/25 mt-1.5" style={inter}>
            <span>11</span><span>25</span><span>40</span>
          </div>
        </div>
      )}

      {/* Event inquiry notice */}
      {isEvent && (
        <div className="mb-4 px-4 py-3 rounded-xl text-xs leading-relaxed" style={{ background: "rgba(243,205,160,0.08)", border: "1px solid rgba(243,205,160,0.2)", color: "#F3CDA0", ...inter }}>
          🎉 {t({ fr: `Pour les groupes de ${guests} personnes, notre équipe événementielle vous contactera sous 2h pour personnaliser votre expérience.`,
               en: `For a group of ${guests}, our events team will contact you within 2h to personalise your experience.`,
               es: `Para grupos de ${guests} personas, nuestro equipo de eventos le contactará en 2h para personalizar su experiencia.`,
               it: `Per gruppi di ${guests} persone, il nostro team eventi vi contatterà entro 2h per personalizzare la vostra esperienza.` })}
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={back} className="flex-1 py-4 border border-white/10 text-fg/50 text-sm tracking-widest uppercase rounded-xl hover:bg-white/5 transition-colors" style={inter}>← {t({ fr: "Retour", en: "Back", es: "Volver", it: "Indietro" })}</button>
        <button onClick={() => next({ guests })} className="flex-1 py-4 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-widest uppercase rounded-xl hover:bg-[#6aaa83] transition-colors" style={inter}>{t({ fr: "Suivant →", en: "Next →", es: "Siguiente →", it: "Avanti →" })}</button>
      </div>
    </div>
  );
}

/* ── Step 2: Time slot ───────────────────────────────────────────────────── */
function StepTime({ d, next, back, t }: { d: Draft; next: (v: Partial<Draft>) => void; back: () => void; t: any }) {
  const [time, setTime] = useState(d.time);
  const SlotGroup = ({ label, slots }: { label: string; slots: string[] }) => (
    <div className="mb-5">
      <div className="text-[0.6rem] tracking-[0.3em] uppercase text-fg/30 mb-2" style={{ fontFamily: "var(--font-inter)" }}>{label}</div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((s) => (
          <button key={s} onClick={() => setTime(s)}
            className={`py-3 rounded-xl text-sm border transition-all ${time === s ? "bg-[#7CB895] text-[#0A0A0A] border-[#7CB895] font-semibold" : "border-white/8 bg-white/[0.03] text-fg/60 hover:border-[#7CB895]/40"}`}
            style={{ fontFamily: "var(--font-inter)" }}>{s}</button>
        ))}
      </div>
    </div>
  );
  return (
    <div>
      <h3 className="text-[2.2rem] text-fg uppercase mb-2" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>{t({ fr: "Choisir un Horaire", en: "Choose a Time", es: "Elegir un Horario", it: "Scegli un Orario" })}</h3>
      <p className="text-fg/40 text-sm mb-6" style={{ fontFamily: "var(--font-inter)" }}>{d.date} · {d.guests} {t({ fr: "convives", en: "guests", es: "comensales", it: "ospiti" })}</p>
      <SlotGroup label={t({ fr: "Déjeuner", en: "Lunch", es: "Almuerzo", it: "Pranzo" })} slots={SLOTS_LUNCH} />
      <SlotGroup label={t({ fr: "Dîner", en: "Dinner", es: "Cena", it: "Cena" })} slots={SLOTS_DINNER} />
      <div className="flex gap-3 mt-4">
        <button onClick={back} className="flex-1 py-4 border border-white/10 text-fg/50 text-sm tracking-widest uppercase rounded-xl hover:bg-white/5 transition-colors" style={{ fontFamily: "var(--font-inter)" }}>← {t({ fr: "Retour", en: "Back", es: "Volver", it: "Indietro" })}</button>
        <button disabled={!time} onClick={() => next({ time })} className="flex-1 py-4 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-widest uppercase rounded-xl disabled:opacity-30 hover:bg-[#6aaa83] transition-colors" style={{ fontFamily: "var(--font-inter)" }}>{t({ fr: "Suivant →", en: "Next →", es: "Siguiente →", it: "Avanti →" })}</button>
      </div>
    </div>
  );
}

/* ── Step 3: Contact info + Bot gate ─────────────────────────────────────── */
function StepContact({ d, onSubmit, back, t }: {
  d: Draft; onSubmit: (v: Partial<Draft> & { captcha_token: string }) => void;
  back: () => void; t: any;
}) {
  const [form, setForm]   = useState({ name: d.name, email: d.email, phone: d.phone, notes: d.notes });
  const [err, setErr]     = useState("");
  const [showBot, setShowBot] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const handleConfirm = () => {
    if (!form.name || !form.email) { setErr(t({ fr: "Nom et e-mail requis.", en: "Name and email required.", es: "Nombre y correo requeridos.", it: "Nome ed email obbligatori." })); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErr(t({ fr: "E-mail invalide.", en: "Invalid email.", es: "Correo inválido.", it: "Email non valida." })); return; }
    setErr("");
    setShowBot(true); // ← trigger bot check
  };

  const handlePass = (token: string) => {
    setShowBot(false);
    onSubmit({ ...form, captcha_token: token });
  };

  return (
    <>
      <div>
        <h3 className="text-[2.2rem] text-fg uppercase mb-2" style={{ fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" }}>
          {t({ fr: "Vos Coordonnées", en: "Your Details", es: "Sus Datos", it: "I Tuoi Dati" })}
        </h3>
        <p className="text-fg/40 text-sm mb-6" style={{ fontFamily: "var(--font-inter)" }}>
          {d.date} · {d.time} · {d.guests} {t({ fr: "convives", en: "guests", es: "comensales", it: "ospiti" })}
        </p>
        <div className="space-y-3 mb-5">
          <input type="text" placeholder={t({ fr: "Nom complet *", en: "Full name *", es: "Nombre completo *", it: "Nome completo *" })} value={form.name} onChange={set("name")} className={inputCls} style={inputStyle} />
          <input type="email" placeholder={t({ fr: "E-mail *", en: "Email *", es: "Correo *", it: "Email *" })} value={form.email} onChange={set("email")} className={inputCls} style={inputStyle} />
          <input type="tel" placeholder={t({ fr: "Téléphone", en: "Phone", es: "Teléfono", it: "Telefono" })} value={form.phone} onChange={set("phone")} className={inputCls} style={inputStyle} />
          <textarea placeholder={t({ fr: "Notes ou allergies…", en: "Notes or allergies…", es: "Notas o alergias…", it: "Note o allergie…" })} rows={2} value={form.notes} onChange={set("notes")} className={`${inputCls} resize-none`} style={inputStyle} />
          {/* ── Honeypot: hidden, must stay empty ── */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off"
            className="absolute opacity-0 pointer-events-none h-0 overflow-hidden" aria-hidden="true" />
        </div>
        {err && <p className="text-red-400 text-xs mb-3">⚠ {err}</p>}
        <div className="flex gap-3">
          <button onClick={back} className="flex-1 py-4 border border-white/10 text-fg/50 text-sm tracking-widest uppercase rounded-xl hover:bg-white/5 transition-colors" style={{ fontFamily: "var(--font-inter)" }}>← {t({ fr: "Retour", en: "Back", es: "Volver", it: "Indietro" })}</button>
          <button onClick={handleConfirm} className="flex-1 py-4 bg-[#F3CDA0] text-[#0A0A0A] font-semibold text-sm tracking-widest uppercase rounded-xl hover:bg-[#e8bb88] transition-colors" style={{ fontFamily: "var(--font-inter)" }}>
            {t({ fr: "Confirmer ✓", en: "Confirm ✓", es: "Confirmar ✓", it: "Conferma ✓" })}
          </button>
        </div>
        <p className="text-fg/20 text-[0.6rem] text-center mt-4 tracking-wider" style={{ fontFamily: "var(--font-inter)" }}>
          🔒 {t({ fr: "Vérification anti-robot requise à l'étape suivante", en: "Anti-bot check required at the next step", es: "Verificación anti-robot requerida en el siguiente paso", it: "Verifica anti-robot richiesta al prossimo passaggio" })}
        </p>
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
        {t({ fr: `Merci ${d.name.split(" ")[0]}! Nous confirmerons votre table du ${d.date} à ${d.time} sous 24h par e-mail.`,
           en: `Thank you ${d.name.split(" ")[0]}! We'll confirm your table on ${d.date} at ${d.time} within 24h by email.`,
           es: `¡Gracias ${d.name.split(" ")[0]}! Confirmaremos su mesa del ${d.date} a las ${d.time} en 24h por correo.`,
           it: `Grazie ${d.name.split(" ")[0]}! Confermeremo il vostro tavolo del ${d.date} alle ${d.time} entro 24h via email.` })}
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
export default function ReservationSection() {
  const { t, lang } = useLang();
  const [step, setStep]     = useState<Step>(0);
  const [dir, setDir]       = useState(1);
  const [draft, setDraft]   = useState<Draft>(INIT);
  const [err, setErr]       = useState("");
  const [loading, setLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const startedAt           = useRef<number>(Date.now());

  // Track when the section first mounts for timing check
  useEffect(() => { startedAt.current = Date.now(); }, []);

  const next = async (vals: Partial<Draft> & { captcha_token?: string }) => {
    const updated = { ...draft, ...vals };
    setDraft(updated);

    if (step === 3) {
      // ── Submit via bot-protected API route ──
      setLoading(true); setErr("");
      try {
        const res = await fetch("/api/reservations", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            ...updated,
            party_size:    updated.guests,
            captcha_token: vals.captcha_token,
            form_started:  startedAt.current,
            website:       "",    // honeypot (always empty from legit client)
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErr(data.error ?? "Erreur. Réessayez."); setLoading(false); return; }
        setLoading(false);
        // Trigger promo modal — onClose will advance to step 4
        setShowPromo(true);
        return;
      } catch {
        setErr("Erreur réseau. Réessayez."); setLoading(false); return;
      }
      setLoading(false);
    }

    setDir(1);
    setStep((s) => (s + 1) as Step);
  };

  const back  = () => { setDir(-1); setStep((s) => (s - 1) as Step); };
  const reset = () => { setDraft(INIT); setDir(-1); setStep(0); startedAt.current = Date.now(); };

  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.04em", lineHeight: 0.92 };

  const STEP_COMPONENTS = [
    <StepDate    key={0} d={draft} next={next} t={t} />,
    <StepGuests  key={1} d={draft} next={next} back={back} t={t} />,
    <StepTime    key={2} d={draft} next={next} back={back} t={t} />,
    <StepContact key={3} d={draft} onSubmit={next} back={back} t={t} />,
    <StepSuccess key={4} d={draft} reset={reset} t={t} />,
  ];

  return (
    <section id="reservation" className="relative px-6 md:px-12 lg:px-20 py-32 bg-bg overflow-hidden">
      <div className="absolute top-1/3 right-0 w-[500px] h-[500px] pointer-events-none blur-[120px] opacity-[0.06]"
        style={{ background: "radial-gradient(circle, #F3CDA0, transparent 70%)" }} aria-hidden />

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        {/* Left copy */}
        <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
          <span className="block text-[#F3CDA0] text-[0.65rem] tracking-[0.45em] uppercase mb-5"
            style={{ fontFamily: "var(--font-inter)" }}>{t({ fr: "Réservations", en: "Reservations", es: "Reservas", it: "Prenotazioni" })}</span>
          <h2 className="text-[clamp(3.5rem,9vw,8rem)] text-fg uppercase mb-6" style={bebas}>
            {t({ fr: "Votre", en: "Your", es: "Su", it: "Il Tuo" })}{" "}<span style={{ color: "#F3CDA0" }}>{t({ fr: "Table", en: "Table", es: "Mesa", it: "Tavolo" })}</span><br />
            {t({ fr: "Vous Attend.", en: "Awaits.", es: "Le Espera.", it: "Vi Aspetta." })}
          </h2>
          <p className="text-fg/45 text-sm leading-relaxed max-w-sm mb-10" style={{ fontFamily: "var(--font-inter)" }}>
            {t({ fr: "Réservez en 4 étapes simples. Confirmé sous 24h. Pour les groupes de +8 personnes, appelez-nous.",
               en: "Book in 4 simple steps. Confirmed within 24h. For groups of 8+, please call us.",
               es: "Reserve en 4 sencillos pasos. Confirmado en 24h. Para grupos de +8, llámenos.",
               it: "Prenota in 4 semplici passaggi. Confermato entro 24h. Per gruppi di +8, chiamateci." })}
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
        <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}>
          <div
            className="rounded-2xl p-8 backdrop-blur-sm min-h-[420px]"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--card-shadow)" }}
          >
            {step < 4 && <StepIndicator step={step} total={4} />}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
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
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
                  {STEP_COMPONENTS[step]}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
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
    </section>
  );
}
