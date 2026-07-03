import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG } from "../../theme.config";
import { 
  HelpCircle, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Award,
  ChevronRight,
  RefreshCw,
  Eye
} from "lucide-react";
import { motion } from "motion/react";

interface StudentQuizProps {
  quizId: string;
  onBack: () => void;
}

export const StudentQuiz: React.FC<StudentQuizProps> = ({ quizId, onBack }) => {
  const { token, user } = useAuth();
  const [quiz, setQuiz] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Take states
  const [started, setStarted] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [chosenAnswers, setChosenAnswers] = useState<number[]>([]); // Array of indices corresponding to questions

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(0); // In seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Result attempt details
  const [attemptResult, setAttemptResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<boolean>(false);

  // Warn on navigate-away or tab close
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (started && !submitted) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit? Your exam is currently in progress and leaving might submit or lose progress.";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [started, submitted]);

  useEffect(() => {
    fetchQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [quizId]);

  const fetchQuiz = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/quizzes/${quizId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("Access Denied. Please make sure you are enrolled in the course associated with this quiz.");
          }
          throw new Error("Quiz not found or server error");
        }
        return res.json();
      })
      .then((data) => {
        setQuiz(data);
        const sessionKey = `quiz_session_${user?.id}_${quizId}`;
        const saved = localStorage.getItem(sessionKey);
        
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const elapsedSeconds = Math.floor((Date.now() - parsed.startTime) / 1000);
            const totalDurationSeconds = data.duration_minutes * 60;
            const remainingSeconds = totalDurationSeconds - elapsedSeconds;
            
            if (remainingSeconds > 0) {
              setChosenAnswers(parsed.chosenAnswers || new Array(data.questions.length).fill(-1));
              setTimeLeft(remainingSeconds);
              setStarted(true);
              startTimer(parsed.startTime, totalDurationSeconds);
              return;
            } else {
              // Clear session key
              localStorage.removeItem(sessionKey);
              // Time has expired while off, trigger submit with cached choices
              const lastAnswers = parsed.chosenAnswers || new Array(data.questions.length).fill(-1);
              setChosenAnswers(lastAnswers);
              triggerDirectSubmit(lastAnswers);
              return;
            }
          } catch (e) {
            console.error("Failed to restore saved quiz session", e);
          }
        }
        
        setChosenAnswers(new Array(data.questions.length).fill(-1));
        setTimeLeft(data.duration_minutes * 60);
      })
      .catch((err: any) => setError(err.message))
      .finally(() => setLoading(false));
  };

  const startTimer = (startTimeMs: number, totalDurationSec: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTimeMs) / 1000);
      const remaining = totalDurationSec - elapsedSeconds;
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        triggerAutoSubmit();
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
  };

  // Start the timer
  const startQuiz = () => {
    setStarted(true);
    const sessionKey = `quiz_session_${user?.id}_${quizId}`;
    const startTime = Date.now();
    const initialAnswers = new Array(quiz.questions.length).fill(-1);
    localStorage.setItem(sessionKey, JSON.stringify({
      startTime,
      chosenAnswers: initialAnswers
    }));
    setChosenAnswers(initialAnswers);
    startTimer(startTime, quiz.duration_minutes * 60);
  };

  const handleSelectAnswer = (choiceIndex: number) => {
    const updated = [...chosenAnswers];
    updated[currentQuestionIndex] = choiceIndex;
    setChosenAnswers(updated);
    
    // Persist to local storage
    const sessionKey = `quiz_session_${user?.id}_${quizId}`;
    const saved = localStorage.getItem(sessionKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        parsed.chosenAnswers = updated;
        localStorage.setItem(sessionKey, JSON.stringify(parsed));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Auto submission when timer runs out
  const triggerAutoSubmit = () => {
    submitQuizAttempt();
  };

  const triggerDirectSubmit = async (answersToSubmit: number[]) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ answers: answersToSubmit })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit attempt");
      setAttemptResult(data.attempt);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your attempt.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitQuizAttempt = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitting(true);

    // Remove local storage session first on deliberate submit
    const sessionKey = `quiz_session_${user?.id}_${quizId}`;
    localStorage.removeItem(sessionKey);

    try {
      // Build index choices array (fill -1 if unanswered)
      const sanitizedAnswers = chosenAnswers.map(ans => ans === -1 ? -1 : ans);

      const res = await fetch(`/api/quizzes/${quizId}/attempt`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ answers: sanitizedAnswers })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit attempt");

      setAttemptResult(data.attempt);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "An error occurred while submitting your attempt.");
    } finally {
      setSubmitting(false);
    }
  };

  // Timer formatter
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading exam parameters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${THEME_CONFIG.classes.card} p-12 text-center max-w-xl mx-auto space-y-4`}>
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <div className="space-y-1">
          <h3 className="font-bold text-slate-800 text-sm">Action Blocked</h3>
          <p className="text-xs text-slate-500 leading-relaxed">{error}</p>
        </div>
        <button onClick={onBack} className={THEME_CONFIG.classes.secondaryButton}>
          Back to Curriculum
        </button>
      </div>
    );
  }

  if (!quiz) return null;

  // 1. INSTRUCTION / WELCOME SCREEN
  if (!started && !submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer">
          <ArrowLeft size={14} className="stroke-[2.5]" />
          <span>BACK TO SYLLABUS</span>
        </button>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="space-y-3 text-center border-b border-slate-100 pb-6">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Award size={32} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Exercise Portal</span>
              <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-800 tracking-tight">{quiz.title}</h1>
            </div>
          </div>

          {/* Guidelines */}
          <div className="space-y-4 text-xs text-slate-600">
            <h3 className="font-bold text-slate-800 text-sm">Exam Parameters & Regulations:</h3>
            <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Duration Allowed</span>
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <Clock size={14} className="text-indigo-600" /> {quiz.duration_minutes} Minutes
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Questions</span>
                <span className="font-bold text-slate-800 text-sm flex items-center gap-1">
                  <HelpCircle size={14} className="text-indigo-600" /> {quiz.questions.length} Items
                </span>
              </div>
            </div>

            <div className="space-y-2 leading-relaxed bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-amber-800">
              <p className="font-bold">⚠️ Security Notice:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px]">
                <li>Once you start, the active countdown timer cannot be paused or stopped.</li>
                <li>Closing or refreshing this window will automatically submit your attempt.</li>
                <li>Ensure a stable network connection before starting the exercise.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={startQuiz}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-sm uppercase tracking-wider text-xs cursor-pointer"
          >
            Start Quiz Session
          </button>
        </motion.div>
      </div>
    );
  }

  // 2. ACTIVE TEST TAKING ENGINE
  if (started && !submitted) {
    const activeQuestion = quiz.questions[currentQuestionIndex];
    const isFirstQuestion = currentQuestionIndex === 0;
    const isLastQuestion = currentQuestionIndex === quiz.questions.length - 1;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left main quiz questions card */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
            
            {/* Question Card Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Question {currentQuestionIndex + 1} of {quiz.questions.length}
              </span>
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${
                timeLeft < (quiz.duration_minutes * 60 * 0.2) 
                  ? "bg-rose-50 border-rose-200 text-rose-700 animate-pulse" 
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}>
                <Clock size={14} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            </div>

            {/* Display Question Text */}
            <div className="space-y-4">
              <h2 className="font-display font-semibold text-slate-800 text-sm sm:text-base leading-relaxed">
                {activeQuestion.question}
              </h2>

              {/* Optional Question Image */}
              {activeQuestion.image_url && (
                <div className="max-w-md w-full bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden aspect-video mx-auto">
                  <img
                    src={activeQuestion.image_url}
                    alt="Question Illustration"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain p-2"
                  />
                </div>
              )}
            </div>

            {/* MCQ Options list */}
            <div className="space-y-3">
              {activeQuestion.options.map((option: string, idx: number) => {
                const isSelected = chosenAnswers[currentQuestionIndex] === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(idx)}
                    className={`w-full text-left p-4 rounded-xl border font-medium text-xs flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                    }`}
                  >
                    <span>{option}</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white"
                    }`}>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigator Buttons */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <button
                onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                disabled={isFirstQuestion}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 transition-all cursor-pointer ${
                  isFirstQuestion ? "opacity-30 cursor-not-allowed" : "hover:bg-slate-50"
                }`}
              >
                <ArrowLeft size={14} className="stroke-[2.5]" /> Prev
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm text-xs uppercase tracking-wider cursor-pointer"
                >
                  {submitting ? "Evaluating..." : "Finish & Submit"}
                </button>
              ) : (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  Next <ArrowRight size={14} className="stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar Question Number Navigator */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-widest">Question Index</h3>
            <p className="text-[10px] text-slate-400 font-semibold">JUMP DIRECTLY TO QUESTIONS</p>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {quiz.questions.map((_, idx) => {
              const isAnswered = chosenAnswers[idx] !== -1;
              const isActive = currentQuestionIndex === idx;

              return (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer border ${
                    isActive
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm scale-105"
                      : isAnswered
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowSubmitConfirm(true)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-sm text-xs uppercase tracking-wider text-center cursor-pointer mt-4"
          >
            Submit Exam
          </button>
        </div>

        {/* Confirmation Overlay Modal */}
        {showSubmitConfirm && (() => {
          const answeredCount = chosenAnswers.filter(ans => ans !== -1).length;
          const unansweredCount = quiz.questions.length - answeredCount;

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-100"
              >
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                    <HelpCircle size={24} />
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-base">Submit Your Exam?</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    You have answered <span className="font-bold text-indigo-600">{answeredCount}</span> out of <span className="font-bold text-slate-700">{quiz.questions.length}</span> questions.
                  </p>
                  {unansweredCount > 0 && (
                    <div className="bg-amber-50 text-amber-800 rounded-xl p-3 text-[11px] font-semibold text-left border border-amber-100 space-y-1">
                      <p>⚠️ Attention Needed:</p>
                      <p className="font-medium text-amber-700">
                        You have {unansweredCount} unanswered question{unansweredCount > 1 ? "s" : ""}. Unanswered items will automatically evaluate as incorrect.
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSubmitConfirm(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => {
                      setShowSubmitConfirm(false);
                      submitQuizAttempt();
                    }}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                  >
                    {submitting ? "Submitting..." : "Yes, Submit"}
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </div>
    );
  }

  // 3. POST-EXAMINATION REVIEW SCREEN
  if (submitted && attemptResult) {
    const percentage = Math.round((attemptResult.score / attemptResult.total_questions) * 100);
    const isPassed = percentage >= 50;

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Results Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6 ${
            isPassed ? "bg-gradient-to-r from-emerald-600 to-teal-700" : "bg-gradient-to-r from-rose-600 to-rose-700"
          }`}
        >
          <div className="space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              <span>Evaluation Finalized</span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight">
              {isPassed ? "Congratulations! You Passed" : "Keep Learning!"}
            </h1>
            <p className="text-xs text-white/80 max-w-md">
              Your exam has been parsed successfully. Check the correct responses and comprehensive explanations generated below.
            </p>
          </div>

          {/* Circle score widget */}
          <div className="w-28 h-28 rounded-full border-4 border-white/20 flex flex-col items-center justify-center bg-white/10 shrink-0 select-none shadow-inner">
            <span className="text-2xl font-black">{percentage}%</span>
            <span className="text-[10px] font-bold text-white/70">
              {attemptResult.score} / {attemptResult.total_questions}
            </span>
          </div>
        </motion.div>

        {/* Question-by-Question Review */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5 uppercase tracking-wider">
            <Eye size={16} className="text-indigo-600" /> Answer Key & Explanations
          </h3>

          <div className="space-y-4">
            {quiz.questions.map((question: any, qIdx: number) => {
              const studentChoice = chosenAnswers[qIdx];
              const correctChoice = question.correct_index;
              const isCorrect = studentChoice === correctChoice;

              return (
                <div key={qIdx} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">QUESTION {qIdx + 1}</span>
                      <h4 className="font-bold text-slate-800 text-xs sm:text-sm leading-relaxed">{question.question}</h4>
                    </div>
                    {/* Grade Icon */}
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

                  {/* Question Image if present in review */}
                  {question.image_url && (
                    <div className="max-w-xs bg-slate-50 border border-slate-100 rounded-xl overflow-hidden aspect-video mx-auto">
                      <img src={question.image_url} alt="Review graphic" referrerPolicy="no-referrer" className="w-full h-full object-contain p-1" />
                    </div>
                  )}

                  {/* Choices list with colored highlights */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                    {question.options.map((option: string, oIdx: number) => {
                      const isSelected = studentChoice === oIdx;
                      const isCorrectChoice = correctChoice === oIdx;

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

                  {/* Educational explanation panel */}
                  <div className="bg-indigo-50/50 border border-indigo-100/50 p-4 rounded-xl space-y-1 text-xs">
                    <span className="font-bold text-indigo-700 block text-[10px] uppercase tracking-wider">Educational Explanation:</span>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      {question.explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onBack}
          className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-sm text-xs uppercase tracking-wider cursor-pointer"
        >
          Return to Syllabus
        </button>
      </div>
    );
  }

  return null;
};
