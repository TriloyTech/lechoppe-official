"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLang } from "@/context/LangContext";

interface Props { onPass: (token: string, answer: number) => void; onClose: () => void }
type Challenge = { question: string; challenge: string };

export default function BotCheck({ onPass, onClose }: Props) {
  const { t } = useLang();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setError(""); setChallenge(null); setInput("");
    const response = await fetch("/api/takeaway/bot-challenge", { cache: "no-store" }); const data = await response.json();
    if (response.ok) setChallenge(data); else setError(t({ fr: "Vérification indisponible. Réessayez.", en: "Verification unavailable. Try again.", es: "Verificación no disponible. Inténtelo de nuevo.", it: "Verifica non disponibile. Riprova." }));
  }, [t]);
  useEffect(() => { void load(); const previous = document.body.style.overflow; document.body.style.overflow = "hidden"; (window as any).lenis?.stop(); return () => { document.body.style.overflow = previous; (window as any).lenis?.start(); }; }, [load]);
  const submit = useCallback(() => { const answer = Number(input); if (!challenge || !Number.isInteger(answer)) { setError(t({ fr: "Saisissez une réponse valide.", en: "Enter a valid answer.", es: "Introduzca una respuesta válida.", it: "Inserisci una risposta valida." })); return; } onPass(challenge.challenge, answer); }, [challenge, input, onPass, t]);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if (event.key === "Enter") submit(); }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); }, [submit]);
  return <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-4 backdrop-blur-md" data-lenis-prevent="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.section role="dialog" aria-modal="true" aria-labelledby="verification-title" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-theme bg-[var(--drawer-bg)] p-7 shadow-2xl"><div className="flex items-start justify-between gap-6"><div><p className="takeaway-kicker">L’ÉCHOPPE DE PARIS</p><h2 id="verification-title" className="takeaway-display mt-2 text-5xl text-fg">{t({ fr: "VÉRIFICATION", en: "VERIFICATION", es: "VERIFICACIÓN", it: "VERIFICA" })}</h2></div><button className="grid h-11 w-11 place-items-center rounded-full border border-theme text-xl text-fg" onClick={onClose} aria-label={t({ fr: "Fermer", en: "Close", es: "Cerrar", it: "Chiudi" })}>×</button></div><p className="mt-4 text-sm leading-6 text-fg-muted">{t({ fr: "Une vérification rapide protège votre commande. Vos informations et votre panier restent conservés.", en: "A quick check protects your order. Your details and cart remain saved.", es: "Una verificación rápida protege tu pedido. Tus datos y cesta se conservan.", it: "Una verifica rapida protegge l’ordine. Dati e carrello restano salvati." })}</p>{challenge ? <><label className="mt-6 block text-xs uppercase tracking-[.14em] text-fg-muted">{t({ fr: "Résolvez ce calcul", en: "Solve this check", es: "Resuelve este cálculo", it: "Risolvi il calcolo" })}<span className="mt-2 block rounded-xl border border-theme bg-bg p-5 text-center text-4xl normal-case tracking-normal text-fg">{challenge.question} = ?</span><input autoFocus aria-invalid={Boolean(error)} type="number" inputMode="numeric" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} className="takeaway-input mt-3 text-center text-xl" placeholder={t({ fr: "Votre réponse", en: "Your answer", es: "Tu respuesta", it: "La tua risposta" })}/></label><button onClick={submit} className="takeaway-primary mt-4 min-h-13 w-full">{t({ fr: "Vérifier et continuer", en: "Verify and continue", es: "Verificar y continuar", it: "Verifica e continua" })}</button></> : <p className="my-7 text-sm text-fg-muted" role="status">{t({ fr: "Préparation de la vérification…", en: "Preparing verification…", es: "Preparando verificación…", it: "Preparazione verifica…" })}</p>}{error ? <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 p-3"><p className="text-sm text-red-300" role="alert">{error}</p><button onClick={() => void load()} className="mt-2 text-sm text-fg underline">{t({ fr: "Réessayer sans perdre ma commande", en: "Retry without losing my order", es: "Reintentar sin perder mi pedido", it: "Riprova senza perdere l’ordine" })}</button></div> : null}</motion.section></div>;
}
