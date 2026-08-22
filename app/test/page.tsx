"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { WORDS } from "../../lib/word";
import { supabase } from "../../lib/supabase";
import { CheckCircle2, AlertCircle, Sparkles, User, ShieldCheck } from "lucide-react";

export default function AssessmentPage() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [candidateInfo, setCandidateInfo] = useState<{ name: string; class: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const info = sessionStorage.getItem("candidateInfo");
    if (!info) router.push("/");
    else setCandidateInfo(JSON.parse(info));
  }, [router]);

  const toggleWord = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((wordId) => wordId !== id));
    } else if (selectedIds.length < 10) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.length !== 10 || !candidateInfo) return;
    setIsSubmitting(true);

    const { error } = await supabase.from("candidates").insert([
      {
        name: candidateInfo.name,
        student_class: candidateInfo.class,
        selected_word_ids: selectedIds,
      },
    ]);

    if (!error) {
      sessionStorage.removeItem("candidateInfo");
      router.push("/success");
    } else {
      alert("Gagal mengirim data. Silakan coba lagi.");
      setIsSubmitting(false);
    }
  };

  const isComplete = selectedIds.length === 10;
  const progressPercentage = (selectedIds.length / 10) * 100;

  // Dynamic encouragement based on candidate selections
  const encouragementText = useMemo(() => {
    const count = selectedIds.length;
    if (count === 0) return "Yuk, pilih kata sifat pertamamu! ✨";
    if (count === 1) return "Langkah pertama yang hebat! Lanjutkan... 🚀";
    if (count >= 2 && count <= 4) return "Keren! Kamu mulai mengenali dirimu... 🧠";
    if (count >= 5 && count <= 7) return "Luar biasa! Setengah perjalanan terlewati... 🌈";
    if (count === 8) return "Dua kata lagi! Pilih dengan saksama... 🔑";
    if (count === 9) return "Satu kata terakhir! Sempurnakan profilmu... 🎯";
    return "Sempurna! Kamu telah memilih 10 kata terbaik! 🎉";
  }, [selectedIds]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-pink-50 pb-36 font-sans select-none relative overflow-x-hidden">
      
      {/* Decorative Blur Spheres */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-36 left-0 w-80 h-80 bg-pink-200/40 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-5xl mx-auto p-5 pt-8 relative z-10">
        
        {/* Candidate Info Floating Banner */}
        {candidateInfo && (
          <div className="w-fit max-w-full mx-auto mb-6 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-indigo-100 flex items-center gap-2.5 shadow-sm">
            <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center text-white shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <p className="text-slate-700 text-xs font-bold truncate">
              Kandidat: <span className="text-indigo-600">{candidateInfo.name}</span> ({candidateInfo.class})
            </p>
          </div>
        )}

        <div className="mb-8 text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
            Pilih Karakter Dirimu 🌟
          </h1>
          <p className="text-slate-600 text-xs md:text-sm font-semibold mt-3 flex items-center justify-center gap-2 max-w-lg mx-auto bg-white/70 backdrop-blur shadow-sm py-3 px-5 rounded-2xl border border-indigo-100/50">
            <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Silakan pilih tepat <strong className="text-indigo-600 font-extrabold underline">10 kata sifat</strong> yang paling mendeskripsikan dirimu saat ini.</span>
          </p>
        </div>

        {/* WORDS BUBBLE GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
          {WORDS.map((w: any) => {
            const isSelected = selectedIds.includes(w.id);
            const isDisabled = !isSelected && isComplete;

            return (
              <button
                key={w.id}
                onClick={() => toggleWord(w.id)}
                disabled={isDisabled}
                className={`
                  relative px-3 py-4 rounded-2xl border-2 text-sm md:text-base font-extrabold transition-all duration-300 text-center flex items-center justify-center min-h-[3.5rem] cursor-pointer
                  ${isSelected 
                    ? "border-indigo-600 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/20 scale-[1.04] z-10" 
                    : "border-slate-200/80 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-600 hover:-translate-y-1 hover:shadow-md active:scale-95"}
                  ${isDisabled && "opacity-25 cursor-not-allowed hover:transform-none hover:shadow-none hover:border-slate-200/80 hover:text-slate-400"}
                `}
              >
                {isSelected && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white ring-2 ring-indigo-600"></span>
                )}
                {w.word}
              </button>
            );
          })}
        </div>
      </div>

      {/* STICKY BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-10px_35px_rgba(0,0,0,0.05)] z-50">
        
        {/* Colorful Smooth Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 absolute top-0 left-0">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 p-3 sm:p-4 md:px-5">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl font-black text-base sm:text-lg shrink-0 transition-all duration-500 ${
              isComplete 
                ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 shadow-sm shadow-emerald-500/10 scale-105' 
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm shadow-indigo-500/5'
            }`}>
              {selectedIds.length} <span className="text-[10px] text-slate-400 font-bold ml-0.5">/10</span>
            </div>
            <div className="min-w-0">
              <p className="text-slate-900 font-black text-sm md:text-lg leading-tight truncate">Progress Kata</p>
              <p className="text-indigo-500 text-xs font-bold mt-0.5 animate-pulse truncate max-w-full">{encouragementText}</p>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={!isComplete || isSubmitting}
            className={`
              flex items-center justify-center shrink-0 gap-1.5 sm:gap-2 px-4 sm:px-8 py-3 sm:py-3.5 rounded-xl font-black text-xs md:text-sm transition-all duration-300 shadow-md cursor-pointer
              ${isComplete 
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/25 hover:shadow-emerald-500/35 hover:-translate-y-0.5 active:scale-95" 
                : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"}
            `}
          >
            <span className="hidden sm:inline">{isSubmitting ? "Mengirim Jawaban..." : "Kirim Karakterku"}</span>
            <span className="sm:hidden">{isSubmitting ? "Kirim..." : "Kirim"}</span>
            {isComplete && <Sparkles className="w-4 h-4 animate-bounce" />}
          </button>
        </div>
      </div>
    </main>
  );
}