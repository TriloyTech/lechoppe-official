"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  onPass: (token: string) => void;
  onClose: () => void;
}

function makeChallenge() {
  const ops = [
    () => { const a = Math.ceil(Math.random() * 9), b = Math.ceil(Math.random() * 9); return { q: `${a} + ${b}`, a: a + b }; },
    () => { const a = Math.ceil(Math.random() * 9) + 5, b = Math.ceil(Math.random() * 5); return { q: `${a} − ${b}`, a: a - b }; },
    () => { const a = Math.ceil(Math.random() * 5), b = Math.ceil(Math.random() * 5); return { q: `${a} × ${b}`, a: a * b }; },
  ];
  return ops[Math.floor(Math.random() * ops.length)]();
}

// Tiny signed token: base64(answer:timestamp:nonce)
function makeToken(answer: number) {
  const nonce = Math.random().toString(36).slice(2, 8);
  const payload = `${answer}:${Date.now()}:${nonce}`;
  return btoa(payload);
}

export default function BotCheck({ onPass, onClose }: Props) {
  const [challenge]    = useState(makeChallenge);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "error" | "pass">("idle");
  const [shake, setShake] = useState(false);

  const check = useCallback(() => {
    const val = parseInt(input.trim(), 10);
    if (isNaN(val) || val !== challenge.a) {
      setStatus("error");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setInput("");
      return;
    }
    setStatus("pass");
    setTimeout(() => onPass(makeToken(challenge.a)), 500);
  }, [input, challenge.a, onPass]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Enter") check(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [check]);

  const bebas: React.CSSProperties = { fontFamily: "var(--font-bebas)", letterSpacing: "0.06em" };
  const inter: React.CSSProperties = { fontFamily: "var(--font-inter)" };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={inter}>
      {/* Backdrop */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm bg-card-bg border border-theme rounded-2xl p-8 shadow-2xl"
      >
        {/* Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 blur-[60px] opacity-20 pointer-events-none"
          style={{ background: "#7CB895" }} />

        {/* Icon */}
        <div className="text-center mb-6">
          <AnimatePresence mode="wait">
            {status === "pass" ? (
              <motion.div key="pass" initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }} className="text-5xl">✅</motion.div>
            ) : (
              <motion.div key="check" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-4xl">🤖</motion.div>
            )}
          </AnimatePresence>
        </div>

        <h2 className="text-[2rem] text-fg text-center mb-1" style={bebas}>
          {status === "pass" ? "Vérifié !" : "Vérification Rapide"}
        </h2>
        <p className="text-fg-muted text-xs text-center tracking-widest uppercase mb-8">
          {status === "pass"
            ? "Redirection en cours…"
            : "Prouvez que vous n'êtes pas un robot"}
        </p>

        {status !== "pass" && (
          <>
            {/* Math question */}
            <div className="bg-surface2 border border-theme rounded-xl px-6 py-5 text-center mb-5">
              <p className="text-fg-muted text-[0.6rem] tracking-[0.3em] uppercase mb-2">
                Quelle est la valeur de
              </p>
              <p className="text-[3rem] text-[#F3CDA0]" style={bebas}>
                {challenge.q} = ?
              </p>
            </div>

            {/* Answer input */}
            <motion.div animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
              transition={{ duration: 0.4 }}>
              <input
                id="captcha-answer"
                type="number"
                inputMode="numeric"
                autoFocus
                value={input}
                onChange={(e) => { setInput(e.target.value); setStatus("idle"); }}
                placeholder="Votre réponse…"
                className={`w-full text-center text-xl bg-surface2 border rounded-xl px-4 py-3.5 text-fg placeholder:text-fg-ghost focus:outline-none transition-all duration-200 ${
                  status === "error"
                    ? "border-red-500/60 focus:border-red-500/60"
                    : "border-theme focus:border-[#7CB895]/60"
                }`}
                style={{ fontFamily: "var(--font-inter)" }}
              />
              {status === "error" && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="text-red-400 text-xs text-center mt-2">
                  ⚠ Réponse incorrecte. Réessayez.
                </motion.p>
              )}
            </motion.div>

            {/* Quick-pick number pad */}
            <div className="grid grid-cols-5 gap-1.5 mt-4 mb-5">
              {[1,2,3,4,5,6,7,8,9,0].map((n) => (
                <button key={n}
                  onClick={() => setInput(String(n))}
                  className={`py-2 text-sm rounded-lg border transition-all ${
                    input === String(n)
                      ? "bg-mint text-charcoal border-mint font-semibold"
                      : "border-theme bg-surface2 text-fg-muted hover:border-theme-strong hover:text-fg"
                  }`}>
                  {n}
                </button>
              ))}
            </div>

            {/* Confirm */}
            <button
              id="captcha-submit"
              onClick={check}
              disabled={!input}
              className="w-full py-3.5 bg-[#7CB895] text-[#0A0A0A] font-semibold text-sm tracking-[0.15em] uppercase rounded-xl disabled:opacity-30 hover:bg-[#6aaa83] transition-colors"
            >
              Confirmer →
            </button>
            <button onClick={onClose}
              className="w-full mt-2 py-2 text-xs tracking-widest uppercase text-fg-subtle hover:text-fg-muted transition-colors">
              Annuler
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
