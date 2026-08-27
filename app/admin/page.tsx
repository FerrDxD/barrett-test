"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../lib/supabase";
import { WORDS, Category } from "../../lib/word";
import { getBarrettAnalysis } from "../../lib/interpreter";
import { generateInterviewQuestions } from "../actions/gemini";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  User, Search, BrainCircuit, Activity, Heart, Target, Sparkles,
  AlertTriangle, BookOpenCheck, BarChart3, HelpCircle, Zap, ShieldCheck,
  TrendingUp, Users, Award, Calendar, ChevronRight, SlidersHorizontal,
  RefreshCw, ArrowLeftRight, FileSpreadsheet, Info, CheckCircle2,
  XCircle, Lightbulb, HelpCircle as HelpIcon, ArrowUpDown, Menu
} from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  student_class: string;
  selected_word_ids: string[];
  created_at: string;
}

// 7 Tingkat Kesadaran Barrett Model Definition
const BARRETT_LEVELS = [
  { lvl: 7, name: "Contribution (Kontribusi)", color: "bg-purple-600", border: "border-purple-600", text: "text-purple-600", bg: "bg-purple-50", desc: "Fokus pada pengabdian tulus, visi jangka panjang, dan memberikan warisan positif bagi sekolah." },
  { lvl: 6, name: "Collaboration (Kolaborasi)", color: "bg-blue-600", border: "border-blue-600", text: "text-blue-600", bg: "bg-blue-50", desc: "Fokus pada kemitraan strategis, kolaborasi lintas divisi, dan membangun hubungan harmonis dalam OSIS." },
  { lvl: 5, name: "Alignment (Keselarasan)", color: "bg-teal-500", border: "border-teal-500", text: "text-teal-600", bg: "bg-teal-50", desc: "Fokus pada kejujuran, keaslian diri, hidup selaras dengan nilai-nilai, serta integritas moral tinggi." },
  { lvl: 4, name: "Evolution (Evolusi)", color: "bg-lime-500", border: "border-lime-500", text: "text-lime-600", bg: "bg-lime-50", desc: "Fokus pada inovasi, adaptasi terhadap perubahan, keberanian mengambil risiko, dan pengembangan diri." },
  { lvl: 3, name: "Performance (Kinerja)", color: "bg-amber-500", border: "border-amber-500", text: "text-amber-600", bg: "bg-amber-50", desc: "Fokus pada kompetensi, disiplin, pencapaian target, keunggulan profesional, dan keteraturan sistem." },
  { lvl: 2, name: "Relationship (Hubungan)", color: "bg-orange-500", border: "border-orange-500", text: "text-orange-600", bg: "bg-orange-50", desc: "Fokus pada empati, komunikasi interpersonal, saling menghormati, kepedulian, dan rasa memiliki kelompok." },
  { lvl: 1, name: "Survival (Ketahanan Dasar)", color: "bg-red-500", border: "border-red-500", text: "text-red-600", bg: "bg-red-50", desc: "Fokus pada stabilitas fisik, kontrol stres, rasa aman secara dasar, serta pemenuhan kebutuhan vital." }
];

const levelMapping: Record<Category, number> = {
  "Tekanan": 1, "Kecemasan": 1,
  "Empati": 2,
  "Kontrol Diri": 3, "Keinginan": 3,
  "Ketangguhan": 4, "Kepercayaan Diri": 4,
  "Keaslian": 5,
  "Energi": 6,
  "Fokus": 7
};

// Helper to count selected words per category (percentage)
const getCategoryScore = (selectedWordIds: string[], category: string) => {
  const count = selectedWordIds
    .map(id => WORDS.find(w => w.id === id))
    .filter(w => w && w.category === category).length;
  return (count / 10) * 100;
};

