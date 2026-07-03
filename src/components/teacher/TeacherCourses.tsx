import React, { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, BookOpen, AlertCircle, Upload, Eye, Check, X } from "lucide-react";
import { Course } from "../../types";

export const TeacherCourses: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

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

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePoints, setPricePoints] = useState(0);
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = () => {
    setLoading(true);
    fetch("/api/courses", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch courses");
        return res.json();
      })
      .then(data => {
        setCourses(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setCurrentCourseId(null);
    setTitle("");
    setDescription("");
    setPricePoints(0);
    setCoverImageUrl("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setIsEditMode(true);
    setCurrentCourseId(course.id);
    setTitle(course.title);
    setDescription(course.description);
    setPricePoints(course.price_points);
    setCoverImageUrl(course.cover_image_url);
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("cover", file);

    setUploadingImage(true);
    try {
      const res = await fetch("/api/courses/upload-cover", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      if (!res.ok) throw new Error("Failed to upload cover image");
      const data = await res.json();
      setCoverImageUrl(data.url);
      showToast("Cover image uploaded successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to upload image", "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      showToast("Title and description are required", "error");
      return;
    }

    const payload = {
      title,
      description,
      price_points: Number(pricePoints) || 0,
      cover_image_url: coverImageUrl
    };

    try {
      const url = isEditMode ? `/api/courses/${currentCourseId}` : "/api/courses";
      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to save course details");

      showToast(isEditMode ? "Course updated successfully!" : "Course created successfully!", "success");
      setIsModalOpen(false);
      fetchCourses();
    } catch (err: any) {
      showToast(err.message || "An error occurred while saving.", "error");
    }
  };

  const handleDeleteCourse = (id: string) => {
    setConfirmModal({
      message: "Are you sure you want to delete this course and all its lessons? This action is irreversible.",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/courses/${id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`
            }
          });

          if (!res.ok) throw new Error("Failed to delete course");
          showToast("Course deleted successfully!", "success");
          fetchCourses();
        } catch (err: any) {
          showToast(err.message || "Failed to delete course", "error");
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Manage Courses</h1>
          <p className="text-slate-500 text-sm mt-1">Add, modify, or delete your educational courses and curriculum.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer"
        >
          <Plus size={18} />
          Create Course
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
          <Search size={18} />
        </span>
        <input
          type="text"
          placeholder="Search courses..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
        />
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
          <BookOpen className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="font-display font-bold text-slate-700 text-lg">No Courses Found</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
            {searchQuery ? "No courses match your search criteria. Try a different keyword." : "Get started by creating your very first course."}
          </p>
          {!searchQuery && (
            <button
              onClick={handleOpenCreateModal}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 font-semibold rounded-xl transition-all cursor-pointer"
            >
              <Plus size={16} /> Create One Now
            </button>
          )}
        </div>
      ) : (
        /* Courses Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group"
            >
              {/* Course Card Top */}
              <div>
                <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <BookOpen size={40} />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                    {course.price_points} Points
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-display font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-slate-500 text-sm mt-2 line-clamp-2 h-10">
                    {course.description}
                  </p>
                </div>
              </div>

              {/* Course Card Footer Actions */}
              <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                <button
                  onClick={() => window.location.hash = `#/teacher/courses/${course.id}`}
                  className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider cursor-pointer"
                >
                  <Eye size={15} /> Curriculum
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(course)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-100"
                    title="Edit Course"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border border-transparent hover:border-rose-100"
                    title="Delete Course"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-slate-900">
                {isEditMode ? "Edit Course Settings" : "Create New Course"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="p-6 space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Physics Secondary Grade 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain what students will learn in this course..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Price (Points)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={pricePoints}
                    onChange={(e) => setPricePoints(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Cover Image URL (or upload)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://..."
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                    />
                    <label className="flex items-center justify-center p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl border border-indigo-100 cursor-pointer transition-colors shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Upload size={18} />
                    </label>
                  </div>
                </div>
              </div>

              {coverImageUrl && (
                <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                  <img src={coverImageUrl} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>
              )}

              {uploadingImage && (
                <div className="flex items-center gap-2 text-indigo-600 text-xs font-semibold">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  Uploading cover image, please wait...
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isEditMode ? "Save Changes" : "Create Course"}
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
