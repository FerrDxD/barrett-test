"use client";

import { CheckCircle2, Home, Sparkles, Award } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50 p-4 relative overflow-hidden select-none font-sans">
      
      {/* Dynamic Celebratory Confetti & Balloons background */}
      <div className="absolute top-10 left-4 sm:left-10 text-pink-300 opacity-20 animate-bounce duration-3000"><Sparkles className="w-10 h-10" /></div>
      <div className="absolute bottom-20 right-4 sm:right-10 text-indigo-300 opacity-25 animate-bounce duration-5000"><Sparkles className="w-12 h-12" /></div>
      <div className="absolute top-1/4 right-8 sm:right-20 text-yellow-300 opacity-20 animate-pulse"><Award className="w-14 h-14" /></div>
      
      <div className="absolute top-0 left-0 w-36 h-36 bg-pink-300 rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
      <div className="absolute bottom-0 right-0 w-36 h-36 bg-indigo-300 rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>

      {/* Main card */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(99,102,241,0.1)] border border-slate-100 p-8 md:p-10 text-center relative z-10 transition-all hover:scale-[1.01] hover:shadow-[0_20px_50px_rgba(99,102,241,0.15)]">
        
        <div className="relative z-10">
          
          {/* Neon rotating check badge */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-25"></div>
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-200 text-emerald-500 relative z-10 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">
            Yeeay! Selesai! 🥳🎉
          </h1>
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-widest bg-emerald-50 text-emerald-600 px-3.5 py-1 rounded-full border border-emerald-100/50 inline-block mb-6">
            Karakter Berhasil Dikunci 🔒
          </p>
          
          <p className="text-slate-500 text-xs md:text-sm mb-8 leading-relaxed font-semibold">
            Terima kasih banyak telah berpartisipasi! Sidik jari karakter kepemimpinan unikmu telah sukses direkam dan siap untuk dianalisis oleh panitia penilai seleksi OSIS Navasena. Semoga beruntung! 🌟
          </p>
          
          <Link 
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black py-4 px-6 rounded-xl transition-all shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:scale-95 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Kembali ke Beranda 🏠
          </Link>
        </div>
      </div>
    </main>
  );
}