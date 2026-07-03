import React, { useEffect, useState } from "react";
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Edit2, Trash2, Video, FileText, MoveUp, MoveDown, Upload, Link, AlertCircle, HelpCircle, Check, X } from "lucide-react";
import { Course, Lesson, AttachedFile, Quiz } from "../../types";

interface TeacherCourseDetailsProps {
  courseId: string;
  onBack: () => void;
}

export const TeacherCourseDetails: React.FC<TeacherCourseDetailsProps> = ({ courseId, onBack }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

  // Form states for Lesson
  const [title, setTitle] = useState("");
  const [videoProvider, setVideoProvider] = useState<"vdocipher" | "url" | "local">("url");
  const [videoIdOrUrl, setVideoIdOrUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);

  // Sub-upload states
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Iframe-safe notification and confirmation states
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 4000);
  };

  useEffect(() => {
    fetchCourseAndCurriculum();
  }, [courseId]);

  const fetchCourseAndCurriculum = async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

      // Fetch Course Info
      const courseRes = await fetch(`/api/courses/${courseId}`, { headers });
      if (!courseRes.ok) throw new Error("Failed to fetch course data");
      const courseData = await courseRes.json();
      setCourse(courseData);

      // Fetch Lessons List
      const lessonsRes = await fetch(`/api/lessons/course/${courseId}`, { headers });
      if (!lessonsRes.ok) throw new Error("Failed to fetch course lessons");
      const lessonsData = await lessonsRes.json();
      setLessons(lessonsData);

      // Fetch Course Quizzes
      const quizzesRes = await fetch(`/api/quizzes/course/${courseId}`, { headers });
      if (quizzesRes.ok) {
        const quizzesData = await quizzesRes.json();
        setQuizzes(quizzesData);
      }

      setLoading(false);
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setCurrentLessonId(null);
    setTitle("");
    setVideoProvider("url");
    setVideoIdOrUrl("");
    setNotes("");
    setAttachedFiles([]);
    setIsLessonModalOpen(true);
  };

  const handleOpenEditModal = (lesson: Lesson) => {
    setIsEditMode(true);
    setCurrentLessonId(lesson.id);
    setTitle(lesson.title);
    setVideoProvider((lesson.video_provider as any) || "url");
    setVideoIdOrUrl(lesson.video_id_or_url);
    setNotes(lesson.notes || "");
    setAttachedFiles(lesson.attached_files || []);
    setIsLessonModalOpen(true);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("video", file);

    setUploadingVideo(true);
    try {
      const res = await fetch("/api/lessons/upload-video", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload video file");
      }

      const metadata = await res.json();
      setVideoProvider("local");
      // For local videos, we save the JSON metadata string containing original filename and safe path
      setVideoIdOrUrl(JSON.stringify(metadata));
      showToast("Video file uploaded successfully and secured! It is now protected by range requests streaming.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload video", "error");
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setUploadingFile(true);
    try {
      const res = await fetch("/api/lessons/upload-file", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Failed to upload attached file");
      const attachment = await res.json();
      setAttachedFiles(prev => [...prev, attachment]);
      showToast("Attachment file uploaded successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload attachment", "error");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleRemoveAttachment = (idxToRemove: number) => {
    setAttachedFiles(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleSaveLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      showToast("Lesson title is required", "error");
      return;
    }

    const payload = {
      title,
      video_provider: videoProvider,
      video_id_or_url: videoIdOrUrl,
      notes,
      attached_files: attachedFiles,
      order_index: lessons.length
    };

    try {
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      };

      const url = isEditMode ? `/api/lessons/${currentLessonId}` : `/api/lessons/course/${courseId}`;
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save lesson settings");

      showToast(isEditMode ? "Lesson updated successfully!" : "Lesson created successfully!", "success");
      setIsLessonModalOpen(false);
      fetchCourseAndCurriculum();
    } catch (err: any) {
      showToast(err.message || "An error occurred while saving the lesson.", "error");
    }
  };

  const handleDeleteLesson = (id: string) => {
    setConfirmModal({
      message: "Are you sure you want to delete this lesson? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/lessons/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          });

          if (!res.ok) throw new Error("Failed to delete lesson");
          showToast("Lesson deleted successfully!", "success");
          fetchCourseAndCurriculum();
        } catch (err: any) {
          showToast(err.message || "Failed to delete lesson", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const handleReorder = async (currentIndex: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const updatedLessons = [...lessons];
    // Swap order_index
    const temp = updatedLessons[currentIndex];
    updatedLessons[currentIndex] = updatedLessons[targetIndex];
    updatedLessons[targetIndex] = temp;

    // Build payload array
    const reorderedPayload = updatedLessons.map((l, idx) => ({
      id: l.id,
      order_index: idx
    }));

    try {
      const res = await fetch("/api/lessons/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ lessons: reorderedPayload })
      });

      if (!res.ok) throw new Error("Failed to save reordered lessons");
      // Instant local state swap for high responsiveness
      setLessons(updatedLessons);
      showToast("Lessons reordered successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to reorder lessons", "error");
    }
  };

  const parseLocalVideoName = (metadataStr: string): string => {
    try {
      const meta = JSON.parse(metadataStr);
      return meta.original_filename || "Secured Video File";
    } catch (e) {
      return metadataStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold text-sm">
          <ArrowLeft size={16} /> Back to Courses
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Back Button and Course Info Header */}
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-wider cursor-pointer transition-colors">
          <ArrowLeft size={16} /> Back to Courses
        </button>

        {course && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
            {course.cover_image_url && (
              <img
                src={course.cover_image_url}
                alt={course.title}
                referrerPolicy="no-referrer"
                className="w-full md:w-48 aspect-video rounded-xl object-cover border border-slate-100 shrink-0"
              />
            )}
            <div className="space-y-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
                {course.price_points} Points
              </span>
              <h1 className="text-2xl font-display font-bold text-slate-900">{course.title}</h1>
              <p className="text-slate-500 text-sm max-w-2xl">{course.description}</p>
            </div>
          </div>
        )}
      </div>

      {/* Curriculum Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lessons List - 2 columns on large screen */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-slate-800 text-lg">Curriculum Chapters ({lessons.length})</h3>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
            >
              <Plus size={15} /> Add Lesson
            </button>
          </div>

          <div className="space-y-3">
            {lessons.length === 0 ? (
              <div className="text-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-400 text-sm">
                No chapters or lessons created yet. Click "Add Lesson" to start designing this course.
              </div>
            ) : (
              lessons.map((lesson, idx) => (
                <div key={lesson.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group">
                  <div className="flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{lesson.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Video size={12} className="text-slate-400" />
                        {lesson.video_provider === "local" ? "Secured Video File" : `${lesson.video_provider.toUpperCase()} stream`}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Sorting */}
                  <div className="flex items-center gap-3 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                    {/* Sort buttons */}
                    <div className="flex items-center gap-1 border-r border-slate-100 pr-3 mr-1">
                      <button
                        onClick={() => handleReorder(idx, "up")}
                        disabled={idx === 0}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg disabled:opacity-30 cursor-pointer transition-colors hover:bg-slate-50"
                        title="Move Up"
                      >
                        <MoveUp size={14} />
                      </button>
                      <button
                        onClick={() => handleReorder(idx, "down")}
                        disabled={idx === lessons.length - 1}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg disabled:opacity-30 cursor-pointer transition-colors hover:bg-slate-50"
                        title="Move Down"
                      >
                        <MoveDown size={14} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(lesson)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 border border-transparent hover:border-slate-100 rounded-xl transition-all cursor-pointer"
                        title="Edit Lesson"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLesson(lesson.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all cursor-pointer"
                        title="Delete Lesson"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quizzes list - 1 column on large screen */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-lg">Quizzes Belonging to Course</h3>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            {quizzes.length === 0 ? (
              <div className="text-slate-400 text-xs py-4 text-center">
                No active quizzes tied to this course. Go to the Quizzes page to create a manual or Gemini AI quiz.
              </div>
            ) : (
              quizzes.map(quiz => (
                <div key={quiz.id} className="p-3 bg-indigo-50/50 border border-indigo-100/30 rounded-xl flex items-center justify-between">
                  <div>
                    <h5 className="font-semibold text-slate-800 text-xs">{quiz.title}</h5>
                    <p className="text-[10px] text-indigo-600 mt-1 font-medium">{quiz.questions.length} Questions • {quiz.duration_minutes}m</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Lesson Edit/Create Modal */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-slide-up">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-slate-900">
                {isEditMode ? "Modify Chapter/Lesson" : "Add Lesson Chapter"}
              </h3>
              <button
                onClick={() => setIsLessonModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveLesson} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Lesson Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 1: Introduction to Mechanics"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Lesson Notes & Summary (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Write lesson notes or markdown reference text..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Video Provider
                  </label>
                  <select
                    value={videoProvider}
                    onChange={(e) => {
                      setVideoProvider(e.target.value as any);
                      setVideoIdOrUrl("");
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  >
                    <option value="url">External Link (YouTube / Vimeo)</option>
                    <option value="vdocipher">VDocipher ID</option>
                    <option value="local">Upload Secured Video File (MP4/WebM)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    Video ID / Link
                    {videoProvider === "local" && <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-sm">Protected</span>}
                  </label>

                  {videoProvider === "local" ? (
                    <div className="flex gap-2">
                      <div className="w-full text-xs text-slate-500 border border-slate-200 px-4 py-2.5 rounded-xl bg-slate-50 flex items-center justify-between overflow-hidden">
                        <span className="truncate">{videoIdOrUrl ? parseLocalVideoName(videoIdOrUrl) : "No Video Uploaded"}</span>
                      </div>
                      <label className="flex items-center justify-center p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-100 cursor-pointer transition-colors shrink-0">
                        <input
                          type="file"
                          accept="video/mp4,video/webm,video/quicktime"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                        <Upload size={18} />
                      </label>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder={videoProvider === "vdocipher" ? "vdocipher video id key" : "https://youtube.com/watch?v=..."}
                      value={videoIdOrUrl}
                      onChange={(e) => setVideoIdOrUrl(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    />
                  )}
                </div>
              </div>

              {uploadingVideo && (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  Uploading & encrypting video. Large files may take a minute...
                </div>
              )}

              {/* Downloadable files section */}
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Downloadable Student Handouts ({attachedFiles.length})
                  </label>
                  <label className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Plus size={14} /> Upload PDF/File
                  </label>
                </div>

                {uploadingFile && (
                  <div className="flex items-center gap-2 text-indigo-600 text-xs">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-600"></div>
                    Uploading document...
                  </div>
                )}

                <div className="space-y-2">
                  {attachedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700 truncate max-w-[80%]">
                        <FileText size={14} className="text-slate-400" />
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingVideo || uploadingFile}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isEditMode ? "Save Changes" : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Iframe-Safe Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden p-6 space-y-6 animate-scale-in">
            <div className="space-y-2">
              <h3 className="text-lg font-display font-bold text-slate-900">Confirm Action</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-sm cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Iframe-Safe Toast Alerts */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] max-w-sm w-full bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 flex items-start gap-3 animate-slide-up">
          <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === "success" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
            {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          </div>
          <div className="flex-1 text-xs font-semibold text-slate-800 leading-relaxed mt-0.5">
            {toast.message}
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 text-xs shrink-0 font-bold">
            Close
          </button>
        </div>
      )}
    </div>
  );
};
