import React, { useEffect, useState } from "react";
import { Plus, Trash2, Brain, Sparkles, AlertCircle, Save, CheckCircle, HelpCircle, Edit3, Code, FileJson, Upload } from "lucide-react";
import { Course, Quiz, Question } from "../../types";

export const TeacherQuizzes: React.FC = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Mode state
  const [activeTab, setActiveTab] = useState<"list" | "create_manual" | "generate_ai" | "create_json">("list");

  // JSON Code builder states
  const [jsonCode, setJsonCode] = useState<string>("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Form states for manual & saved quizzes
  const [quizTitle, setQuizTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [questions, setQuestions] = useState<Question[]>([
    { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }
  ]);

  // AI Generator Form states
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Medium");
  const [aiCount, setAiCount] = useState(5);
  const [aiSourceText, setAiSourceText] = useState("");
  const [aiIncludeImages, setAiIncludeImages] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);

  // AI Preview Review Panel states
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<Question[]>([]);
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    fetchQuizzesAndCourses();
  }, []);

  const fetchQuizzesAndCourses = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

      const quizRes = await fetch("/api/quizzes", { headers });
      if (!quizRes.ok) throw new Error("Failed to fetch quizzes list");
      const quizData = await quizRes.json();
      setQuizzes(quizData);

      const coursesRes = await fetch("/api/courses", { headers });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  // Manual Question handlers
  const handleAddQuestionField = () => {
    setQuestions(prev => [
      ...prev,
      { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }
    ]);
  };

  const handleRemoveQuestionField = (qIdx: number) => {
    if (questions.length === 1) return;
    setQuestions(prev => prev.filter((_, idx) => idx !== qIdx));
  };

  const handleUpdateQuestionText = (qIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIdx ? { ...q, question: text } : q));
  };

  const handleUpdateOptionText = (qIdx: number, optIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const updatedOpts = [...q.options];
      updatedOpts[optIdx] = text;
      return { ...q, options: updatedOpts };
    }));
  };

  const handleUpdateCorrectIndex = (qIdx: number, val: number) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIdx ? { ...q, correct_index: val } : q));
  };

  const handleUpdateExplanationText = (qIdx: number, text: string) => {
    setQuestions(prev => prev.map((q, idx) => idx === qIdx ? { ...q, explanation: text } : q));
  };

  // Submit Manual Quiz
  const handleSaveManualQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle) {
      alert("Quiz Title is required");
      return;
    }

    // Validate manual questions
    for (const q of questions) {
      if (!q.question || q.options.some(o => !o) || !q.explanation) {
        alert("Please fill in all question fields, options, and explanations.");
        return;
      }
    }

    const payload = {
      title: quizTitle,
      course_id: selectedCourseId || null,
      duration_minutes: Number(durationMinutes) || 30,
      questions
    };

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to create quiz");

      alert("Quiz created successfully!");
      // Reset
      setQuizTitle("");
      setSelectedCourseId("");
      setDurationMinutes(30);
      setQuestions([{ question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }]);
      setActiveTab("list");
      fetchQuizzesAndCourses();
    } catch (err: any) {
      alert(err.message || "Failed to create quiz");
    }
  };

  // Gemini AI Generation Call
  const handleGenerateAIQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTopic) {
      alert("Please enter a quiz topic");
      return;
    }

    setGeneratingAI(true);
    setError("");
    try {
      const res = await fetch("/api/quizzes/generate-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          topic: aiTopic,
          difficulty: aiDifficulty,
          question_count: aiCount,
          source_text: aiSourceText,
          include_images: aiIncludeImages
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate AI quiz");
      }

      const data = await res.json();
      setAiGeneratedQuestions(data.questions);
      setReviewMode(true);
    } catch (err: any) {
      setError(err.message || "Failed to generate AI Quiz.");
    } finally {
      setGeneratingAI(false);
    }
  };

  // Save Approved AI Quiz
  const handleSaveApprovedAIQuiz = async () => {
    if (!quizTitle) {
      alert("Please enter a Quiz Title for the approved quiz.");
      return;
    }

    // Double check correctness
    for (const q of aiGeneratedQuestions) {
      if (!q.question || q.options.some(o => !o) || !q.explanation) {
        alert("Please ensure all edited questions are completely filled in.");
        return;
      }
    }

    const payload = {
      title: quizTitle,
      course_id: selectedCourseId || null,
      duration_minutes: Number(durationMinutes) || 30,
      questions: aiGeneratedQuestions
    };

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save approved AI quiz");

      alert("AI Generated Quiz Approved and Saved Successfully!");
      // Reset AI Forms
      setQuizTitle("");
      setSelectedCourseId("");
      setDurationMinutes(30);
      setAiTopic("");
      setAiSourceText("");
      setAiGeneratedQuestions([]);
      setReviewMode(false);
      setActiveTab("list");
      fetchQuizzesAndCourses();
    } catch (err: any) {
      alert(err.message || "Failed to save approved quiz.");
    }
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this quiz? Students will no longer be able to take it.")) return;

    try {
      const res = await fetch(`/api/quizzes/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      if (!res.ok) throw new Error("Failed to delete quiz");
      fetchQuizzesAndCourses();
    } catch (err: any) {
      alert(err.message || "Failed to delete quiz");
    }
  };

  const handleLoadJSONTemplate = () => {
    const template = {
      title: "Sample Physics Quiz",
      duration_minutes: 15,
      questions: [
        {
          question: "What is the unit of electric current?",
          options: ["Volt", "Ampere", "Ohm", "Watt"],
          correct_index: 1,
          explanation: "The Ampere is the base unit of electric current in the International System of Units (SI)."
        },
        {
          question: "Light behaves as both a wave and a ______.",
          options: ["Particle", "Ray", "Beam", "Pulse"],
          correct_index: 0,
          explanation: "Light displays wave-particle duality, exhibiting properties of both waves and particles (photons)."
        }
      ]
    };
    setJsonCode(JSON.stringify(template, null, 2));
    setJsonError(null);
    setQuizTitle(template.title);
    setDurationMinutes(template.duration_minutes);
  };

  const handleJSONFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJsonCode(text);
      validateJSON(text);
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDropJSON = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          setJsonCode(text);
          validateJSON(text);
        };
        reader.readAsText(file);
      } else {
        setJsonError("Invalid file type. Please upload a .json file.");
      }
    }
  };

  const validateJSON = (codeString: string): any => {
    if (!codeString.trim()) {
      setJsonError("JSON is empty.");
      return null;
    }
    try {
      const parsed = JSON.parse(codeString);
      
      let finalQuestions = [];
      let finalTitle = quizTitle;
      let finalDuration = durationMinutes;

      if (Array.isArray(parsed)) {
        finalQuestions = parsed;
      } else if (parsed && typeof parsed === "object") {
        if (parsed.title) {
          finalTitle = parsed.title;
          setQuizTitle(parsed.title);
        }
        if (typeof parsed.duration_minutes === "number") {
          finalDuration = parsed.duration_minutes;
          setDurationMinutes(parsed.duration_minutes);
        }
        if (Array.isArray(parsed.questions)) {
          finalQuestions = parsed.questions;
        } else {
          setJsonError("Object must contain a 'questions' array, or be an array of questions directly.");
          return null;
        }
      } else {
        setJsonError("Invalid JSON structure. Must be an object or an array.");
        return null;
      }

      if (finalQuestions.length === 0) {
        setJsonError("The questions array is empty.");
        return null;
      }

      for (let i = 0; i < finalQuestions.length; i++) {
        const q = finalQuestions[i];
        if (!q.question) {
          setJsonError(`Question #${i + 1} is missing the 'question' text.`);
          return null;
        }
        if (!Array.isArray(q.options) || q.options.length < 2) {
          setJsonError(`Question #${i + 1} must have an 'options' array with at least 2 choices.`);
          return null;
        }
        if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index >= q.options.length) {
          setJsonError(`Question #${i + 1} has an invalid or out-of-bounds 'correct_index' (value: ${q.correct_index}).`);
          return null;
        }
        if (!q.explanation) {
          setJsonError(`Question #${i + 1} is missing an 'explanation'.`);
          return null;
        }
      }

      setJsonError(null);
      return { title: finalTitle, duration_minutes: finalDuration, questions: finalQuestions };
    } catch (e: any) {
      setJsonError(`JSON Syntax Error: ${e.message}`);
      return null;
    }
  };

  const handleSaveJSONQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const validated = validateJSON(jsonCode);
    if (!validated) {
      alert("Please fix JSON format or schema validation errors first.");
      return;
    }

    if (!quizTitle.trim()) {
      alert("Please enter a Quiz Title.");
      return;
    }

    const payload = {
      title: quizTitle,
      course_id: selectedCourseId || null,
      duration_minutes: durationMinutes,
      questions: validated.questions
    };

    try {
      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create quiz");
      }

      alert("JSON Code Quiz Published Successfully!");
      setJsonCode("");
      setQuizTitle("");
      setSelectedCourseId("");
      setDurationMinutes(30);
      setActiveTab("list");
      fetchQuizzesAndCourses();
    } catch (err: any) {
      alert(err.message || "Failed to create quiz");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Quiz Management</h1>
          <p className="text-slate-500 text-sm mt-1">Design course exams manually or create them instantly with Gemini AI.</p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl gap-1 shrink-0">
          <button
            onClick={() => { setActiveTab("list"); setReviewMode(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "list" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Quizzes List
          </button>
          <button
            onClick={() => { setActiveTab("create_manual"); setReviewMode(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${activeTab === "create_manual" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            Manual Builder
          </button>
          <button
            onClick={() => { setActiveTab("create_json"); setReviewMode(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${activeTab === "create_json" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Code size={14} className={activeTab === "create_json" ? "text-indigo-600" : "text-slate-500"} />
            JSON Code Builder
          </button>
          <button
            onClick={() => { setActiveTab("generate_ai"); setReviewMode(false); }}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-1 ${activeTab === "generate_ai" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
          >
            <Brain size={14} className={activeTab === "generate_ai" ? "text-indigo-600" : "text-slate-500"} />
            Gemini AI Creator
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* VIEW: QUIZZES LIST */}
      {activeTab === "list" && (
        loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
            <Sparkles className="mx-auto text-slate-300 mb-4" size={48} />
            <h3 className="font-display font-bold text-slate-700 text-lg">No Quizzes Published</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
              Assess your students by creating a quiz manual exam, or save time using our intelligent Gemini AI Quiz builder.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <button
                onClick={() => setActiveTab("create_manual")}
                className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-indigo-600 border border-indigo-100 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Create Manually
              </button>
              <button
                onClick={() => setActiveTab("generate_ai")}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm transition-colors"
              >
                Let AI Generate One
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => (
              <div key={quiz.id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-sm flex flex-col justify-between h-48 group">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {courses.find(c => c.id === quiz.course_id)?.title || "Standalone Quiz"}
                    </span>
                    <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-semibold">
                      {quiz.duration_minutes} mins
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-slate-800 text-lg mt-3 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-slate-500 text-xs mt-1.5 font-medium">
                    {quiz.questions.length} Multiple Choice Questions
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 mt-4 flex items-center justify-end">
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-600 font-bold uppercase tracking-wider cursor-pointer"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* VIEW: MANUAL BUILDER */}
      {activeTab === "create_manual" && (
        <form onSubmit={handleSaveManualQuiz} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-xl font-display font-bold text-slate-900 border-b border-slate-100 pb-3">Manual Exam Designer</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quiz Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Unit 2 Midterm Exam"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Belongs to Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              >
                <option value="">Standalone / Public Quiz</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Exam Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(5, parseInt(e.target.value) || 30))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* Manual Questions list */}
          <div className="space-y-6 pt-6 border-t border-slate-100">
            <div className="flex justify-between items-center">
              <h4 className="font-display font-bold text-slate-800 text-md">Exam Questions ({questions.length})</h4>
              <button
                type="button"
                onClick={handleAddQuestionField}
                className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider cursor-pointer"
              >
                <Plus size={15} /> Add Question
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 relative">
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestionField(qIdx)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove Question"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Question {qIdx + 1}</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter the question text..."
                    value={q.question}
                    onChange={(e) => handleUpdateQuestionText(qIdx, e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase w-6 shrink-0">Opt {optIdx + 1}</span>
                      <input
                        type="text"
                        required
                        placeholder={`Option ${optIdx + 1}`}
                        value={opt}
                        onChange={(e) => handleUpdateOptionText(qIdx, optIdx, e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Correct Answer</label>
                    <select
                      value={q.correct_index}
                      onChange={(e) => handleUpdateCorrectIndex(qIdx, parseInt(e.target.value))}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2"
                    >
                      <option value="0">Option 1</option>
                      <option value="1">Option 2</option>
                      <option value="2">Option 3</option>
                      <option value="3">Option 4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Explanation for correct answer</label>
                    <input
                      type="text"
                      required
                      placeholder="Explain why this choice is correct..."
                      value={q.explanation}
                      onChange={(e) => handleUpdateExplanationText(qIdx, e.target.value)}
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setActiveTab("list"); }}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Publish Quiz
            </button>
          </div>
        </form>
      )}

      {/* VIEW: GEMINI AI GENERATOR */}
      {activeTab === "generate_ai" && !reviewMode && (
        <form onSubmit={handleGenerateAIQuiz} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Brain className="text-indigo-600" size={24} />
            <h2 className="text-xl font-display font-bold text-slate-900">Gemini AI Smart Exam Generator</h2>
          </div>

          <p className="text-slate-500 text-xs max-w-lg leading-relaxed">
            Quickly generate highly customized multiple-choice quiz questions using Gemini 3.5 Flash. Give it a theme topic or provide your own textbook reading block, and it will construct verified, educational multiple-choice assessments.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Academic Topic</label>
              <input
                type="text"
                required
                placeholder="e.g. Newton's laws of motion, Organic chemistry, etc."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Difficulty Level</label>
                <select
                  value={aiDifficulty}
                  onChange={(e) => setAiDifficulty(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 text-sm"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Question Count</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={aiCount}
                  onChange={(e) => setAiCount(Math.min(15, Math.max(1, parseInt(e.target.value) || 5)))}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Reference Source Text (Optional)</label>
              <textarea
                rows={4}
                placeholder="Paste paragraph reading text, questions, formula definitions, or summaries here to force Gemini to generate accurate questions restricted to this source material..."
                value={aiSourceText}
                onChange={(e) => setAiSourceText(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-3 rounded-xl">
              <input
                id="ai-include-images"
                type="checkbox"
                checked={aiIncludeImages}
                onChange={(e) => setAiIncludeImages(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500/20 focus:ring-2 cursor-pointer"
              />
              <label htmlFor="ai-include-images" className="text-xs text-slate-700 font-semibold cursor-pointer">
                Include Illustrative Images (Automatically fetch free diagrams/photos from Wikimedia Commons)
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setActiveTab("list"); }}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generatingAI}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {generatingAI ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  AI Generating...
                </>
              ) : (
                <>
                  <Sparkles size={16} /> Generate AI Quiz
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* VIEW: GEMINI AI REVIEW AND APPROVE PANEL */}
      {activeTab === "generate_ai" && reviewMode && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-emerald-500" size={24} />
              <h2 className="text-xl font-display font-bold text-slate-900">Review Generated AI Questions</h2>
            </div>
            <button
              onClick={() => setReviewMode(false)}
              className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
            >
              Back to Generator
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>
              Please review the generated questions, answers, and explanations. You can modify any option or text right inside this editor sheet. Enter a title and select a course below when satisfied to authorize publishing.
            </p>
          </div>

          {/* Config row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Quiz Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Quiz on Newton's Laws"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Link to Course (Optional)</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none text-xs"
              >
                <option value="">Standalone / Public Quiz</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration (Minutes)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Questions review boxes */}
          <div className="space-y-6 pt-4">
            {aiGeneratedQuestions.map((q, qIdx) => (
              <div key={qIdx} className="p-5 border border-indigo-100 bg-indigo-50/10 rounded-2xl space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 flex justify-between">
                    <span>Generated Question {qIdx + 1}</span>
                    {q.image_url && <span className="text-[9px] text-emerald-600 bg-emerald-50 px-2 rounded-sm truncate max-w-xs">Has Image: {q.image_url}</span>}
                  </label>
                  <input
                    type="text"
                    required
                    value={q.question}
                    onChange={(e) => {
                      const updated = [...aiGeneratedQuestions];
                      updated[qIdx].question = e.target.value;
                      setAiGeneratedQuestions(updated);
                    }}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none"
                  />
                </div>

                {/* Option editor fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase w-8">Opt {optIdx + 1}</span>
                      <input
                        type="text"
                        required
                        value={opt}
                        onChange={(e) => {
                          const updated = [...aiGeneratedQuestions];
                          updated[qIdx].options[optIdx] = e.target.value;
                          setAiGeneratedQuestions(updated);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Correct Option index</label>
                    <select
                      value={q.correct_index}
                      onChange={(e) => {
                        const updated = [...aiGeneratedQuestions];
                        updated[qIdx].correct_index = parseInt(e.target.value);
                        setAiGeneratedQuestions(updated);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none"
                    >
                      <option value="0">Option 1</option>
                      <option value="1">Option 2</option>
                      <option value="2">Option 3</option>
                      <option value="3">Option 4</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Education Explanation</label>
                    <input
                      type="text"
                      required
                      value={q.explanation}
                      onChange={(e) => {
                        const updated = [...aiGeneratedQuestions];
                        updated[qIdx].explanation = e.target.value;
                        setAiGeneratedQuestions(updated);
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={() => setReviewMode(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveApprovedAIQuiz}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-colors"
            >
              <Save size={16} /> Approve & Publish Quiz
            </button>
          </div>
        </div>
      )}

      {/* VIEW: JSON CODE BUILDER */}
      {activeTab === "create_json" && (
        <form onSubmit={handleSaveJSONQuiz} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-xl font-display font-bold text-slate-900">JSON Exam Code Compiler</h2>
              <p className="text-slate-500 text-xs mt-1">Compile or upload custom JSON code objects to instantly build structured quiz exams.</p>
            </div>
            <button
              type="button"
              onClick={handleLoadJSONTemplate}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Load Sample Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Quiz Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Newton's Mechanics Midterm"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Belongs to Course</label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              >
                <option value="">Standalone / Public Quiz</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Exam Duration (Minutes)</label>
              <input
                type="number"
                min="5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Math.max(5, parseInt(e.target.value) || 30))}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>
          </div>

          {/* File drag and drop upload field */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDropJSON}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              dragOver ? "border-indigo-500 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 bg-slate-50"
            }`}
          >
            <FileJson className="mx-auto text-slate-400 mb-2" size={36} />
            <p className="text-xs text-slate-600 font-semibold">
              Drag and drop your quiz `.json` file here, or{" "}
              <label className="text-indigo-600 hover:text-indigo-800 cursor-pointer underline font-bold">
                browse files
                <input
                  type="file"
                  accept="application/json"
                  onChange={handleJSONFileUpload}
                  className="hidden"
                />
              </label>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Upload a valid JSON file containing an array of questions or complete quiz object structure</p>
          </div>

          {/* Editor and Preview Area */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                JSON Code Area
              </label>
              {jsonError ? (
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <AlertCircle size={10} /> {jsonError}
                </span>
              ) : jsonCode.trim() ? (
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-sm flex items-center gap-1">
                  <CheckCircle size={10} /> Code Valid & Ready
                </span>
              ) : null}
            </div>

            <textarea
              rows={12}
              placeholder='Paste JSON code here. Example:&#10;{&#10;  "title": "My Quiz",&#10;  "questions": [&#10;    {&#10;      "question": "What is the capital of France?",&#10;      "options": ["London", "Berlin", "Paris", "Rome"],&#10;      "correct_index": 2,&#10;      "explanation": "Paris is the capital and most populous city of France."&#10;    }&#10;  ]&#10;}'
              value={jsonCode}
              onChange={(e) => {
                setJsonCode(e.target.value);
                validateJSON(e.target.value);
              }}
              className="w-full px-4 py-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-2xl placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all border border-slate-800 shadow-inner"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setActiveTab("list"); }}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!jsonError || !jsonCode.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-colors disabled:opacity-50"
            >
              Compile & Publish Quiz
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
