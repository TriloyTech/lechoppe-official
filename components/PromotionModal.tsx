"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useLang } from "@/context/LangContext";

interface Offer {
  code: string;
  discount: number;
  description: string;
  valid_until: string | null;
}

interface Props {
  booking: {
    name: string;
    date: string;
    time: string;
    guests: number;
  };
  onClose: () => void;
}



/* ── Main Modal ──────────────────────────────────────────────────────────── */
export default function PromotionModal({ booking, onClose }: Props) {
  const { t, lang } = useLang();
  const [offer, setOffer]     = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied]   = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const fetchOffer = async () => {
      try {
        const today = new Date().toISOString();
        const { data } = await supabase
          .from("offers")
          .select("code, discount, description, valid_until")
          .eq("active", true)
          .or(`valid_until.is.null,valid_until.gte.${today}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        setOffer(data as Offer | null);
      } catch (err) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchOffer();
  }, []);

  const copyCode = useCallback(() => {
    if (!offer) return;
    navigator.clipboard.writeText(offer.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [offer]);

  const inter: React.CSSProperties = { fontFamily: "var(--font-inter)" };
  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" style={inter}>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        data-lenis-prevent="true"
        initial={{ opacity: 0, scale: 0.88, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] as const }}
        className="relative z-10 w-full max-w-md bg-[#080808] border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[90dvh] overflow-y-auto custom-scrollbar"
      >
        {/* Always-visible ✕ close button — top-right corner */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/15 text-white/50 hover:text-white transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Green glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-[80px] opacity-20 pointer-events-none"
          style={{ background: "#7CB895" }} />

        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 text-center border-b border-white/6 flex flex-col items-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            className="text-4xl mb-3">🎁</motion.div>
          <h2 className="text-[1.8rem] text-white/90 uppercase mb-1" style={bebas}>
            {t({ fr: "Offre Exclusive", en: "Exclusive Offer", es: "Oferta Exclusiva", it: "Offerta Esclusiva" })}
          </h2>
          <p className="text-white/35 text-[0.65rem] tracking-widest uppercase mb-5">
            {t({ fr: "Merci pour votre réservation,", en: "Thanks for booking,", es: "Gracias por su reserva,", it: "Grazie per la prenotazione," })} {booking.name.split(" ")[0]} !
          </p>
          
          {offer && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-[320px] p-3 bg-[#7CB895]/10 border border-[#7CB895]/30 rounded-xl text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1.5 text-[#7CB895]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="font-bold text-[0.65rem] tracking-[0.15em] uppercase">
                  {t({ fr: "Capture d'écran requise", en: "Screenshot Required", es: "Captura de pantalla requerida", it: "Screenshot richiesto" })}
                </span>
              </div>
              <p className="text-white/70 text-[0.7rem] leading-relaxed">
                {t({
                  fr: "Prenez une capture d'écran de cette page et présentez-la au restaurant pour profiter de votre réduction.",
                  en: "Take a screenshot of this page and show it at the restaurant to get your discount.",
                  es: "Tome una captura de pantalla de esta página y muéstrela en el restaurante para obtener su descuento.",
                  it: "Fai uno screenshot di questa pagina e mostralo al ristorante per ottenere lo sconto."
                })}
              </p>
            </motion.div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 pb-6">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-7 h-7 border-2 border-[#7CB895] border-t-transparent rounded-full" />
            </div>
          ) : offer ? (
            <>

              {/* Discount display */}
              <div className="text-center mb-5">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                  className="text-[4rem] text-[#7CB895] leading-none"
                  style={bebas}
                >
                  {offer.discount}%
                </motion.div>
                <p className="text-white/50 text-[0.65rem] tracking-widest uppercase mt-1">
                  {t({ fr: "de réduction sur votre prochain repas", en: "discount on your next meal", es: "de descuento en su próxima comida", it: "di sconto sul prossimo pasto" })}
                </p>
              </div>

              {/* Description */}
              <p className="text-white/60 text-sm leading-relaxed text-center mb-6">
                {offer.description}
              </p>

              {/* Booking summary */}
              <div className="bg-white/[0.03] border border-white/6 rounded-xl p-4 mb-5 grid grid-cols-2 gap-3">
                {[
                  { k: t({ fr: "Nom", en: "Name", es: "Nombre", it: "Nome" }), v: booking.name },
                  { k: t({ fr: "Couverts", en: "Guests", es: "Comensales", it: "Ospiti" }), v: `${booking.guests} pers.` },
                  {
                    k: t({ fr: "Date", en: "Date", es: "Fecha", it: "Data" }),
                    v: new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : "fr-FR", { day: "numeric", month: "short" }).format(
                      new Date(booking.date)
                    ),
                  },
                  { k: t({ fr: "Heure", en: "Time", es: "Hora", it: "Ora" }), v: booking.time },
                ].map(({ k, v }) => (
                  <div key={k}>
                    <div className="text-white/25 text-[0.6rem] tracking-widest uppercase">{k}</div>
                    <div className="text-white/80 text-sm font-medium">{v}</div>
                  </div>
                ))}
              </div>

              {/* Promo code */}
              <button
                onClick={copyCode}
                className="w-full py-4 border-2 border-dashed border-[#7CB895]/50 hover:border-[#7CB895] rounded-xl text-center transition-all group"
              >
                <p className="text-white/30 text-[0.55rem] tracking-[0.3em] uppercase mb-1">
                  {t({ fr: "Code promo — cliquez pour copier", en: "Promo code — click to copy", es: "Código promo — click para copiar", it: "Codice promo — clicca per copiare" })}
                </p>
                <p className="text-[1.8rem] text-[#7CB895] tracking-[0.15em]" style={bebas}>
                  {copied ? t({ fr: "✓ COPIÉ !", en: "✓ COPIED!", es: "✓ ¡COPIADO!", it: "✓ COPIATO!" }) : offer.code}
                </p>
                {offer.valid_until && (
                  <p className="text-white/20 text-[0.55rem] mt-1">
                    {t({ fr: "Valable jusqu'au", en: "Valid until", es: "Válido hasta el", it: "Valido fino al" })}{" "}
                    {new Intl.DateTimeFormat(lang === "en" ? "en-GB" : lang === "es" ? "es-ES" : lang === "it" ? "it-IT" : "fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(
                      new Date(offer.valid_until)
                    )}
                  </p>
                )}
              </button>
            </>
          ) : (
            <p className="text-center text-white/30 text-sm py-10">
              {t({ fr: "Aucune offre disponible actuellement.", en: "No offers available right now.", es: "No hay ofertas disponibles actualmente.", it: "Nessuna offerta disponibile al momento." })}
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
