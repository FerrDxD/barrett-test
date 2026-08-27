"use server";

import { GoogleGenAI } from "@google/genai";

export async function generateInterviewQuestions(candidateData: any) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { 
        success: false, 
        error: "API Key Gemini tidak ditemukan. Harap pastikan GEMINI_API_KEY sudah diatur di file .env.local dan restart server Anda." 
      };
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Anda adalah seorang recruiter profesional yang akan mewawancarai kandidat pengurus OSIS.
      Berikut adalah data hasil tes kandidat:
      
      Nama: ${candidateData.name}
      Kelas: ${candidateData.student_class}
      Kesiapan Mental (Health Score): ${candidateData.analysis.healthScore}
      Hambatan (Entropy Score): ${candidateData.analysis.entropyScore}
      Karakteristik Dominan: ${candidateData.analysis.topValues.join(", ")}
      Indikator Hambatan / Titik Lemah: ${candidateData.analysis.limitingWords.join(", ")}
      
      Tugas Anda:
      Buatlah 4 pertanyaan wawancara adaptif yang relevan dan berkorelasi langsung dengan indikator kekuatan (Karakteristik Dominan) dan hambatan (Indikator Hambatan / Titik Lemah) kandidat ini.
      Fokus pada area hambatan untuk menguji bagaimana mereka mengatasi tekanan atau kecemasan, dan pada kekuatan untuk menguji bagaimana mereka memanfaatkannya dengan baik dalam organisasi (OSIS).
      
      Format output wajib berupa array of objects dalam format JSON (tanpa format markdown tambahan). Contoh:
      [
        {
          "word": "Kata kunci terkait (misal: Tertekan / Fokus)",
          "category": "Kategori terkait (misal: Tekanan / Analisis Positif)",
          "question": "Pertanyaan wawancara di sini...",
          "lookFor": "Hal yang perlu diperhatikan dari jawaban kandidat..."
        }
      ]
      
      Hanya hasilkan JSON array yang berisi tepat 4 pertanyaan. Pastikan unik dan berbeda dari pertanyaan sebelumnya jika ini di-generate ulang.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let text = response.text || "[]";
    // Bersihkan dari markdown block jika ada
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return { success: true, data: JSON.parse(text) };
  } catch (error: any) {
    console.error("Gagal menghasilkan pertanyaan:", error);
    let errorMessage = "Terjadi kesalahan yang tidak diketahui saat menghasilkan pertanyaan.";
    
    // Check if it's a 429 rate limit error
    if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('exceeded your current quota')) {
      errorMessage = "Limit API Gemini Anda sudah habis (Quota Exceeded). Silakan ganti API Key atau coba lagi nanti.";
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}
