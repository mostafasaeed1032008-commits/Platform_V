import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG } from "../../theme.config";
import { 
  Award, 
  Clock, 
  Calendar, 
  Search, 
  ChevronRight, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  TrendingUp, 
  BookOpen,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { motion } from "motion/react";

export const StudentHistory: React.FC = () => {
  const { token, user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [token, user]);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/students/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load historical database record");
      const data = await res.json();
      setAttempts(data.quiz_history || []);
    } catch (err: any) {
      setError(err.message || "Failed to load past attempts");
    } finally {
      setLoading(false);
    }
  };

  // Filter and Sort past attempts
  const filteredAttempts = attempts
    .filter(attempt => {
      const titleMatches = attempt.quiz_title.toLowerCase().includes(searchQuery.toLowerCase());
      return titleMatches;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        const aPercent = a.total_questions > 0 ? (a.score / a.total_questions) : 0;
        const bPercent = b.total_questions > 0 ? (b.score / b.total_questions) : 0;
        return bPercent - aPercent;
      }
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading exam ledger snapshots...</p>
      </div>
    );
  }

  // REVIEW MODE FOR A SELECTED ATTEMPT (RENDERS DIRECTLY FROM STORED SNAPSHOT)
  if (selectedAttempt) {
    const percentage = Math.round((selectedAttempt.score / selectedAttempt.total_questions) * 100);
    const isPassed = percentage >= 50;
    
    // Check if the attempt answers is in the new full-snapshot format (array of objects)
    const isFullSnapshot = Array.isArray(selectedAttempt.answers) && 
      selectedAttempt.answers.length > 0 && 
      typeof selectedAttempt.answers[0] === "object";

    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Back Button */}
        <button 
          onClick={() => setSelectedAttempt(null)} 
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} className="stroke-[2.5]" />
          <span>BACK TO HISTORICAL LOG</span>
        </button>

        {/* Header Widget */}
        <div className={`rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 ${
          isPassed ? "bg-gradient-to-r from-emerald-600 to-teal-700" : "bg-gradient-to-r from-rose-600 to-rose-700"
        }`}>
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span>Historical Snapshot Evaluation</span>
            </div>
            <h1 className="font-display font-black text-xl sm:text-2xl tracking-tight">
              {selectedAttempt.quiz_title}
            </h1>
            <p className="text-xs text-white/80 max-w-md">
              Taken on {new Date(selectedAttempt.created_at).toLocaleString()}
            </p>
          </div>

          <div className="w-24 h-24 rounded-full border-4 border-white/20 flex flex-col items-center justify-center bg-white/10 shrink-0 select-none shadow-inner">
            <span className="text-xl font-black">{percentage}%</span>
            <span className="text-[9px] font-bold text-white/70">
              {selectedAttempt.score} / {selectedAttempt.total_questions}
            </span>
          </div>
        </div>

        {/* Question Review */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wider">
            <Eye size={16} className="text-indigo-600" /> Snapshot Itemized Review
          </h3>

          <div className="space-y-4">
            {isFullSnapshot ? (
              selectedAttempt.answers.map((question: any, qIdx: number) => {
                const isCorrect = question.is_correct;

                return (
                  <div key={qIdx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 block">QUESTION {qIdx + 1}</span>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-relaxed">{question.question}</h4>
                      </div>
                      <div className="shrink-0">
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-emerald-100 uppercase">
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold text-[10px] px-2.5 py-1 rounded-full border border-rose-100 uppercase">
                            Incorrect
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Image if present */}
                    {question.image_url && (
                      <div className="max-w-xs bg-slate-50 border border-slate-100 rounded-xl overflow-hidden aspect-video mx-auto">
                        <img src={question.image_url} alt="Review snapshot" referrerPolicy="no-referrer" className="w-full h-full object-contain p-1" />
                      </div>
                    )}

                    {/* Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                      {question.options.map((option: string, oIdx: number) => {
                        const isSelected = question.selected_index === oIdx;
                        const isCorrectChoice = question.correct_index === oIdx;

                        let styleClasses = "bg-slate-50/50 border-slate-100 text-slate-600";
                        if (isCorrectChoice) {
                          styleClasses = "bg-emerald-50 border-emerald-300 text-emerald-800";
                        } else if (isSelected && !isCorrectChoice) {
                          styleClasses = "bg-rose-50 border-rose-300 text-rose-800";
                        }

                        return (
                          <div key={oIdx} className={`p-3 rounded-xl border flex items-center justify-between ${styleClasses}`}>
                            <span>{option}</span>
                            <div className="shrink-0 ml-2">
                              {isCorrectChoice && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                              {isSelected && !isCorrectChoice && <XCircle size={14} className="text-rose-600 shrink-0" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {question.explanation && (
                      <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl space-y-1 text-xs">
                        <span className="font-bold text-indigo-700 block text-[10px] uppercase tracking-wider">Educational Explanation:</span>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback for old-style logs
              <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 text-xs">
                <p className="font-semibold">This attempt was recorded with legacy metadata.</p>
                <p className="text-slate-400 mt-1">Legibly parsed score details are logged as: {selectedAttempt.score} out of {selectedAttempt.total_questions} answers right.</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setSelectedAttempt(null)}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-sm text-xs uppercase tracking-wider cursor-pointer"
        >
          Return to History List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">My Exam & Quiz History</h1>
        <p className="text-xs text-slate-500">Track all your completed exercises, review question-by-question explanations, and check your progress logs.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-4 rounded-2xl shadow-xs">
        {/* Search Field */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search exam title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Sort Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
          <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Filter size={12} /> Sort By:
          </span>
          <div className="flex bg-slate-50 border border-slate-150 p-0.5 rounded-lg">
            <button
              onClick={() => setSortBy("date")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                sortBy === "date" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Latest Taken
            </button>
            <button
              onClick={() => setSortBy("score")}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                sortBy === "score" 
                  ? "bg-white text-indigo-600 shadow-xs" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Highest Score
            </button>
          </div>
        </div>
      </div>

      {/* Historical List */}
      {filteredAttempts.length === 0 ? (
        <div className={`${THEME_CONFIG.classes.card} p-12 text-center space-y-4`}>
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-700 text-sm">No Attempts Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have not finished any exams or standalone quizzes that match your parameters yet.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
          {filteredAttempts.map((attempt) => {
            const percentage = Math.round((attempt.score / attempt.total_questions) * 100);
            const isPassed = percentage >= 50;

            return (
              <div 
                key={attempt.id}
                onClick={() => setSelectedAttempt(attempt)}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4 min-w-0 pr-4">
                  {/* Score badge circle */}
                  <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-bold shrink-0 shadow-xs border ${
                    isPassed 
                      ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                      : "bg-rose-50 border-rose-100 text-rose-700"
                  }`}>
                    <span className="text-xs font-black">{percentage}%</span>
                    <span className="text-[8px] opacity-80">{attempt.score}/{attempt.total_questions}</span>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h3 className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                      {attempt.quiz_title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(attempt.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {new Date(attempt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Review <ChevronRight size={12} className="stroke-[3]" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
