import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { User, Menu, X, ExternalLink } from "lucide-react";
import logo from "../assets/mediana-logo-white.svg";
import brandBg from "../assets/brand-hero-bg.webp";

export function Layout({ children }: { children: React.ReactNode }) {
  const { event, year } = useParams();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const homePath = event && year ? `/${event}/${year}` : "/";
  const myBookingPath = event && year ? `/${event}/${year}/my-booking` : "/";
  const adminPath = "/admin";
  const companySiteUrl = "https://www.mediana-global.com";
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  // SPA navigation keeps the previous page's scroll offset; start each page at the top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Lock page scroll while the mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col text-white bg-[#0A1124] selection:bg-brand-blue/30 selection:text-white">
      {/* Brand visual-identity backdrop (public pages only; admin keeps a solid dark bg) */}
      {!isAdmin && (
        <>
          <div
            aria-hidden
            className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat pointer-events-none"
            style={{ backgroundImage: `url(${brandBg})`, backgroundColor: "#0A1124" }}
          />
          <div
            aria-hidden
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(10,17,36,0.45) 0%, rgba(10,17,36,0.72) 100%)" }}
          />
        </>
      )}
      <header
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled 
            ? "bg-[#0A1124]/90 backdrop-blur-xl border-b border-white/5 py-4 shadow-2xl" 
            : "bg-transparent py-6 md:py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link to={homePath} className="flex items-center gap-2 group relative z-10">
            <img 
              src={logo} 
              alt="Mediana Logo" 
              className="h-6 md:h-7 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl font-black tracking-tighter text-white">MEDIANA</span>';
              }}
            />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to={myBookingPath}
              className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors relative group px-4 py-2 rounded-full hover:bg-white/5"
            >
              <User className="w-4 h-4" />
              <span>My Booking</span>
              <span className="absolute bottom-2 left-4 w-0 h-0.5 bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-300 group-hover:w-[calc(100%-32px)]"></span>
            </Link>

            <div className="h-4 w-px bg-white/20 -ml-4" aria-hidden />

            <a
              href={companySiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="-ml-4 flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors px-4 py-2 rounded-full hover:bg-white/5"
            >
              <span>MEDIANA</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white p-2 -mr-2 relative z-[60]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay — rendered outside <header>: the header's backdrop-blur
          makes it the containing block for fixed children, which squashed the menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-[#0A1124] z-[45] flex flex-col items-center justify-center md:hidden">
          <nav className="flex flex-col gap-10 text-center">
            <Link
              to={homePath}
              onClick={() => setMobileMenuOpen(false)}
              className="text-3xl font-bold text-white hover:text-brand-cyan transition-colors"
            >
              Home
            </Link>
            <Link
              to={myBookingPath}
              onClick={() => setMobileMenuOpen(false)}
              className="text-3xl font-bold text-white hover:text-brand-cyan transition-colors"
            >
              My Booking
            </Link>
            <a
              href={companySiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="text-3xl font-bold text-white hover:text-brand-cyan transition-colors flex items-center justify-center gap-3"
            >
              MEDIANA
              <ExternalLink className="w-6 h-6" />
            </a>
          </nav>
        </div>
      )}

      <main className="flex-1 w-full relative z-10">
        {children}
      </main>

      <footer className="bg-[#070D1E] border-t border-white/10 py-12 md:py-16 text-center text-slate-500 text-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-12 text-left">
            <div className="col-span-2">
              <h3 className="text-white font-bold text-xl mb-4">MEDIANA Co., Ltd.</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                HQ / R&D Office / Factory : 132, Donghwagongdan-ro, Munmak-eup, Wonju-si, Gangwon-do, South Korea<br/>
                Seoul Office : 53, Donggwang-ro, Seocho-gu, Seoul, South Korea<br/>
                TEL : +82-033-742-5400 &nbsp;&nbsp; FAX : +82-033-742-5483<br/>
                E-mail : info@mediana.co.kr
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to={homePath} className="hover:text-brand-cyan transition-colors">Home</Link></li>
                <li><Link to={myBookingPath} className="hover:text-brand-cyan transition-colors">My Booking</Link></li>
                <li>
                  <a href={companySiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
                    MEDIANA Website
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2026 MEDIANA Co., Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to={adminPath} className="text-slate-700 hover:text-brand-cyan text-xs transition-colors">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
