import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate, Navigate, Link } from "react-router-dom";
import { Home } from "./pages/Home";
import { MyBooking } from "./pages/MyBooking";
import { Admin } from "./pages/Admin";
import { AdminLogin } from "./pages/AdminLogin";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { EditionProvider } from "./lib/EditionContext";
import { getCurrentEdition, getActiveEdition } from "./lib/store";
import { Edition } from "./lib/types";

function RootRedirect() {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveEdition().then((e) => {
      if (cancelled) return;
      setEdition(e);
      setResolved(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!resolved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
        <div className="text-slate-400 text-lg animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-6 text-center">
        <p className="text-slate-400 text-lg">No exhibition is available right now.</p>
      </div>
    );
  }

  return <Navigate to={`/${edition.eventKey}/${edition.year}`} replace />;
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
        <Route path="/" element={<RootRedirect />} />

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<Admin />} />
        </Route>

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

        <Route path="/:event" element={<EventRedirect />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
