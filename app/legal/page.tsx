"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSiteContent } from "@/lib/hooks/useSiteContent";
import { useLang } from "@/context/LangContext";

export default function LegalPage() {
  const { content, loading } = useSiteContent();
  const { t } = useLang();

  const bebas = { fontFamily: "var(--font-bebas)" };
  const inter = { fontFamily: "var(--font-inter)" };

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white">
      <Navbar />
      <section className="pt-32 pb-20 px-6 max-w-4xl mx-auto min-h-[70vh]">
        <h1 className="text-4xl md:text-5xl text-[#7CB895] mb-8" style={bebas}>
          {t({ fr: "Mentions Légales", en: "Legal Notice", es: "Aviso Legal", it: "Note Legali" })}
        </h1>
        {loading ? (
          <div className="animate-pulse flex flex-col gap-4">
            <div className="h-4 bg-white/10 rounded w-full"></div>
            <div className="h-4 bg-white/10 rounded w-5/6"></div>
            <div className="h-4 bg-white/10 rounded w-4/6"></div>
          </div>
        ) : (
          <div 
            className="text-white/80 leading-relaxed space-y-4"
            style={{ ...inter, whiteSpace: "pre-wrap" }}
            dangerouslySetInnerHTML={{ __html: content.legal_notice || t({ fr: "Aucune mention légale définie.", en: "No legal notice defined.", es: "Ningún aviso legal definido.", it: "Nessuna nota legale definita." }) }}
          />
        )}
      </section>
      <Footer />
    </main>
  );
}
