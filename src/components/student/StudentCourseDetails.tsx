import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG, getPlatformSettings, getBrandName } from "../../theme.config";
import { 
  ArrowLeft, 
  Lock, 
  Unlock, 
  PlayCircle, 
  FileText, 
  HelpCircle, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Tv, 
  Settings2,
  Bookmark,
  Award
} from "lucide-react";
import { motion } from "motion/react";

interface StudentCourseDetailsProps {
  courseId: string;
  onBack: () => void;
  onRefreshBalance: () => void;
}

export const StudentCourseDetails: React.FC<StudentCourseDetailsProps> = ({ 
  courseId, 
  onBack,
  onRefreshBalance
}) => {
  const { token, user } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [purchasing, setPurchasing] = useState<boolean>(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState<boolean>(false);
  const [studentBalance, setStudentBalance] = useState<number>(0);

  // Active lesson tracking
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [certificate, setCertificate] = useState<any>(null);
  const [showCertificateModal, setShowCertificateModal] = useState<boolean>(false);

  useEffect(() => {
    fetchCourseDetails();
    fetchStudentBalance();
    loadCompletedLessons();
    fetchCertificate();
  }, [courseId, token]);

  const fetchStudentBalance = () => {
    fetch("/api/wallet/balance", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setStudentBalance(data.current_balance || 0);
      })
      .catch(err => console.error(err));
  };

  const loadCompletedLessons = () => {
    fetch(`/api/lessons/course/${courseId}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.completed_lesson_ids) {
          setCompletedLessons(data.completed_lesson_ids);
        }
      })
      .catch(err => console.error("Failed to load completed lessons", err));
  };

  const fetchCertificate = () => {
    fetch(`/api/lessons/course/${courseId}/certificate`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.id) {
          setCertificate(data);
        } else {
          setCertificate(null);
        }
      })
      .catch(err => console.error("Failed to load certificate", err));
  };

  const fetchCourseDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Course details (includes enrolled boolean status)
      const courseRes = await fetch(`/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!courseRes.ok) throw new Error("Failed to load course details");
      const courseData = await courseRes.json();
      setCourse(courseData);

      // 2. Fetch Lessons for course (redacted or fully detailed depending on enrollment)
      const lessonsRes = await fetch(`/api/lessons/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData);
        if (courseData.enrolled && lessonsData.length > 0) {
          setActiveLesson(lessonsData[0]);
        }
      }

      // 3. Fetch Quizzes associated with this course
      const quizzesRes = await fetch(`/api/quizzes/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Handle purchasing course
  const handlePurchase = async () => {
    setPurchasing(true);
    setPurchaseError(null);
    try {
      const res = await fetch(`/api/courses/${courseId}/purchase`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Purchase failed");
      }

      // Success
      setShowPurchaseModal(false);
      onRefreshBalance();
      await fetchCourseDetails();
      fetchStudentBalance();
    } catch (err: any) {
      setPurchaseError(err.message || "An error occurred during purchase.");
    } finally {
      setPurchasing(false);
    }
  };

  // Handle Video Resume Position & TimeUpdates
  useEffect(() => {
    if (activeLesson && videoRef.current) {
      // Set initial speed
      videoRef.current.playbackRate = playbackSpeed;

      // Resume position check
      const lastPos = localStorage.getItem(`lesson_pos_${activeLesson.id}`);
      if (lastPos) {
        const seconds = parseFloat(lastPos);
        if (seconds > 3) {
          videoRef.current.currentTime = seconds;
        }
      }
    }
  }, [activeLesson]);

  const handleTimeUpdate = () => {
    if (activeLesson && videoRef.current) {
      const current = videoRef.current.currentTime;
      localStorage.setItem(`lesson_pos_${activeLesson.id}`, current.toString());

      // Auto-complete lesson if they played 90%+ of it
      const duration = videoRef.current.duration;
      if (duration && current / duration > 0.9) {
        markLessonCompleted(activeLesson.id);
      }
    }
  };

  const markLessonCompleted = (lessonId: string) => {
    if (!completedLessons.includes(lessonId)) {
      toggleLessonCompletion(lessonId);
    }
  };

  const toggleLessonCompletion = async (lessonId: string) => {
    try {
      const res = await fetch(`/api/lessons/${lessonId}/toggle-progress`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        const data = await res.json();
        loadCompletedLessons();
        fetchCertificate();
      }
    } catch (e) {
      console.error("Failed to toggle lesson completion", e);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  // Render YouTube Embed vs Native player vs Vimeo vs Local
  const renderVideoPlayer = () => {
    if (!activeLesson) return null;

    const provider = activeLesson.video_provider;
    const urlOrId = activeLesson.video_id_or_url;

    if (provider === "youtube") {
      let embedId = urlOrId;
      try {
        if (urlOrId.includes("youtube.com/watch")) {
          embedId = new URL(urlOrId).searchParams.get("v") || urlOrId;
        } else if (urlOrId.includes("youtu.be/")) {
          embedId = urlOrId.split("/").pop() || urlOrId;
        }
      } catch (e) { /* ignore */ }

      return (
        <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-200">
          <iframe
            src={`https://www.youtube.com/embed/${embedId}`}
            title={activeLesson.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        </div>
      );
    }

    if (provider === "vimeo") {
      let embedId = urlOrId;
      try {
        if (urlOrId.includes("vimeo.com/")) {
          embedId = urlOrId.split("/").pop() || urlOrId;
        }
      } catch (e) { /* ignore */ }

      return (
        <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-lg border border-slate-200">
          <iframe
            src={`https://player.vimeo.com/video/${embedId}`}
            title={activeLesson.title}
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          ></iframe>
        </div>
      );
    }

    // Default or Local Stream
    const streamUrl = provider === "local" 
      ? `/api/lessons/video/stream/${activeLesson.id}?token=${token}`
      : urlOrId;

    return (
      <div className="space-y-3">
        <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-lg group border border-slate-200">
          <video
            ref={videoRef}
            src={streamUrl}
            controls
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-contain"
            playsInline
          />
        </div>

        {/* Speed controls */}
        <div className="flex items-center justify-between bg-white px-4 py-3 border border-slate-100 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px]">
            <Settings2 size={14} />
            <span>PLAYBACK SPEED</span>
          </div>
          <div className="flex gap-1">
            {[0.5, 1, 1.25, 1.5, 2].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                  playbackSpeed === speed 
                    ? "bg-indigo-600 text-white" 
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading curriculum modules...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-12 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800 text-sm">Course Not Found</h3>
        <button onClick={onBack} className={THEME_CONFIG.classes.secondaryButton}>
          Back to list
        </button>
      </div>
    );
  }

  const { enrolled } = course;

  return (
    <div className="space-y-6">
      {/* Back to courses */}
      <button 
        onClick={onBack} 
        className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} className="stroke-[2.5]" />
        <span>BACK TO CATALOG</span>
      </button>

      {/* Course Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row gap-6 shadow-xs relative overflow-hidden">
        {/* Cover image */}
        <div className="w-full md:w-56 aspect-video rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
          {course.cover_image_url ? (
            <img src={course.cover_image_url} alt={course.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <Tv size={48} className="stroke-1" />
            </div>
          )}
        </div>

        {/* Course Details Text */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
                Course Syllabus
              </span>
              {enrolled ? (
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  <Unlock size={10} className="stroke-[3]" /> Unlocked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-700 font-bold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                  <Lock size={10} className="stroke-[3]" /> Locked
                </span>
              )}
            </div>
            <h1 className="font-display font-bold text-xl sm:text-2xl text-slate-800 tracking-tight">{course.title}</h1>
            <p className="text-xs text-slate-500 leading-relaxed">{course.description}</p>
          </div>

          <div className="flex flex-wrap items-center justify-between border-t border-slate-50 pt-4 gap-4">
            <div className="flex items-center gap-4 text-slate-400 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><PlayCircle size={14} /> {lessons.length} Lectures</span>
              <span className="flex items-center gap-1.5"><HelpCircle size={14} /> {quizzes.length} Exercises</span>
            </div>

            {/* Pricing or locked actions */}
            {!enrolled && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block">UNLOCK SYLLABUS</span>
                  <span className="text-sm font-extrabold text-indigo-600">{course.price_points} Points</span>
                </div>
                <button 
                  onClick={() => setShowPurchaseModal(true)}
                  className={THEME_CONFIG.classes.primaryButton}
                >
                  Purchase Now
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Course Content Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Pane: Video player (if unlocked) or purchase prompt (if locked) */}
        <div className="lg:col-span-2 space-y-6">
          {enrolled ? (
            activeLesson ? (
              <div className="space-y-4">
                {renderVideoPlayer()}
                
                {/* Active Lesson details */}
                <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3">
                    <h2 className="font-display font-bold text-slate-800 text-base">{activeLesson.title}</h2>
                    <button
                      onClick={() => toggleLessonCompletion(activeLesson.id)}
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all ${
                        completedLessons.includes(activeLesson.id)
                          ? "bg-emerald-50 border border-emerald-100 text-emerald-700"
                          : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <CheckCircle size={12} className={completedLessons.includes(activeLesson.id) ? "fill-emerald-100" : ""} />
                      {completedLessons.includes(activeLesson.id) ? "Lesson Finished" : "Mark Finished"}
                    </button>
                  </div>

                  {activeLesson.notes && (
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Bookmark size={12} /> Notes & Resources
                      </h4>
                      <p className="text-xs text-slate-600 bg-slate-50/50 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-line">
                        {activeLesson.notes}
                      </p>
                    </div>
                  )}

                  {/* Attached Downloadable Files */}
                  {activeLesson.attached_files && activeLesson.attached_files.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <FileText size={12} /> Lecture Attachments
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeLesson.attached_files.map((file: any, index: number) => (
                          <a
                            key={index}
                            href={file.url}
                            download={file.name}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-slate-50/50 text-slate-700 transition-all text-xs font-semibold"
                          >
                            <span className="truncate pr-4">{file.name}</span>
                            <Download size={14} className="text-indigo-600 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`${THEME_CONFIG.classes.card} p-12 text-center text-slate-400`}>
                <PlayCircle className="w-12 h-12 stroke-1 mx-auto" />
                <p className="text-xs font-medium mt-3">This course has no active lessons added yet.</p>
              </div>
            )
          ) : (
            // Gated Blur Preview
            <div className="relative rounded-2xl overflow-hidden border border-slate-200">
              {/* Blur effect cover */}
              <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-900/35 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-white/10 text-white flex items-center justify-center shadow-lg border border-white/20">
                  <Lock size={28} className="stroke-[2.5]" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="font-display font-extrabold text-white text-base">Locked Syllabus Preview</h3>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    This content is restricted to enrolled students. Purchase the course to instantly unlock high-definition lessons, downloadable sheets, and exercises.
                  </p>
                </div>
                <button
                  onClick={() => setShowPurchaseModal(true)}
                  className="px-6 py-3 bg-white text-indigo-700 font-extrabold rounded-xl shadow-md hover:shadow-lg hover:scale-103 transition-all text-xs cursor-pointer tracking-wider uppercase"
                >
                  Unlock Curriculum
                </button>
              </div>

              {/* Blurred Mock Background */}
              <div className="p-8 space-y-6 select-none filter blur-xs pointer-events-none bg-white opacity-50">
                <div className="w-full aspect-video bg-slate-100 rounded-xl"></div>
                <div className="h-4 bg-slate-200 rounded-full w-1/3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-slate-100 rounded-full w-full"></div>
                  <div className="h-3 bg-slate-100 rounded-full w-5/6"></div>
                  <div className="h-3 bg-slate-100 rounded-full w-4/5"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Course curriculum menu */}
        <div className="space-y-6">
          {certificate && (
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-2xl p-5 shadow-sm space-y-4 border border-indigo-500">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    <Award size={10} /> Certified
                  </span>
                  <h4 className="font-display font-extrabold text-sm">Course Accomplished!</h4>
                  <p className="text-[11px] text-indigo-100">You completed all lessons in this course successfully.</p>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-lg">
                  🎓
                </div>
              </div>
              <div className="border-t border-indigo-500/50 pt-3 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-[9px] text-indigo-200 font-bold uppercase tracking-wider">Verification Code</div>
                  <div className="text-[10px] font-mono font-bold tracking-wider">{certificate.certificate_code}</div>
                </div>
                <button
                  onClick={() => setShowCertificateModal(true)}
                  className="px-3 py-1.5 bg-white text-indigo-700 hover:bg-slate-50 font-extrabold rounded-xl transition-all text-[11px] cursor-pointer shrink-0"
                >
                  View Certificate
                </button>
              </div>
            </div>
          )}

          {/* Lessons List Navigation */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-widest">
                Course Curriculum
              </h3>
              <p className="text-[10px] text-slate-400">LECTURES & VIDEOS</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
              {lessons.map((lesson, idx) => {
                const isActive = activeLesson?.id === lesson.id;
                const isFinished = completedLessons.includes(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    disabled={!enrolled}
                    onClick={() => setActiveLesson(lesson)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-all ${
                      !enrolled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                    } ${isActive ? "bg-indigo-50/70 border-l-4 border-indigo-600" : "hover:bg-slate-50"}`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isFinished ? (
                        <CheckCircle size={16} className="text-emerald-500 fill-emerald-50" />
                      ) : !enrolled ? (
                        <Lock size={14} className="text-slate-400" />
                      ) : (
                        <PlayCircle size={16} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400 font-bold">LECTURE {idx + 1}</div>
                      <h4 className={`text-xs font-bold truncate ${isActive ? "text-indigo-700" : "text-slate-700"}`}>
                        {lesson.title}
                      </h4>
                    </div>
                  </button>
                );
              })}
              {lessons.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">No lessons registered for this course yet.</div>
              )}
            </div>
          </div>

          {/* Quizzes and Exams List */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-widest">
                Exams & Homework
              </h3>
              <p className="text-[10px] text-slate-400">DYNAMIC QUIZZES</p>
            </div>
            <div className="divide-y divide-slate-100">
              {quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-4 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 pr-4">
                    <HelpCircle size={16} className="text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-700 truncate">{quiz.title}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">{quiz.duration_minutes} mins</span>
                    </div>
                  </div>

                  {enrolled ? (
                    <a
                      href={`#/student/quiz/${quiz.id}`}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg cursor-pointer transition-all shrink-0 text-[10px] uppercase tracking-wide"
                    >
                      Take Quiz
                    </a>
                  ) : (
                    <Lock size={12} className="text-slate-400 shrink-0 mr-2" />
                  )}
                </div>
              ))}
              {quizzes.length === 0 && (
                <div className="p-6 text-center text-xs text-slate-400">No quizzes associated with this course yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION PURCHASE MODAL */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl relative space-y-6"
          >
            <div className="space-y-1">
              <h3 className="font-display font-bold text-slate-800 text-lg">Confirm Enrollment Purchase</h3>
              <p className="text-xs text-slate-500">You are about to unlock full curriculum access for {course.title}.</p>
            </div>

            {/* Price Ledger / Balance */}
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl bg-slate-50/50 p-4 space-y-3 text-xs text-slate-600">
              <div className="flex justify-between pb-2.5">
                <span>Your Current Balance</span>
                <span className="font-bold text-slate-800">{studentBalance.toLocaleString()} Points</span>
              </div>
              <div className="flex justify-between py-2.5 text-rose-600">
                <span>Course Price (Points Deduction)</span>
                <span className="font-extrabold">-{course.price_points.toLocaleString()} Points</span>
              </div>
              <div className="flex justify-between pt-2.5 text-emerald-600 font-bold">
                <span>Remaining Balance After Purchase</span>
                <span className="font-extrabold">{(studentBalance - course.price_points).toLocaleString()} Points</span>
              </div>
            </div>

            {purchaseError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-2 leading-relaxed">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{purchaseError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowPurchaseModal(false)}
                disabled={purchasing}
                className={THEME_CONFIG.classes.secondaryButton}
              >
                Cancel
              </button>

              {studentBalance >= course.price_points ? (
                <button
                  onClick={handlePurchase}
                  disabled={purchasing}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-xs sm:text-sm uppercase tracking-wider"
                >
                  {purchasing ? "Enrolling..." : "Confirm & Unlock"}
                </button>
              ) : (
                <a
                  href="#/student/wallet"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-center transition-all text-xs sm:text-sm uppercase tracking-wider block"
                >
                  Top Up Wallet
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* CERTIFICATE DETAIL MODAL */}
      {showCertificateModal && certificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-certificate, #printable-certificate * {
                visibility: visible !important;
              }
              #printable-certificate {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background: white !important;
                color: black !important;
                z-index: 9999999 !important;
                border: none !important;
                display: flex !important;
                flex-direction: column !important;
                justify-content: center !important;
                align-items: center !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative space-y-6 border border-slate-100 no-print"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Award className="text-indigo-600 w-5 h-5" />
                <h3 className="font-display font-extrabold text-slate-800 text-sm uppercase tracking-wider">Your Verified Certificate</h3>
              </div>
              <button
                onClick={() => setShowCertificateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {/* Display / Certificate Render */}
            <div 
              id="printable-certificate"
              className="bg-radial from-amber-50/20 to-white border-12 border-amber-600/40 rounded-2xl p-8 sm:p-12 relative text-center shadow-inner overflow-hidden select-none flex flex-col justify-between"
              style={{ minHeight: "420px" }}
            >
              {/* Decorative Corner Ornaments */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-amber-600/30"></div>
              <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-amber-600/30"></div>
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-amber-600/30"></div>
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-amber-600/30"></div>

              {/* Certificate content */}
              <div className="space-y-6 my-auto">
                {/* Platform Logo Symbol */}
                <div className="text-3xl filter saturate-105 mb-2">{getPlatformSettings().logoSymbol}</div>

                <div className="space-y-1">
                  <h2 className="font-serif font-extrabold text-amber-700 tracking-widest text-lg uppercase">Certificate of Completion</h2>
                  <p className="text-[10px] text-slate-400 font-sans tracking-widest uppercase font-bold">This credential verifies that</p>
                </div>

                <div className="border-b-2 border-slate-200/80 max-w-md mx-auto py-1">
                  <h1 className="font-display font-extrabold text-slate-800 text-xl sm:text-2xl tracking-wide">{user?.name}</h1>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                    has successfully finished and passed all required lectures, curriculum topics, and assessments of the professional syllabus course:
                  </p>
                  <h3 className="font-display font-black text-indigo-700 text-base sm:text-lg tracking-tight max-w-lg mx-auto leading-snug">
                    {course?.title}
                  </h3>
                </div>
              </div>

              {/* Certificate footer details */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6 mt-6 text-left font-sans">
                <div className="space-y-0.5">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Issuer Platform</span>
                  <span className="block text-[10px] font-extrabold text-slate-700">{getBrandName()}</span>
                  <span className="block text-[8px] text-slate-400 font-medium">Authorized Academic Registry</span>
                </div>

                <div className="space-y-0.5 text-right">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Verification & Date</span>
                  <span className="block text-[10px] font-mono font-bold text-indigo-600 tracking-wider uppercase">{certificate.certificate_code}</span>
                  <span className="block text-[8px] text-slate-400 font-medium">Issued on: {new Date(certificate.issued_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Print and Close controls */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowCertificateModal(false)}
                className={THEME_CONFIG.classes.secondaryButton}
              >
                Close View
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs uppercase tracking-wider"
              >
                <Award size={14} /> Print Certificate / Save PDF
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
