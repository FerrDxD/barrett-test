"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, BookOpen, BrainCircuit, ArrowRight, Sparkles, Trophy, Hourglass } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", class: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.class) {
      sessionStorage.setItem("candidateInfo", JSON.stringify(formData));
      router.push("/test");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-indigo-50 to-pink-100 p-4 relative overflow-hidden font-sans select-none">
      
      {/* ============================================================
          DYNAMIC FLOATING BUBBLES (Catchy & Energetic Decor)
          ============================================================ */}
      <div className="absolute top-12 left-12 w-28 h-28 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-16 right-12 w-36 h-36 bg-pink-400 rounded-full mix-blend-multiply filter blur-2xl opacity-25 animate-pulse duration-5000"></div>
      <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-amber-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-bounce duration-3000"></div>
      
      {/* Decorative Rotating Border Behind Card */}
      <div className="absolute w-64 h-64 sm:w-[500px] sm:h-[500px] bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full filter blur-[120px] opacity-10 animate-spin pointer-events-none"></div>

      {/* Card Wrapper */}
      <div className="w-full max-w-xl bg-white/90 backdrop-blur-md rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.12)] border border-white p-6 md:p-8 relative z-10 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(99,102,241,0.18)] overflow-hidden">
        
        {/* Confetti-like Sparkle Icon */}
        <div className="absolute top-6 right-6 text-amber-500 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>

        {/* Header / Selamat Datang */}
        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/30 text-white transform hover:rotate-12 transition-transform duration-300">
            <BrainCircuit className="w-9 h-9" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Halo Calon Pemimpin! <span className="inline-block animate-pulse">🚀</span>
          </h1>
          <p className="text-slate-500 text-xs md:text-sm font-semibold uppercase tracking-widest mt-2 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100/50 inline-block">
            Nawasena Psychometric Journey 🌟
          </p>
        </div>

        {/* FUN INFO GRID CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-8">
          <div className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-center group hover:bg-indigo-50 transition-colors shadow-sm">
            <div className="text-lg mb-1">🧠</div>
            <h4 className="text-[10px] font-black text-indigo-700 uppercase tracking-wide">Kenali Diri</h4>
            <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">Temukan sidik jari karakter unikmu.</p>
          </div>
          <div className="p-3.5 bg-pink-50/50 border border-pink-100 rounded-2xl text-center group hover:bg-pink-50 transition-colors shadow-sm">
            <div className="text-lg mb-1">⏱️</div>
            <h4 className="text-[10px] font-black text-pink-700 uppercase tracking-wide">Hanya 5 Menit</h4>
            <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">Cepat, praktis, langsung dapat hasil.</p>
          </div>
          <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-2xl text-center group hover:bg-amber-50 transition-colors shadow-sm">
            <div className="text-lg mb-1">🏆</div>
            <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-wide">Tumbuh Positif</h4>
            <p className="text-[9px] text-slate-500 mt-1 font-semibold leading-relaxed">Pilih posisi OSIS terbaik bagimu.</p>
          </div>
        </div>

        {/* FORM REGISTRASI SISWA */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Nama Lengkap Siswa</label>
            <div className="relative group">
              <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200/80 rounded-xl focus:ring-0 focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold text-sm shadow-inner"
                placeholder="Masukkan nama lengkapmu..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider ml-1">Kelas Siswa</label>
            <div className="relative group">
              <BookOpen className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="text"
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200/80 rounded-xl focus:ring-0 focus:border-indigo-600 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-900 font-bold text-sm shadow-inner"
                placeholder="Misal: XI.2, X.1, XII-MIPA..."
                value={formData.class}
                onChange={(e) => setFormData({ ...formData, class: e.target.value })}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full group bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 hover:-translate-y-0.5 active:scale-[0.98] mt-2 cursor-pointer"
          >
            Mulai Petualangan Karakter 
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="text-[10px] text-slate-400 text-center font-bold mt-6 leading-relaxed">
          *Tenang! Pilihan jawabanmu bersifat rahasia dan akan diproses secara profesional oleh panitia penilai seleksi OSIS.
        </p>

      </div>
    </main>
  );
}
