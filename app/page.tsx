"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import HeroCanvas from "@/components/HeroCanvas";
import ChefSuggestions from "@/components/ChefSuggestions";
import FullMenu from "@/components/FullMenu";
import ReviewsSection from "@/components/ReviewsSection";
import StorySection from "@/components/StorySection";
import LocationSection from "@/components/LocationSection";
import ReservationSection from "@/components/ReservationSection";
import Footer from "@/components/Footer";
import FloatingActions from "@/components/FloatingActions";

const LoadingScreen = dynamic(() => import("@/components/LoadingScreen"), { ssr: false });

export default function HomePage() {
  const [ready, setReady] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#reservation") {
      setReservationOpen(true);
      // Clean up the URL hash
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  return (
    <>
      <LoadingScreen onComplete={() => setReady(true)} />

      <main
        className="bg-bg min-h-screen overflow-x-clip"
        style={{ visibility: ready ? "visible" : "hidden" }}
      >
        <Navbar onBookClick={() => setReservationOpen(true)} />

        {/* 121-frame scroll sequence */}
        <HeroCanvas ready={ready} onBookClick={() => setReservationOpen(true)} />

        {/* Content sections */}
        <ChefSuggestions onBookClick={() => setReservationOpen(true)} />
        <FullMenu />
        <ReviewsSection />
        <StorySection />
        <LocationSection />
        <Footer onBookClick={() => setReservationOpen(true)} />

        {/* Fixed floating: WhatsApp + Theme toggle */}
        <FloatingActions onBookClick={() => setReservationOpen(true)} />
      </main>

      <AnimatePresence>
        {reservationOpen && (
          <ReservationSection onClose={() => setReservationOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
