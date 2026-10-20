import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Edition } from "./types";
import { getEdition, getCurrentEdition } from "./store";

const VALID_EVENTS = ["whx", "medica"];

interface EditionContextValue {
  edition: Edition | null;
  loading: boolean;
  notFound: boolean;
}

const EditionContext = createContext<EditionContextValue | null>(null);

export function useEdition(): EditionContextValue {
  const ctx = useContext(EditionContext);
  if (!ctx) {
    throw new Error("useEdition must be used within an EditionProvider");
  }
  return ctx;
}

export function EditionProvider({ children }: { children: React.ReactNode }) {
  const { event, year } = useParams();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      // Validate event
      if (!event || !VALID_EVENTS.includes(event)) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }

      let result: Edition | null;

      if (year !== undefined) {
        // Validate 4-digit year
        if (!/^\d{4}$/.test(year)) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }
          return;
        }
        result = await getEdition(event, parseInt(year, 10));
      } else {
        // Admin routes have no :year; resolve the current edition for the event
        result = await getCurrentEdition(event);
      }

      if (cancelled) return;

      if (!result) {
        setNotFound(true);
        setEdition(null);
      } else {
        setEdition(result);
      }
      setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [event, year]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050A18] text-white">
        <div className="text-slate-400 text-lg animate-pulse">Loading…</div>
      </div>
    );
  }

  if (notFound || !edition) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050A18] text-white p-6 text-center">
        <h1 className="text-4xl font-black mb-4">Event not found</h1>
        <p className="text-slate-400 mb-8">The exhibition you are looking for does not exist.</p>
        <Link
          to="/"
          className="px-6 py-3 bg-white text-brand-navy font-bold rounded-full hover:bg-slate-200 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <EditionContext.Provider value={{ edition, loading, notFound }}>
      {children}
    </EditionContext.Provider>
  );
}
