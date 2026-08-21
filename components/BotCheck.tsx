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
  useEffect(() => { void load(); (window as any).lenis?.stop(); return () => (window as any).lenis?.start(); }, [load]);
  const submit = useCallback(() => { const answer = Number(input); if (!challenge || !Number.isInteger(answer)) { setError(t({ fr: "Saisissez une réponse valide.", en: "Enter a valid answer.", es: "Introduzca una respuesta válida.", it: "Inserisci una risposta valida." })); return; } onPass(challenge.challenge, answer); }, [challenge, input, onPass, t]);
  useEffect(() => { const listener = (event: KeyboardEvent) => { if (event.key === "Enter") submit(); }; window.addEventListener("keydown", listener); return () => window.removeEventListener("keydown", listener); }, [submit]);
  return <div className="fixed inset-0 z-[200] grid place-items-center bg-black/75 p-4" data-lenis-prevent="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><motion.section initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-sm rounded-2xl border border-theme bg-surface p-7 text-center"><button className="float-right text-fg" onClick={onClose} aria-label={t({ fr: "Fermer", en: "Close", es: "Cerrar", it: "Chiudi" })}>×</button><div className="text-4xl">🤖</div><h2 className="mt-3 text-3xl text-fg">{t({ fr: "Vérification rapide", en: "Quick verification", es: "Verificación rápida", it: "Verifica rapida" })}</h2>{challenge ? <><p className="my-6 rounded-xl border border-theme bg-bg p-5 text-4xl text-fg">{challenge.question} = ?</p><input autoFocus type="number" inputMode="numeric" value={input} onChange={(event) => { setInput(event.target.value); setError(""); }} className="w-full rounded-xl border border-theme bg-bg p-3 text-center text-xl text-fg" placeholder={t({ fr: "Votre réponse", en: "Your answer", es: "Su respuesta", it: "La tua risposta" })} /><button onClick={submit} className="mt-4 w-full rounded-xl bg-fg p-3 text-bg">{t({ fr: "Vérifier", en: "Verify", es: "Verificar", it: "Verifica" })}</button></> : <p className="my-6 text-fg/60">{t({ fr: "Chargement…", en: "Loading…", es: "Cargando…", it: "Caricamento…" })}</p>}{error ? <><p className="mt-3 text-sm text-red-400">{error}</p><button onClick={() => void load()} className="mt-2 text-sm text-fg underline">{t({ fr: "Réessayer", en: "Retry", es: "Reintentar", it: "Riprova" })}</button></> : null}</motion.section></div>;
}