// Premium Gauge component
const PremiumGauge = ({ score }: { score: number }) => {
  const rotation = 180 + (score / 100) * 180;
  
  return (
    <div className="relative w-full max-w-[280px] mx-auto aspect-[2/1] overflow-hidden group">
      <svg viewBox="0 0 200 100" className="w-full h-full overflow-visible drop-shadow-[0_10px_20px_rgba(99,102,241,0.08)]">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" />   {/* Red */}
            <stop offset="25%" stopColor="#f97316" />  {/* Orange */}
            <stop offset="50%" stopColor="#eab308" />  {/* Yellow */}
            <stop offset="75%" stopColor="#84cc16" />  {/* Lime */}
            <stop offset="100%" stopColor="#10b981" /> {/* Emerald */}
          </linearGradient>
        </defs>
        {/* Track Belakang */}
        <path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke="#f1f5f9" strokeWidth="18" strokeLinecap="round" />
        {/* Track Warna */}
        <path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke="url(#gaugeGradient)" strokeWidth="18" strokeLinecap="round" />
        
        {/* Jarum */}
        <g transform={`rotate(${rotation} 100 90)`} className="transition-transform duration-1000 ease-out">
          <path d="M 96 90 L 100 20 L 104 90 Z" fill="#0f172a" className="drop-shadow-md" />
          <circle cx="100" cy="90" r="10" fill="#1e293b" />
          <circle cx="100" cy="90" r="4" fill="#ffffff" />
        </g>
      </svg>
      {/* Label di Tengah */}
      <div className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-end pb-1 translate-y-1">
        <span className="text-4xl font-extrabold tracking-tighter text-slate-900 group-hover:text-indigo-600 transition-colors duration-300">{score}</span>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-[-2px]">Poin Kesiapan</span>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "report" | "compare" | "guide">("overview");

  // Sidebar sorting and filtering states
  const [sortBy, setSortBy] = useState<"newest" | "name" | "health_desc" | "entropy_asc">("newest");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterEntropy, setFilterEntropy] = useState<string>("all");

  // Comparison mode states
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");

  // Mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Interactive Hourglass Matrix level state
  const [activeHourglassLvl, setActiveHourglassLvl] = useState<number | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    const { data } = await supabase.from("candidates").select("*").order("created_at", { ascending: false });
    if (data) {
      setCandidates(data);
      if (data.length > 0) {
        setCompareA(data[0].id);
        if (data.length > 1) {
          setCompareB(data[1].id);
        }
      }
    }
  };

  // Run interpretation for each candidate to gather full statistics
  const analyzedCandidates = useMemo(() => {
    return candidates.map(c => {
      const analysis = getBarrettAnalysis(c.selected_word_ids);
      return {
        ...c,
        analysis
      };
    });
  }, [candidates]);

  // Compute Global Analytics across all candidates
  const globalStats = useMemo(() => {
    const count = analyzedCandidates.length;
    if (count === 0) {
      return {
        total: 0,
        avgHealth: 0,
        avgEntropy: 0,
        avgAlignment: 0,
        entropyGroups: [],
        avgLevels: [],
        categoryData: [],
        topPositive: [],
        topLimiting: [],
        registrationTrend: []
      };
    }

    const sumHealth = analyzedCandidates.reduce((sum, ac) => sum + ac.analysis.healthScore, 0);
    const sumEntropy = analyzedCandidates.reduce((sum, ac) => sum + ac.analysis.entropyScore, 0);
    const sumAlignment = analyzedCandidates.reduce((sum, ac) => sum + ac.analysis.alignmentScore, 0);

    // Entropy groups
    let healthy = 0, focus = 0, significant = 0, critical = 0;
    analyzedCandidates.forEach(ac => {
      const score = ac.analysis.entropyScore;
      if (score < 14) healthy++;
      else if (score < 20) focus++;
      else if (score < 29) significant++;
      else critical++;
    });

    const entropyGroups = [
      { name: "Healthy (Stabel)", value: healthy, fill: "#10b981" },
      { name: "Perlu Fokus", value: focus, fill: "#eab308" },
      { name: "Isu Signifikan", value: significant, fill: "#f97316" },
      { name: "Kritis", value: critical, fill: "#ef4444" }
    ].filter(g => g.value > 0);

    // Barrett Average levels 1-7
    const levelSums = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    analyzedCandidates.forEach(ac => {
      for (let lvl = 1; lvl <= 7; lvl++) {
        levelSums[lvl as keyof typeof levelSums] += ac.analysis.levels[lvl] || 0;
      }
    });
    const avgLevels = Object.entries(levelSums).map(([lvl, sum]) => ({
      name: `Level ${lvl}`,
      RataRata: Math.round(sum / count)
    }));

    // Category Selections (Popularity)
    const categoryCounts: Record<string, number> = {};
    analyzedCandidates.forEach(ac => {
      ac.selected_word_ids.forEach(wordId => {
        const w = WORDS.find(word => word.id === wordId);
        if (w) {
          categoryCounts[w.category] = (categoryCounts[w.category] || 0) + 1;
        }
      });
    });
    const categoryData = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, Frekuensi: count }))
      .sort((a, b) => b.Frekuensi - a.Frekuensi);

    // Top words selected collectively
    const positiveWordCounts: Record<string, number> = {};
    const limitingWordCounts: Record<string, number> = {};
    analyzedCandidates.forEach(ac => {
      ac.analysis.topValues.forEach(val => {
        positiveWordCounts[val] = (positiveWordCounts[val] || 0) + 1;
      });
      ac.analysis.limitingWords.forEach(val => {
        limitingWordCounts[val] = (limitingWordCounts[val] || 0) + 1;
      });
    });
    const topPositive = Object.entries(positiveWordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    const topLimiting = Object.entries(limitingWordCounts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Registration trend by date
    const dateCounts: Record<string, number> = {};
    analyzedCandidates.forEach(ac => {
      const date = new Date(ac.created_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short"
      });
      dateCounts[date] = (dateCounts[date] || 0) + 1;
    });
    const registrationTrend = Object.entries(dateCounts).map(([date, count]) => ({
      date,
      Kandidat: count
    }));

    return {
      total: count,
      avgHealth: Math.round(sumHealth / count),
      avgEntropy: Math.round(sumEntropy / count),
      avgAlignment: Number((sumAlignment / count).toFixed(1)),
      entropyGroups,
      avgLevels,
      categoryData,
      topPositive,
      topLimiting,
      registrationTrend
    };
  }, [analyzedCandidates]);

  // Extract unique classes for filtering
  const classesList = useMemo(() => {
    const classes = new Set(candidates.map(c => c.student_class));
    return Array.from(classes).sort();
  }, [candidates]);

  // Dynamic candidate list filtering and sorting
  const filteredCandidates = useMemo(() => {
    return analyzedCandidates
      .filter(ac => {
        const matchesSearch = ac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              ac.student_class.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = filterClass === "all" || ac.student_class === filterClass;

        let entropyCat = "Healthy";
        if (ac.analysis.entropyScore >= 29) entropyCat = "Critical";
        else if (ac.analysis.entropyScore >= 20) entropyCat = "Significant";
        else if (ac.analysis.entropyScore >= 14) entropyCat = "Focus";

        const matchesEntropy = filterEntropy === "all" || entropyCat === filterEntropy;

        return matchesSearch && matchesClass && matchesEntropy;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "health_desc") return b.analysis.healthScore - a.analysis.healthScore;
        if (sortBy === "entropy_asc") return a.analysis.entropyScore - b.analysis.entropyScore;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
      });
  }, [analyzedCandidates, searchQuery, sortBy, filterClass, filterEntropy]);

  // Selected candidate analysis
  const activeCandidate = useMemo(() => {
    if (!selectedCandidate) return null;
    return analyzedCandidates.find(c => c.id === selectedCandidate.id) || null;
  }, [selectedCandidate, analyzedCandidates]);

  const balanceData = activeCandidate ? [
    { name: "Foundation", value: activeCandidate.analysis.balance.foundation, fill: "#f97316" }, // Orange
    { name: "Evolution", value: activeCandidate.analysis.balance.evolution, fill: "#84cc16" },  // Lime
    { name: "Impact", value: activeCandidate.analysis.balance.impact, fill: "#4f46e5" },        // Indigo
  ] : [];

  // Data for single candidate 10-dimensional Radar Chart
  const individualRadarData = useMemo(() => {
    if (!activeCandidate) return [];
    const radarCategories = [
      "Kontrol Diri", "Keinginan", "Empati", "Kepercayaan Diri", 
      "Keaslian", "Ketangguhan", "Fokus", "Energi", "Tekanan", "Kecemasan"
    ];
    return radarCategories.map(cat => ({
      subject: cat,
      Kandidat: getCategoryScore(activeCandidate.selected_word_ids, cat),
      fullMark: 100
    }));
  }, [activeCandidate]);

  // Candidates for Comparison
  const candidateAData = useMemo(() => {
    return analyzedCandidates.find(c => c.id === compareA) || null;
  }, [analyzedCandidates, compareA]);

  const candidateBData = useMemo(() => {
    return analyzedCandidates.find(c => c.id === compareB) || null;
  }, [analyzedCandidates, compareB]);

  // Combined Radar Chart for Comparison Mode
  const radarComparisonData = useMemo(() => {
    if (!candidateAData || !candidateBData) return [];
    const radarCategories = [
      "Kontrol Diri", "Keinginan", "Empati", "Kepercayaan Diri", 
      "Keaslian", "Ketangguhan", "Fokus", "Energi", "Tekanan", "Kecemasan"
    ];
    return radarCategories.map(cat => {
      const scoreA = getCategoryScore(candidateAData.selected_word_ids, cat);
      const scoreB = getCategoryScore(candidateBData.selected_word_ids, cat);
      return {
        subject: cat,
        [candidateAData.name]: scoreA,
        [candidateBData.name]: scoreB,
        fullMark: 100
      };
    });
  }, [candidateAData, candidateBData]);

  // Recruiter Interview Guide (Tailored Questions based on Limiting Values)
  const [aiQuestions, setAiQuestions] = useState<any[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Fungsi untuk meng-generate pertanyaan wawancara
  const generateQuestions = async () => {
    if (!activeCandidate) return;
    setIsGeneratingQuestions(true);
    setAiError(null);
    try {
      // Panggil server action (diimport di atas)
      const generated = await generateInterviewQuestions(activeCandidate);
      if (generated?.success) {
        setAiQuestions(generated.data || []);
      } else if (generated?.error) {
        setAiError(generated.error);
        setAiQuestions([]);
      }
    } catch (error) {
      console.error("Gagal generate pertanyaan", error);
      setAiError("Gagal menghubungi server.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Auto-generate saat kandidat berubah
  useEffect(() => {
    if (activeCandidate && activeTab === "report") {
      setAiQuestions([]); // Reset questions
      setAiError(null);
      generateQuestions();
    }
  }, [activeCandidate, activeTab]);

  const interviewQuestions = useMemo(() => {
    if (aiQuestions.length > 0) return aiQuestions;
    return [];
  }, [aiQuestions]);


  const handleSelectCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setActiveTab("report");
    setIsMobileSidebarOpen(false); // Close mobile drawer when a candidate is chosen
  };

  // Reusable Sidebar Content to avoid duplication between Desktop and Mobile drawer
  const renderSidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-800">
      {/* Header Sidebar */}
      <div className="p-6 border-b border-slate-100 space-y-4 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/10">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-1.5">
                NAVASENA <span className="text-[10px] font-bold tracking-widest px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">PRO</span>
              </h2>
              <p className="text-slate-500 text-xs font-semibold">Analisis Psikometri OSIS</p>
            </div>
          </div>
          
          {/* Close button for mobile drawer */}
          <button 
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Kolom Pencarian */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Cari nama atau kelas..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 font-medium text-slate-800"
          />
        </div>

        {/* Panel Akordion Filter */}
        <div className="bg-slate-50/60 p-3 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
            <span className="flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" /> KONTROL</span>
            <button 
              onClick={() => { setFilterClass("all"); setFilterEntropy("all"); setSortBy("newest"); setSearchQuery(""); }} 
              className="text-[9px] text-slate-400 hover:text-indigo-600 transition-colors uppercase font-black"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {/* Filter Kelas */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Kelas</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg text-[10px] p-1 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Semua</option>
                {classesList.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>
            {/* Filter Status Entropi */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Entropi</label>
              <select
                value={filterEntropy}
                onChange={(e) => setFilterEntropy(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg text-[10px] p-1 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
              >
                <option value="all">Semua</option>
                <option value="Healthy">Sehat</option>
                <option value="Focus">Fokus</option>
                <option value="Significant">Signifikan</option>
                <option value="Critical">Kritis</option>
              </select>
            </div>
          </div>
          {/* Urutan */}
          <div className="flex flex-col gap-0.5 mt-1 border-t border-slate-200/60 pt-1.5">
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Urutkan</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-lg text-[10px] p-1.5 text-slate-700 font-medium focus:outline-none focus:border-indigo-500"
            >
              <option value="newest">Terbaru</option>
              <option value="name">Nama A-Z</option>
              <option value="health_desc">Kesiapan</option>
              <option value="entropy_asc">Hambatan</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
          <span>Daftar Kandidat ({filteredCandidates.length})</span>
          {activeTab !== "overview" && (
            <button 
              onClick={() => { setActiveTab("overview"); setIsMobileSidebarOpen(false); }} 
              className="text-indigo-600 hover:text-indigo-500 flex items-center gap-1 font-black transition-colors"
            >
              <BarChart3 className="w-3 h-3" /> STATS GRUP
            </button>
          )}
        </div>
      </div>
      
      {/* Daftar Kandidat List */}
      <div className="overflow-y-auto flex-1 p-3 space-y-2 custom-scrollbar bg-slate-50/50">
        {filteredCandidates.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs font-semibold">
            Tidak ada kandidat cocok filter
          </div>
        ) : (
          filteredCandidates.map(c => {
            const isSelected = selectedCandidate?.id === c.id;
            const entropy = c.analysis.entropyScore;
            let statusColor = "bg-emerald-500 ring-emerald-500/20";
            if (entropy >= 29) statusColor = "bg-rose-500 ring-rose-500/20";
            else if (entropy >= 20) statusColor = "bg-amber-500 ring-amber-500/20";
            else if (entropy >= 14) statusColor = "bg-yellow-400 ring-yellow-400/20";

            return (
              <button
                key={c.id} 
                onClick={() => handleSelectCandidate(c)}
                className={`w-full text-left p-4 rounded-xl flex items-center justify-between group transition-all duration-300 relative border overflow-hidden ${
                  isSelected 
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-600 text-white shadow-md shadow-indigo-600/10 scale-[1.01]' 
                    : 'bg-white hover:bg-slate-50 border-slate-200/70 shadow-[0_2px_4px_rgba(0,0,0,0.005)]'
                }`}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative shrink-0 ${
                    isSelected 
                      ? 'bg-white/20 text-white' 
                      : 'bg-slate-100 border border-slate-200 text-slate-500 group-hover:text-indigo-600 group-hover:bg-indigo-50'
                  }`}>
                    <User className="w-5 h-5" />
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ring-4 ${statusColor}`}></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className={`font-bold text-sm tracking-tight transition-colors truncate max-w-[140px] ${
                        isSelected ? 'text-white' : 'text-slate-800 group-hover:text-indigo-600'
                      }`}>
                        {c.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-black ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>{c.student_class}</span>
                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
                        isSelected ? 'bg-indigo-500/20 text-white border-indigo-400/20' : 'bg-slate-50 text-slate-500 border-slate-200/80'
                      }`}>
                        Ready: {c.analysis.healthScore}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 relative z-10 shrink-0">
                  {isSelected ? (
                    <Sparkles className="w-4 h-4 text-white animate-pulse" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col md:flex-row gap-0 overflow-x-hidden font-sans">
      
      {/* ============================================================
          DESKTOP SIDEBAR (Visible only on md screens and up)
          ============================================================ */}
      <div className="hidden md:flex w-[380px] border-r border-slate-200 flex-col h-screen sticky top-0 flex-shrink-0 z-30 shadow-sm bg-white">
        {renderSidebarContent()}
      </div>

      {/* ============================================================
          MOBILE DRAWER SIDEBAR (Triggered by hamburger button)
          ============================================================ */}
      {isMobileSidebarOpen && (
        <>
          {/* Overlay background */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Drawer Sidebar */}
          <div className="fixed inset-y-0 left-0 w-[300px] sm:w-[340px] bg-white z-50 flex flex-col h-full shadow-2xl md:hidden animate-in slide-in-from-left duration-300">
            {renderSidebarContent()}
          </div>
        </>
      )}

      {/* ============================================================
          MAIN BODY LAYOUT
          ============================================================ */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Top Sticky Navbar */}
        <div className="bg-white/80 border-b border-slate-200 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 backdrop-blur-md z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Drawer Trigger Button */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors shadow-sm bg-white flex items-center justify-center shrink-0 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-xl font-black bg-gradient-to-r from-slate-950 via-slate-800 to-indigo-700 bg-clip-text text-transparent truncate">
                {activeTab === "overview" && "Dashboard Analisis Komparatif OSIS"}
                {activeTab === "report" && `Laporan Profil Psikologis: ${activeCandidate?.name || ""}`}
                {activeTab === "compare" && "Kamera Komparasi Kandidat"}
                {activeTab === "guide" && "Panduan Interpretasi Barrett Model"}
              </h1>
              <p className="text-slate-500 text-[10px] md:text-xs font-semibold mt-0.5 truncate">
                {activeTab === "overview" && "Hasil Pengukuran Karakteristik Kolektif & Tren Pendaftaran"}
                {activeTab === "report" && `Detail Profil Barrett 7 Tingkat Kesadaran Kelas ${activeCandidate?.student_class || ""}`}
                {activeTab === "compare" && "Bandingkan Nilai Karakteristik Dua Kandidat Berdampingan"}
                {activeTab === "guide" && "Bagaimana Memahami Level 1 - 7 untuk Perekrutan Pengurus OSIS"}
              </p>
            </div>
          </div>

          {/* Tab Navigation Menu */}
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl text-[11px] font-bold gap-0.5 self-start sm:self-center overflow-x-auto max-w-full min-w-0 no-scrollbar">
            <button 
              onClick={() => setActiveTab("overview")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition-all ${
                activeTab === "overview" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Overview
            </button>
            <button 
              onClick={() => activeCandidate && setActiveTab("report")}
              disabled={!activeCandidate}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition-all ${
                !activeCandidate ? "opacity-40 cursor-not-allowed" : ""
              } ${activeTab === "report" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
            >
              <User className="w-3.5 h-3.5" /> Profil Detail
            </button>
            <button 
              onClick={() => setActiveTab("compare")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition-all ${
                activeTab === "compare" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" /> Bandingkan
            </button>
            <button 
              onClick={() => setActiveTab("guide")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0 transition-all ${
                activeTab === "guide" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Info className="w-3.5 h-3.5" /> Panduan
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-4 md:p-6 flex-1">
          
          {/* ============================================================
              TAB 1: OVERVIEW & KOLEKTIF ANALYTICS
              ============================================================ */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-10">
              
              {/* KPI STATS ROW (Fully responsive grid layout) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Total Pelamar */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group hover:border-indigo-100 transition-colors">
                  <div className="absolute right-3 top-3 p-2 bg-slate-50 border border-slate-100 rounded-xl text-indigo-600 group-hover:scale-105 transition-transform shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pelamar</p>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{globalStats.total}</h3>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-emerald-600 font-bold">
                    <TrendingUp className="w-3 h-3" /> +100% data aktif
                  </div>
                </div>

                {/* 2. Rerata Mental Kesiapan */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group hover:border-indigo-100 transition-colors">
                  <div className="absolute right-3 top-3 p-2 bg-slate-50 border border-slate-100 rounded-xl text-emerald-600 group-hover:scale-105 transition-transform shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Kesiapan Mental</p>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{globalStats.avgHealth} <span className="text-xs font-bold text-slate-400">/100</span></h3>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-[9px] text-emerald-600 font-black uppercase">Sangat Siap</span>
                  </div>
                </div>

                {/* 3. Rerata Entropi Budaya */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group hover:border-indigo-100 transition-colors">
                  <div className="absolute right-3 top-3 p-2 bg-slate-50 border border-slate-100 rounded-xl text-rose-500 group-hover:scale-105 transition-transform shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Hambatan (Entropi)</p>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{globalStats.avgEntropy}%</h3>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500 font-semibold">
                    Rentang beban mental
                  </div>
                </div>

                {/* 4. Rerata Alignment OSIS */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.015)] relative overflow-hidden group hover:border-indigo-100 transition-colors">
                  <div className="absolute right-3 top-3 p-2 bg-slate-50 border border-slate-100 rounded-xl text-amber-500 group-hover:scale-105 transition-transform shrink-0">
                    <Award className="w-4 h-4" />
                  </div>
                  <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Kesesuaian</p>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 mt-1">{globalStats.avgAlignment} <span className="text-xs font-bold text-slate-400">/10</span></h3>
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-500 font-bold">
                    Kecocokan kultur
                  </div>
                </div>

              </div>

              {/* DIAGRAMS MAIN ROW 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Tren Pendaftaran */}
                <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Tren Pendaftaran Kandidat</h3>
                    <p className="text-[10px] md:text-[11px] text-slate-500 mb-6">Frekuensi penambahan data baru di setiap harinya.</p>
                  </div>
                  <div className="w-full h-[220px]">
                    {globalStats.registrationTrend.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Belum ada tren waktu</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={globalStats.registrationTrend}>
                          <defs>
                            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10 }} allowDecimals={false} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', color: '#1e293b' }} />
                          <Area type="monotone" dataKey="Kandidat" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTrend)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* 2. Distribusi Hambatan (Entropy Donut) */}
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Distribusi Entropi Kelompok</h3>
                    <p className="text-[10px] md:text-[11px] text-slate-500 mb-4">Pengelompokan tingkat beban kecemasan kandidat.</p>
                  </div>
                  <div className="w-full h-[180px] relative">
                    {globalStats.entropyGroups.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">Tidak ada data status</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={globalStats.entropyGroups} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={45} 
                            outerRadius={65} 
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {globalStats.entropyGroups.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} stroke="#ffffff" strokeWidth={2} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-2.5 gap-y-1.5 text-[9px] font-black text-slate-500 mt-2 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> Healthy</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-yellow-400"></span> Focus</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-orange-500"></span> Significant</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500"></span> Critical</span>
                  </div>
                </div>

              </div>

              {/* DIAGRAMS MAIN ROW 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Barrett Levels Average (Collective Conscious) */}
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Profil Nilai Kolektif (Barrett 7 Levels)</h3>
                    <p className="text-[10px] md:text-[11px] text-slate-500 mb-6">Rata-rata tingkat kesadaran kolektif dari seluruh pendaftar OSIS.</p>
                  </div>
                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={globalStats.avgLevels}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit="%" />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                        <Bar dataKey="RataRata" radius={[6, 6, 0, 0]}>
                          {globalStats.avgLevels.map((entry, idx) => {
                            const colors = ["#ef4444", "#f97316", "#eab308", "#84cc16", "#0d9488", "#2563eb", "#9333ea"];
                            return <Cell key={`cell-${idx}`} fill={colors[idx] || "#4f46e5"} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Sebaran Kategori Nilai Terpopuler */}
                <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Popularitas Kategori Nilai</h3>
                    <p className="text-[10px] md:text-[11px] text-slate-500 mb-6">Dimensi kepribadian yang paling sering terpilih di database pendaftar.</p>
                  </div>
                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={globalStats.categoryData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                        <YAxis dataKey="category" type="category" tick={{ fill: '#64748b', fontSize: 9 }} width={90} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                        <Bar dataKey="Frekuensi" fill="#6366f1" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* COLLECTIVE CORE STRENGTHS & LIMITING FIELDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Kolektif Positive Core Values */}
                <div className="bg-indigo-50/40 border border-indigo-100 p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-400 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <Zap className="w-24 h-24" />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-indigo-600 mb-1 tracking-wide uppercase flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Top 5 Nilai Positif Kolektif
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-5 font-semibold">Kekuatan pendorong utama yang paling dominan di antara para pelamar.</p>
                  <div className="flex flex-col gap-3">
                    {globalStats.topPositive.length === 0 ? (
                      <div className="text-slate-400 text-xs">Belum ada data pendaftar</div>
                    ) : (
                      globalStats.topPositive.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-indigo-100/30 shadow-sm rounded-xl">
                          <span className="font-bold text-xs md:text-sm text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-600 text-[10px] font-black flex items-center justify-center">{idx+1}</span>
                            {item.word}
                          </span>
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 border border-indigo-100 rounded-md">
                            Dipilih {item.count} Kali
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Kolektif Limiting Values */}
                <div className="bg-rose-50/40 border border-rose-100 p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-400 group-hover:opacity-10 transition-opacity pointer-events-none">
                    <AlertTriangle className="w-24 h-24" />
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-rose-600 mb-1 tracking-wide uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Top 5 Hambatan Internal Kolektif
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-5 font-semibold">Beban kecemasan dan tekanan yang paling sering dirasakan pendaftar OSIS.</p>
                  <div className="flex flex-col gap-3">
                    {globalStats.topLimiting.length === 0 ? (
                      <div className="text-slate-400 text-xs py-5 text-center">Tidak terdeteksi hambatan internal kolektif yang signifikan</div>
                    ) : (
                      globalStats.topLimiting.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-rose-100/30 shadow-sm rounded-xl">
                          <span className="font-bold text-xs md:text-sm text-slate-800 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-black flex items-center justify-center">{idx+1}</span>
                            {item.word}
                          </span>
                          <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest px-2 py-0.5 bg-rose-50 border border-rose-100 rounded-md">
                            Terasa {item.count} Kali
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ============================================================
              TAB 2: DETAIL INDIVIDU & INTERACTIVE HOURGLASS
              ============================================================ */}
          {activeTab === "report" && activeCandidate && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-10 max-w-6xl mx-auto w-full">
              
              {/* GLASSMORPHIC KANDIDAT HEADER */}
              <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none"></div>
                <div className="flex items-center gap-4 relative z-10 min-w-0 flex-1">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-2xl md:text-3xl font-black shadow-lg shadow-indigo-600/10 shrink-0">
                    {activeCandidate.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight truncate">{activeCandidate.name}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded-lg border border-indigo-100">{activeCandidate.student_class}</span>
                      <span className="text-slate-500 text-[10px] md:text-xs font-semibold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {new Date(activeCandidate.created_at).toLocaleDateString("id-ID", { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 relative z-10 shrink-0 w-full md:w-auto self-stretch md:self-center">
                  <button 
                    onClick={() => {
                      setCompareA(activeCandidate.id);
                      setActiveTab("compare");
                    }}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-600" /> Bandingkan
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> PDF
                  </button>
                </div>
              </div>

              {/* THREE MAIN KPI ROW */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Indeks Kesiapan Mental */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between min-h-[280px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1.5 tracking-wide uppercase">Indeks Kesiapan Mental</h3>
                    <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed font-semibold">
                      Skor holistik mewakili stabilitas psikologis, pengendalian beban stres, dan keselarasan karakter ideal OSIS.
                    </p>
                  </div>
                  <div className="my-auto pt-4 relative z-10">
                    <PremiumGauge score={activeCandidate.analysis.healthScore} />
                  </div>
                </div>

                {/* 2. Tingkat Entropi Budaya */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between min-h-[280px] relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 p-6 opacity-5 pointer-events-none"><AlertTriangle className="w-20 h-20 text-yellow-500" /></div>
                  
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1.5 tracking-wide uppercase">Tingkat Entropi (Internal Risk)</h3>
                    <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed font-semibold">Mengukur persentase rasa ragu, kecemasan, dan tekanan batin.</p>
                  </div>

                  <div className="my-auto py-6 space-y-4">
                    <div className="flex h-3 w-full rounded-full overflow-hidden bg-slate-100 shadow-inner">
                      <div className="bg-emerald-500" style={{ width: `${Math.max(0, 100 - activeCandidate.analysis.entropyScore)}%` }}></div>
                      <div className="bg-rose-500" style={{ width: `${activeCandidate.analysis.entropyScore}%` }}></div>
                    </div>
                    
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 relative z-10 shadow-inner">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${activeCandidate.analysis.entropyLevel.text} bg-white border border-slate-200/80 shadow-sm`}>
                        {activeCandidate.analysis.entropyScore}%
                      </div>
                      <div>
                        <p className={`text-xs font-black uppercase ${activeCandidate.analysis.entropyLevel.text}`}>{activeCandidate.analysis.entropyLevel.label}</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5 leading-relaxed">
                          {activeCandidate.analysis.entropyScore < 14 ? "Kandidat sangat stabil secara emosional." 
                          : activeCandidate.analysis.entropyScore < 20 ? "Ada sedikit kekhawatiran terkendali."
                          : "Sedang mengalami tekanan mental yang cukup menonjol."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Kesesuaian Karakter (Alignment) */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between min-h-[280px] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1.5 tracking-wide uppercase">Kesesuaian Karakter (Alignment)</h3>
                    <p className="text-slate-500 text-[11px] md:text-xs leading-relaxed font-semibold">Tingkat kepemilikan nilai-nilai positif yang ideal untuk keharmonisan tim OSIS.</p>
                  </div>
                  
                  <div className="my-auto flex flex-col items-center justify-center py-4">
                    <div className="w-24 h-24 rounded-full border-[6px] border-emerald-100 bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl font-black shrink-0 shadow-sm transition-transform duration-500 group-hover:scale-105">
                      {activeCandidate.analysis.alignmentScore} <span className="text-xs font-bold text-slate-400 ml-0.5">/10</span>
                    </div>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-3.5 bg-emerald-50 px-2 py-0.5 border border-emerald-100 rounded-md">
                      Poin Keselarasan
                    </span>
                  </div>
                </div>

              </div>

              {/* PROFIL RADAR & BALANCE */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Radar Chart 10 Dimensi */}
                <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Siluet Karakter 10 Dimensi</h3>
                    <p className="text-[10px] md:text-[11px] text-slate-500 mb-6">Pemetaan psikometri di 10 aspek nilai kepribadian.</p>
                  </div>
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={individualRadarData}>
                        <PolarGrid stroke="#cbd5e1" opacity={0.8} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                        <Radar name={activeCandidate.name} dataKey="Kandidat" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                        <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Balance Index & Perspectives */}
                <div className="space-y-6 flex flex-col justify-between">
                  {/* Balance Index */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex-1 flex flex-col justify-between relative overflow-hidden">
                    <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase border-b border-slate-100 pb-2.5">Fokus Energi (Balance Index)</h3>
                    <div className="w-full h-[120px] relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={balanceData} cx="50%" cy="50%" innerRadius={0} outerRadius={45} dataKey="value" stroke="#ffffff" strokeWidth={2}>
                            {balanceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value) => `${value}%`} contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-3 text-[9px] font-black text-slate-500 mt-2 border-t border-slate-100 pt-2.5">
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#f97316]"></span> Foundation</div>
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#84cc16]"></span> Evolution</div>
                      <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#4f46e5]"></span> Impact</div>
                    </div>
                  </div>

                  {/* Orientasi Kerja */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-200/70 shadow-sm flex-1 flex flex-col justify-between">
                    <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase border-b border-slate-100 pb-2.5">Orientasi Kerja (Perspektif)</h3>
                    <div className="flex justify-between items-end h-[100px] px-2 pt-2">
                      {[
                        { key: 'Process', label: 'Proses', icon: <Activity className="w-3.5 h-3.5 text-emerald-500"/> },
                        { key: 'People', label: 'Relasi', icon: <Heart className="w-3.5 h-3.5 text-rose-500"/> },
                        { key: 'Purpose', label: 'Target', icon: <Target className="w-3.5 h-3.5 text-amber-500"/> }
                      ].map((item) => {
                        const val = activeCandidate.analysis.perspectives[item.key.toLowerCase() as keyof typeof activeCandidate.analysis.perspectives];
                        return (
                          <div key={item.key} className="flex flex-col items-center w-12 group">
                            <div className="w-full bg-slate-50 border border-slate-200 rounded-t-lg flex-1 relative flex items-end overflow-hidden">
                              <div className="w-full bg-indigo-600 transition-all duration-700 ease-out shadow-[0_-4px_6px_-1px_rgba(99,102,241,0.1)]" style={{ height: `${val}%` }}></div>
                            </div>
                            <div className="flex items-center gap-1 mt-2.5 text-slate-400">{item.icon}</div>
                            <p className="text-[10px] font-extrabold text-slate-700 mt-1">{item.label}</p>
                            <p className="text-[9px] text-indigo-600 font-bold">{val}%</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>

              {/* INTERACTIVE BARRETT HOURGLASS MATRIX */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Hourglass */}
                <div className="lg:col-span-2 bg-white p-4 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Interactive Barrett Hourglass</h3>
                    <p className="text-[10px] md:text-[11px] text-slate-500 leading-relaxed font-semibold">
                      Matriks 7 tingkat kesadaran Barrett Model. <span className="text-indigo-600 font-bold">Sorot atau klik pada bar tingkat kesadaran</span> untuk membaca arti penting porsi nilai tersebut serta melihat kata-kata yang dipilih kandidat secara real-time.
                    </p>
                    
                    {activeHourglassLvl !== null ? (
                      <div className="p-4 bg-slate-50 border border-indigo-100 rounded-xl space-y-2 animate-in fade-in zoom-in duration-200 shadow-inner">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${BARRETT_LEVELS.find(l => l.lvl === activeHourglassLvl)?.color}`}></span>
                          <h4 className="font-extrabold text-slate-800 text-xs">{BARRETT_LEVELS.find(l => l.lvl === activeHourglassLvl)?.name}</h4>
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          {BARRETT_LEVELS.find(l => l.lvl === activeHourglassLvl)?.desc}
                        </p>
                        
                        <div className="border-t border-slate-200 pt-2 mt-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pilihan Kata Kandidat:</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(() => {
                              const words = activeCandidate.selected_word_ids
                                .map(id => WORDS.find(w => w.id === id))
                                .filter(w => w && levelMapping[w.category] === activeHourglassLvl)
                                .map(w => w?.word);
                              
                              if (words.length === 0) {
                                return <span className="text-[10px] text-slate-400 font-semibold italic">Tidak ada kata terpilih di level ini</span>;
                              }
                              return words.map((w, idx) => (
                                <span key={idx} className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md">
                                  {w}
                                </span>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center text-center text-slate-400 text-xs font-semibold">
                        Arahkan kursor atau klik salah satu level untuk menampilkan info interpretasi detail.
                      </div>
                    )}
                  </div>

                  {/* SVG Hourglass */}
                  <div className="w-[180px] flex-shrink-0 relative py-4 flex flex-col gap-2 items-center">
                    <svg viewBox="0 0 100 240" className="absolute inset-0 w-full h-full z-0 opacity-5 pointer-events-none">
                      <polygon points="15,0 85,0 70,120 85,240 15,240 30,120" fill="#38bdf8" />
                    </svg>
                    
                    {BARRETT_LEVELS.map((item) => {
                      const val = activeCandidate.analysis.levels[item.lvl as keyof typeof activeCandidate.analysis.levels] || 0;
                      const isHovered = activeHourglassLvl === item.lvl;
                      const hasWords = activeCandidate.selected_word_ids
                        .map(id => WORDS.find(w => w.id === id))
                        .filter(w => w && levelMapping[w.category] === item.lvl).length > 0;
                      
                      return (
                        <button
                          key={item.lvl}
                          onMouseEnter={() => setActiveHourglassLvl(item.lvl)}
                          onClick={() => setActiveHourglassLvl(item.lvl)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-left relative z-10 transition-all ${
                            isHovered 
                              ? 'bg-slate-50 border-slate-300 shadow-sm shadow-slate-100' 
                              : 'bg-white border-slate-200/60 shadow-[0_2px_4px_rgba(0,0,0,0.005)]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-sm ${item.color} ${
                              hasWords ? "ring-2 ring-indigo-500/10 animate-pulse" : "opacity-55"
                            }`}>
                              {item.lvl}
                            </div>
                            <span className="text-[10px] font-extrabold text-slate-700">Level {item.lvl}</span>
                          </div>
                          <span className={`text-[10px] font-black ${val > 0 ? item.text : "text-slate-400"}`}>
                            {val}%
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Level Distribution Sidebar Details */}
                <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                  <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase border-b border-slate-100 pb-2.5">Distribusi Tingkat Kesadaran</h3>
                  <div className="space-y-3.5">
                    {BARRETT_LEVELS.map((item) => {
                      const val = activeCandidate.analysis.levels[item.lvl as keyof typeof activeCandidate.analysis.levels] || 0;
                      return (
                        <div key={item.lvl} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-500">
                            <span className="truncate max-w-[130px]">{item.name}</span>
                            <span>{val}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full ${item.color}`} style={{ width: `${val}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* WORD PILLS GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Positive Values */}
                <div className="bg-indigo-50/40 border border-indigo-100 p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-indigo-400 group-hover:scale-105 transition-transform pointer-events-none"><Zap className="w-24 h-24" /></div>
                  <h3 className="text-xs md:text-sm font-bold text-indigo-600 mb-1 tracking-wide uppercase flex items-center gap-1.5">
                    <Zap className="w-4 h-4" /> Kekuatan Karakter Utama (Positive Values)
                  </h3>
                  <p className="text-xs text-slate-500 mb-5 font-semibold">Kata-kata positif pilihan kandidat yang mewakili core kekuatan mental.</p>
                  
                  <div className="flex flex-wrap gap-2 relative z-10">
                    {activeCandidate.analysis.topValues.map((w, idx) => (
                      <span key={idx} className="px-3.5 py-1.5 bg-white border border-indigo-100 text-slate-800 text-[11px] md:text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 hover:bg-slate-50 transition-colors">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> {w}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Potentially Limiting Values */}
                <div className="bg-rose-50/40 border border-rose-100 p-6 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-rose-400 group-hover:scale-105 transition-transform pointer-events-none"><AlertTriangle className="w-24 h-24" /></div>
                  <h3 className="text-xs md:text-sm font-bold text-rose-600 mb-1 tracking-wide uppercase flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Hambatan Potensial (Limiting Values)
                  </h3>
                  <p className="text-xs text-slate-500 mb-5 font-semibold">Indikator kecemasan/tekanan mental internal yang perlu diklarifikasi.</p>
                  
                  {activeCandidate.analysis.limitingWords.length > 0 ? (
                    <div className="flex flex-wrap gap-2 relative z-10">
                      {activeCandidate.analysis.limitingWords.map((w, idx) => (
                        <span key={idx} className="px-3.5 py-1.5 bg-white border border-rose-100 text-rose-700 text-[11px] md:text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" /> {w}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full p-5 bg-emerald-50 text-emerald-600 rounded-xl text-xs text-center font-bold border border-emerald-100 relative z-10 shadow-sm">
                      Luar Biasa! Tidak terdeteksi hambatan internal psikologis.
                    </div>
                  )}
                </div>

              </div>

              {/* AI RECRUITER'S INTERVIEW TOOLKIT */}
              <div className="bg-slate-100 p-6 md:p-8 rounded-[2rem] border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Lightbulb className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs md:text-base font-black text-slate-900 uppercase tracking-wide">Recruiter's Interview Toolkit</h3>
                      <p className="text-[10px] md:text-[11px] text-indigo-600 font-bold uppercase mt-0.5">Panduan Pertanyaan Wawancara Adaptif Navasena (AI Generated)</p>
                    </div>
                  </div>
                  <button 
                    onClick={generateQuestions} 
                    disabled={isGeneratingQuestions}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGeneratingQuestions ? 'animate-spin' : ''}`} />
                    {isGeneratingQuestions ? 'Generating...' : 'Reroll Questions'}
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-6 font-semibold">
                  Sistem mendeteksi <span className="text-indigo-600 font-bold">{activeCandidate.analysis.limitingWords.length} kata pembatas</span> dan meng-generate pertanyaan yang relevan menggunakan AI. Gunakan daftar pertanyaan perilaku adaptif di bawah ini saat wawancara mendalam untuk mengklarifikasi kematangan mental kandidat:
                </p>

                <div className="space-y-4">
                  {isGeneratingQuestions && interviewQuestions.length === 0 ? (
                    <div className="flex items-center justify-center py-10">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <span className="ml-3 text-sm font-semibold text-slate-500">AI sedang meracik pertanyaan...</span>
                    </div>
                  ) : aiError ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
                      <AlertTriangle className="w-8 h-8 text-rose-500 mb-3" />
                      <p className="text-sm font-bold text-rose-700">{aiError}</p>
                      <p className="text-xs text-rose-600 mt-1">Silakan atasi masalah ini dan klik tombol Reroll.</p>
                    </div>
                  ) : interviewQuestions.length === 0 ? (
                    <div className="text-center py-6 text-sm text-slate-500">Belum ada pertanyaan. Silakan klik tombol Reroll.</div>
                  ) : (
                    interviewQuestions.map((q, idx) => (
                      <div key={idx} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 hover:border-indigo-200 transition-colors shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-md">
                            Indikator: {q.word} ({q.category})
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">PERTANYAAN {idx+1}</span>
                        </div>
                        
                        <h4 className="font-extrabold text-sm text-slate-800 leading-relaxed border-l-2 border-indigo-600 pl-3">
                          "{q.question}"
                        </h4>

                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-[11px] leading-relaxed">
                          <strong className="text-emerald-600 font-bold uppercase tracking-wider block mb-1">Panduan Jawaban Ideal:</strong>
                          <span className="text-slate-500 font-semibold">{q.lookFor}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ============================================================
              TAB 3: COMPARE KANDIDAT MODE
              ============================================================ */}
          {activeTab === "compare" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-10">
              
              {/* Dual Selector Card */}
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-6 items-center justify-between">
                
                {/* Selector A */}
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Kandidat Pembanding A</label>
                  <select
                    value={compareA}
                    onChange={(e) => setCompareA(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/10"
                  >
                    {analyzedCandidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.student_class})</option>)}
                  </select>
                </div>

                {/* VS Divider */}
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 font-black flex items-center justify-center shrink-0 shadow-inner">
                  VS
                </div>

                {/* Selector B */}
                <div className="flex-1 w-full space-y-2">
                  <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block">Kandidat Pembanding B</label>
                  <select
                    value={compareB}
                    onChange={(e) => setCompareB(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/10"
                  >
                    {analyzedCandidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.student_class})</option>)}
                  </select>
                </div>

              </div>

              {/* Side by Side Comparison Layout */}
              {candidateAData && candidateBData ? (
                <div className="space-y-6">
                  
                  {/* MAIN COMPARATIVE KPI METRICS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Candidate A Card */}
                    <div className="bg-white p-5 md:p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-40 h-40 bg-indigo-50 rounded-full blur-3xl"></div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 text-lg font-black shrink-0">A</div>
                        <div>
                          <h3 className="text-base md:text-lg font-black text-slate-900 truncate max-w-[200px] sm:max-w-[250px]">{candidateAData.name}</h3>
                          <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-black rounded border border-indigo-100">{candidateAData.student_class}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                        <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Kesiapan</p>
                          <p className="text-xl md:text-2xl font-black text-slate-800 mt-1">{candidateAData.analysis.healthScore}</p>
                        </div>
                        <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Entropi</p>
                          <p className="text-xl md:text-2xl font-black text-rose-500 mt-1">{candidateAData.analysis.entropyScore}%</p>
                        </div>
                        <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Kesesuaian</p>
                          <p className="text-xl md:text-2xl font-black text-emerald-600 mt-1">{candidateAData.analysis.alignmentScore}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kekuatan Utama:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {candidateAData.analysis.topValues.map((w, idx) => (
                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-md">{w}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Candidate B Card */}
                    <div className="bg-white p-5 md:p-6 rounded-3xl border border-rose-100 shadow-sm space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 -mt-20 -mr-20 w-40 h-40 bg-rose-50 rounded-full blur-3xl"></div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 text-lg font-black shrink-0">B</div>
                        <div>
                          <h3 className="text-base md:text-lg font-black text-slate-900 truncate max-w-[200px] sm:max-w-[250px]">{candidateBData.name}</h3>
                          <span className="px-2.5 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded border border-rose-100">{candidateBData.student_class}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                        <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Kesiapan</p>
                          <p className="text-xl md:text-2xl font-black text-slate-800 mt-1">{candidateBData.analysis.healthScore}</p>
                        </div>
                        <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Entropi</p>
                          <p className="text-xl md:text-2xl font-black text-rose-500 mt-1">{candidateBData.analysis.entropyScore}%</p>
                        </div>
                        <div className="text-center p-3.5 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                          <p className="text-[9px] font-black text-slate-400 uppercase">Kesesuaian</p>
                          <p className="text-xl md:text-2xl font-black text-emerald-600 mt-1">{candidateBData.analysis.alignmentScore}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kekuatan Utama:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {candidateBData.analysis.topValues.map((w, idx) => (
                            <span key={idx} className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-md">{w}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* OVERLAID COMPARATIVE RADAR CHART */}
                  <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs md:text-sm font-bold text-slate-900 mb-1 tracking-wide uppercase">Analisis Benturan Siluet Karakter</h3>
                      <p className="text-[10px] md:text-[11px] text-slate-500 mb-6">Visualisasi tumpang tindih dari 10 dimensi psikologis kedua kandidat.</p>
                    </div>
                    
                    <div className="w-full h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarComparisonData}>
                          <PolarGrid stroke="#cbd5e1" opacity={0.8} />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 8 }} />
                          <Radar name={candidateAData.name} dataKey={candidateAData.name} stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} />
                          <Radar name={candidateBData.name} dataKey={candidateBData.name} stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.15} />
                          <Legend wrapperStyle={{ paddingTop: 10 }} />
                          <RechartsTooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  Silakan pilih pendaftar OSIS pada kolom drop-down pembanding di atas.
                </div>
              )}

            </div>
          )}

          {/* ============================================================
              TAB 4: PANDUAN INTERPRETASI BARRETT MODEL
              ============================================================ */}
          {activeTab === "guide" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500 pb-10 max-w-4xl mx-auto w-full text-slate-700">
              
              <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200/70 shadow-sm space-y-4">
                <h3 className="text-sm md:text-lg font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Info className="w-5 h-5 text-indigo-600" /> Mengenal Barrett Model 7 Tingkat Kesadaran
                </h3>
                <p className="text-xs leading-relaxed text-slate-500 font-semibold">
                  Barrett Model membagi fokus kesadaran psikologis pendaftar menjadi 7 tingkat. Dalam perekrutan pengurus OSIS, pemahaman atas sebaran ini membantu kita menempatkan kandidat pada posisi kepengurusan yang tepat (*Right Man in the Right Place*):
                </p>

                <div className="space-y-4 pt-2">
                  {BARRETT_LEVELS.map((item) => (
                    <div key={item.lvl} className="flex gap-4 p-4 bg-slate-50 border border-slate-100 shadow-inner rounded-2xl">
                      <div className={`w-10 h-10 rounded-xl text-white text-base font-black flex items-center justify-center shrink-0 ${item.color} shadow-sm`}>
                        {item.lvl}
                      </div>
                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-sm text-slate-800">{item.name}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-semibold">{item.desc}</p>
                        
                        <div className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded inline-block shadow-sm">
                          {item.lvl === 7 && "Saran Posisi: Ketua OSIS / Pembuat Visi / Humas Hubungan Luar"}
                          {item.lvl === 6 && "Saran Posisi: Wakil Ketua / Kordinator Lintas Sekbid / Hubungan Internal"}
                          {item.lvl === 5 && "Saran Posisi: Sekbid Keagamaan / Pengawas Kode Etik / MPK"}
                          {item.lvl === 4 && "Saran Posisi: Sekbid Inovasi / R&D / Kreatif / Kewirausahaan"}
                          {item.lvl === 3 && "Saran Posisi: Sekretaris / Bendahara / Sekbid Dokumentasi & Administrasi"}
                          {item.lvl === 2 && "Saran Posisi: Hubungan Siswa / Pengelola Konflik / Sekbid Olahraga & Seni"}
                          {item.lvl === 1 && "Saran Posisi: Perlengkapan / Logistik / Sekbid Keamanan & Disiplin Lapangan"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}