import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { MyBooking } from "./pages/MyBooking";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { EditionProvider } from "./lib/EditionContext";
import { getCurrentEdition } from "./lib/store";

function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="relative z-10 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4">
          MEDIANA
        </h1>
        <p className="text-slate-400 mb-12 text-lg">Select an exhibition to book your meeting.</p>
        <div className="flex flex-col sm:flex-row gap-6">
          <Link
            to="/whx"
            className="px-12 py-5 bg-white text-black font-bold rounded-full text-xl hover:scale-105 transition-transform shadow-xl shadow-white/10"
          >
            WHX
          </Link>
          <Link
            to="/medica"
            className="px-12 py-5 border border-white/30 text-white font-bold rounded-full text-xl hover:bg-white/10 transition-colors"
          >
            MEDICA
          </Link>
        </div>
      </div>
    </div>
  );
}

function EventRedirect() {
  const { event } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      if (!event) {
        navigate("/", { replace: true });
        return;
      }
      const edition = await getCurrentEdition(event);
      if (cancelled) return;
      if (edition) {
        navigate(`/${event}/${edition.year}`, { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    };
    resolve();
    return () => {
      cancelled = true;
    };
  }, [event, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="text-slate-400 text-lg animate-pulse">Loading…</div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] text-white p-6 text-center">
      <h1 className="text-4xl font-black mb-4">Page not found</h1>
      <Link
        to="/"
        className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        <Route
          path="/:event/:year"
          element={
            <EditionProvider>
              <Home />
            </EditionProvider>
          }
        />
        <Route
          path="/:event/:year/my-booking"
          element={
            <EditionProvider>
              <MyBooking />
            </EditionProvider>
          }
        />

        <Route
          path="/:event/admin/login"
          element={
            <EditionProvider>
              <AdminLogin />
            </EditionProvider>
          }
        />
        <Route path="/:event/admin" element={<ProtectedRoute />}>
          <Route
            index
            element={
              <EditionProvider>
                <Admin />
              </EditionProvider>
            }
          />
        </Route>

        <Route path="/:event" element={<EventRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
