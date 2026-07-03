import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG } from "../../theme.config";
import { Search, BookOpen, Clock, PlayCircle, Lock, Unlock, HelpCircle, ArrowUpDown } from "lucide-react";
import { motion } from "motion/react";

interface StudentCoursesProps {
  onSelectCourse: (courseId: string) => void;
}

export const StudentCourses: React.FC<StudentCoursesProps> = ({ onSelectCourse }) => {
  const { token } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<"title" | "price_asc" | "price_desc" | "newest">("newest");
  const [filterType, setFilterType] = useState<"all" | "owned" | "locked">("all");

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const fetchCourses = () => {
    setLoading(true);
    fetch("/api/courses", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch courses");
        return res.json();
      })
      .then((data) => setCourses(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  // Filter and sort courses
  const filteredCourses = courses
    .filter((course) => {
      const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) || 
                            course.description.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filterType === "all" ||
                            (filterType === "owned" && course.enrolled) ||
                            (filterType === "locked" && !course.enrolled);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "price_asc") return a.price_points - b.price_points;
      if (sortBy === "price_desc") return b.price_points - a.price_points;
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading available courses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">Browse Curriculum</h1>
        <p className="text-xs text-slate-500">Explore educational courses, unlock new skills, and track your progress.</p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex gap-2 shrink-0">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">All Courses</option>
            <option value="owned">Enrolled & Owned</option>
            <option value="locked">Locked</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="newest">Sort: Newest</option>
            <option value="title">Sort: Title</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
            <option value="price_desc">Sort: Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <div className={`${THEME_CONFIG.classes.card} p-12 text-center space-y-4`}>
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-slate-700 text-sm">No Courses Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">We couldn't find any courses matching your search criteria. Try a different query or filter.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              onClick={() => onSelectCourse(course.id)}
              className={`${THEME_CONFIG.classes.card} flex flex-col h-full cursor-pointer group`}
            >
              {/* Cover Image */}
              <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                {course.cover_image_url ? (
                  <img
                    src={course.cover_image_url}
                    alt={course.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <BookOpen size={40} className="stroke-1" />
                  </div>
                )}

                {/* Badge Overlay */}
                <div className="absolute top-3 right-3 z-10">
                  {course.enrolled ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/90 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                      <Unlock size={10} className="stroke-[3]" /> Owned
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-500/90 text-white font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                      <Lock size={10} className="stroke-[3]" /> Locked
                    </span>
                  )}
                </div>
              </div>

              {/* Course Details */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {course.description}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-slate-400 text-[11px] font-semibold border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <PlayCircle size={14} className="text-slate-400" />
                    <span>{course.lessons_count || 0} Lessons</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HelpCircle size={14} className="text-slate-400" />
                    <span>{course.quizzes_count || 0} Quizzes</span>
                  </div>
                </div>

                {/* Bottom Bar: Action & Price */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="text-xs font-bold text-slate-400">Price</div>
                  <div className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    {course.price_points === 0 ? "Free" : `${course.price_points} Points`}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
