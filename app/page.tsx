"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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

  return (
    <>
      <LoadingScreen onComplete={() => setReady(true)} />

      <main
        className="bg-bg min-h-screen overflow-x-clip"
        style={{ visibility: ready ? "visible" : "hidden" }}
      >
        <Navbar />

        {/* 121-frame scroll sequence */}
        <HeroCanvas />

        {/* Content sections */}
        <ChefSuggestions />
        <FullMenu />
        <ReviewsSection />
        <StorySection />
        <LocationSection />
        <ReservationSection />
        <Footer />

        {/* Fixed floating: WhatsApp + Theme toggle */}
        <FloatingActions />
      </main>
    </>
  );
}
