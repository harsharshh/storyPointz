'use client';

import { useRef, useState, useEffect } from "react";
import Header from "./components/header";
import Hero from "./components/hero";


export default function Home() {

  const container = useRef<HTMLDivElement | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("spz_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.id) setUserId(parsed.id);
          if (parsed.name) setUserName(parsed.name);
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
        }
      }
    }
  }, []);

  return (
    <div ref={container} className="flex min-h-screen flex-col">
      <Header userName={userName ?? undefined} sessionId={userId ?? undefined} />
      <main className="flex-1">
        <Hero />
      </main>
      {/* <Footer /> */}
    </div>
  );
}
