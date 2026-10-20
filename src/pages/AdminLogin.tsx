import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";

export function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || "mediana";
    if (password === adminPassword) {
      localStorage.setItem("adminAuth", "true");
      navigate("/admin");
    } else {
      setError("Invalid password");
    }
  };

  return (
    <div className="min-h-screen bg-[#050A18] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-cyan/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full glass p-8 rounded-2xl border border-white/10 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-brand-navy via-brand-blue to-brand-cyan rounded-full flex items-center justify-center mb-6 shadow-lg shadow-brand-cyan/30">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-2">Admin Access</h1>
          <p className="text-slate-400 text-center">
            Please enter the administrator password to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-brand-cyan/50 focus:bg-white/5 transition-all"
              placeholder="Enter password"
              autoFocus
            />
          </div>
          
          {error && (
            <div className="text-brand-red text-sm bg-brand-red/10 border border-brand-red/20 p-3 rounded-xl flex items-center justify-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-brand-navy to-brand-blue text-white font-bold border border-brand-blue/40 rounded-xl shadow-lg shadow-brand-navy/40 hover:scale-[1.02] hover:shadow-brand-blue/40 transition-all duration-300"
          >
            Login
          </button>
        </form>
        
        <div className="mt-8 text-center">
          <a href="/" className="text-sm text-slate-500 hover:text-white transition-colors">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  );
}
