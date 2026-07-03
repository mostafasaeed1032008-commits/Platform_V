import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG } from "../../theme.config";
import { BookOpen, PlayCircle, HelpCircle, ArrowRight, Award } from "lucide-react";
import { motion } from "motion/react";

interface StudentMyCoursesProps {
  onSelectCourse: (courseId: string) => void;
}

export const StudentMyCourses: React.FC<StudentMyCoursesProps> = ({ onSelectCourse }) => {
  const { token } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/courses/my-courses", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch my courses");
        return res.json();
      })
      .then((data) => setCourses(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Loading your curriculum...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">My Registered Courses</h1>
        <p className="text-xs text-slate-500">Track and resume your learning path. Complete all lectures to earn your score.</p>
      </div>

      {/* Course Cards list */}
      {courses.length === 0 ? (
        <div className={`${THEME_CONFIG.classes.card} p-12 text-center space-y-4`}>
          <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-slate-700 text-sm">No Active Enrollments</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You haven't registered or purchased any courses yet. Browse our catalog to unlock educational content!
            </p>
            <div className="pt-2">
              <a
                href="#/student/courses"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
              >
                Browse available courses <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((course) => {
            const lessonsCount = course.lessons_count || 0;
            const completedCount = course.completed_lessons_count || 0;
            const percentage = lessonsCount === 0 ? 0 : Math.min(100, Math.round((completedCount / lessonsCount) * 100));

            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                onClick={() => onSelectCourse(course.id)}
                className={`${THEME_CONFIG.classes.card} flex flex-col sm:flex-row h-full cursor-pointer group`}
              >
                {/* Left/Top cover image */}
                <div className="relative w-full sm:w-48 aspect-video sm:aspect-auto sm:h-full bg-slate-100 overflow-hidden shrink-0">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 py-12">
                      <BookOpen size={36} className="stroke-1" />
                    </div>
                  )}

                  {percentage === 100 && (
                    <div className="absolute top-3 left-3 bg-indigo-600 text-white rounded-full p-1 shadow-sm">
                      <Award size={14} className="stroke-[2.5]" />
                    </div>
                  )}
                </div>

                {/* Right text section */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-display font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {course.description}
                    </p>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>PROGRESS</span>
                      <span className="text-indigo-600">{percentage}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Completed {completedCount} of {course.lessons_count || 0} lessons
                    </div>
                  </div>

                  {/* Bottom details and continue button */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-3 text-slate-400 text-[10px] font-bold">
                      <span className="flex items-center gap-1">
                        <PlayCircle size={12} /> {course.lessons_count || 0} Lessons
                      </span>
                      <span className="flex items-center gap-1">
                        <HelpCircle size={12} /> {course.quizzes_count || 0} Quizzes
                      </span>
                    </div>

                    <button className="inline-flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 group-hover:translate-x-1 transition-all">
                      Continue <ArrowRight size={12} className="stroke-[3]" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
