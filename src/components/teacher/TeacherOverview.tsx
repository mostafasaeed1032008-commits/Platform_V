import React, { useEffect, useState } from "react";
import { Users, BookOpen, Wallet, GraduationCap, CheckCircle, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

interface OverviewStats {
  total_students: number;
  total_courses: number;
  total_lessons: number;
  total_quizzes: number;
  approved_topups_count: number;
  total_revenue: number;
  most_enrolled_courses: Array<{ id: string; title: string; price_points: number; enroll_count: number }>;
  course_engagement: Array<{ id: string; title: string; enroll_count: number; completed_lessons: number; quiz_attempts: number; engagement_score: number }>;
  engagement_trend: Array<{ name: string; enrollments: number; lesson_completions: number; quiz_attempts: number }>;
}

export const TeacherOverview: React.FC = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics/summary", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch analytics summary");
        return res.json();
      })
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading overview metrics: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Teacher Overview</h1>
        <p className="text-slate-500 text-sm mt-1">Here is a quick snapshot of your teaching platform activities.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Total Students</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.total_students}</h3>
            <p className="text-xs text-slate-400 mt-1">Registered accounts</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Total Courses</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl">
              <BookOpen size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.total_courses}</h3>
            <p className="text-xs text-slate-400 mt-1">Published courses</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Approved Topups</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.approved_topups_count}</h3>
            <p className="text-xs text-slate-400 mt-1">Successful transactions</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Total Revenue</span>
            <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
              <Wallet size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-slate-900">{stats?.total_revenue} <span className="text-xs font-normal text-slate-400">pts</span></h3>
            <p className="text-xs text-slate-400 mt-1">Vodafone Cash conversions</p>
          </div>
        </div>
      </div>

      {/* Visual Learning Engagement Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-lg flex items-center gap-2">
              <TrendingUp className="text-indigo-600" size={20} />
              Platform Engagement Trends
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Tracking student enrollment actions, lesson completions, and quiz submissions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-600 rounded-xs"></span> Enrollments</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-sky-500 rounded-xs"></span> Lesson Completions</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-xs"></span> Quiz Attempts</span>
          </div>
        </div>

        <div className="h-80 w-full" id="engagement-trend-container">
          {stats?.engagement_trend && stats.engagement_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.engagement_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: "#94a3b8", fontSize: 11 }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: "#94a3b8", fontSize: 11 }} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "12px" }}
                />
                <Area type="monotone" dataKey="enrollments" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEnrollments)" name="Enrollments" />
                <Area type="monotone" dataKey="lesson_completions" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorLessons)" name="Lesson Completions" />
                <Area type="monotone" dataKey="quiz_attempts" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQuizzes)" name="Quiz Attempts" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400 text-sm">No trend data available yet</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Most Enrolled Courses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-slate-900 text-lg">Top Enrolled Courses</h3>
            <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold flex items-center gap-1">
              <TrendingUp size={12} /> Live Stats
            </span>
          </div>

          <div className="space-y-4">
            {stats?.most_enrolled_courses.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No course enrollments tracked yet.</div>
            ) : (
              stats?.most_enrolled_courses.map((course, idx) => (
                <div key={course.id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-sm">
                      #{idx + 1}
                    </span>
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{course.title}</h4>
                      <p className="text-xs text-slate-400">{course.price_points} Points per purchase</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-indigo-600">{course.enroll_count} Students</span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider">Enrollment Count</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Platform Content Stats */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-900 text-lg mb-6">Course Material Size</h3>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
                <BookOpen size={20} />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Lessons</span>
                <h4 className="text-xl font-bold text-slate-800">{stats?.total_lessons}</h4>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                <GraduationCap size={20} />
              </div>
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Total Active Quizzes</span>
                <h4 className="text-xl font-bold text-slate-800">{stats?.total_quizzes}</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
