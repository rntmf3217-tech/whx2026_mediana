import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Menu } from "lucide-react";
import logo from "../assets/mediana_logo.png";

export function Layout({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-white bg-[#121212] selection:bg-cyan-500/30 selection:text-cyan-100">
      <header 
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${
          scrolled 
            ? "bg-[#121212]/90 backdrop-blur-xl border-b border-white/5 py-4 shadow-2xl" 
            : "bg-transparent py-6 md:py-8"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group relative z-10">
            <img 
              src={logo} 
              alt="Mediana Logo" 
              className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<span class="text-2xl font-black tracking-tighter text-white">MEDIANA</span>';
              }}
            />
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link
              to="/my-booking"
              className="flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white transition-colors relative group px-4 py-2 rounded-full hover:bg-white/5"
            >
              <User className="w-4 h-4" />
              <span>My Booking</span>
              <span className="absolute bottom-2 left-4 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-300 group-hover:w-[calc(100%-32px)]"></span>
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-white p-2 relative z-[60]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <div className="w-6 h-6 text-white font-bold text-xl">✕</div> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 bg-[#121212] z-[55] flex flex-col items-center justify-center animate-fade-in md:hidden">
            <nav className="flex flex-col gap-10 text-center">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-3xl font-bold text-white hover:text-cyan-400 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/my-booking"
                onClick={() => setMobileMenuOpen(false)}
                className="text-3xl font-bold text-white hover:text-cyan-400 transition-colors"
              >
                My Booking
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 w-full relative z-0">
        {children}
      </main>

      <footer className="bg-[#0A0A0A] border-t border-white/10 py-12 md:py-16 text-center text-slate-500 text-sm relative z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-12">
          <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-12 text-left">
            <div className="col-span-2">
              <h3 className="text-white font-bold text-xl mb-4">MEDIANA Co., Ltd.</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                R&D Office : 132, Donghwagongdan-ro, Munmak-eup, Wonju-si, Gangwon-do, Korea<br/>
                Seoul Office : 53, Donggwang-ro, Seocho-gu, Seoul , Korea<br/>
                TEL : +82-033-742-5400 &nbsp;&nbsp; FAX : +82-033-742-5483<br/>
                E-mail : info@mediana.co.kr
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="hover:text-cyan-400 transition-colors">Home</Link></li>
                <li><Link to="/my-booking" className="hover:text-cyan-400 transition-colors">My Booking</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>© 2026 MEDIANA Co., Ltd. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/admin" className="text-slate-700 hover:text-cyan-400 text-xs transition-colors">
                Admin Portal
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
