'use client';

import { useRef } from "react";
import Header from "./components/header";
import Hero from "./components/hero";


export default function Home() {

  const container = useRef<HTMLDivElement | null>(null);



  return (
    <div ref={container} className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
      </main>
      {/* <Footer /> */}
    </div>
  );
}
