import React, { useEffect, useState } from "react";
import { TrendingUp, Users, BookOpen, CreditCard, Sparkles, Calendar, ArrowRight, Wallet, Award, Activity } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface AnalyticsData {
  total_students: number;
  total_courses: number;
  total_lessons: number;
  total_quizzes: number;
  approved_topups_count: number;
  total_revenue: number;
  most_enrolled_courses: Array<{ id: string; title: string; price_points: number; enroll_count: number }>;
  course_engagement: Array<{ id: string; title: string; enroll_count: number; completed_lessons: number; quiz_attempts: number; engagement_score: number }>;
  engagement_trend: Array<{ name: string; enrollments: number; lesson_completions: number; quiz_attempts: number }>;
  recent_registrations: Array<{ id: string; name: string; email: string; created_at: string }>;
  recent_purchases: Array<{ id: string; student_name: string; student_email: string; points_amount: number; course_title: string; created_at: string }>;
}

export const TeacherAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/analytics/summary", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load platform analytics log");
        return res.json();
      })
      .then(json => {
        setData(json);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString();
    } catch (e) {
      return isoStr;
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
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
        Error loading analytics: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Platform Analytics</h1>
        <p className="text-slate-500 text-sm mt-1">Deep-dive insights, registration stats, conversion revenue, and product trends.</p>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Students</span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-display font-bold text-slate-800">{data?.total_students}</h3>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">Active</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Courseware</span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-display font-bold text-slate-800">{data?.total_courses}</h3>
            <span className="text-xs text-slate-500 font-medium">{data?.total_lessons} total chapters</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved Top-Ups</span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-display font-bold text-slate-800">{data?.approved_topups_count}</h3>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 rounded-md font-semibold">Cleared</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points Conversions</span>
          <div className="flex justify-between items-baseline mt-2">
            <h3 className="text-3xl font-display font-bold text-slate-800">{data?.total_revenue} <span className="text-xs font-normal text-slate-400">pts</span></h3>
            <span className="text-xs text-indigo-600 font-bold">100% Volume</span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Course Engagement Metrics Comparison Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-slate-900 text-md flex items-center gap-1.5">
              <Award className="text-indigo-600" size={18} /> Course Engagement Metrics
            </h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full border border-indigo-100">
              Top Courses Comparison
            </span>
          </div>

          <div className="h-64 w-full">
            {data?.course_engagement && data.course_engagement.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.course_engagement.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                  <YAxis 
                    dataKey="title" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#475569", fontSize: 10, fontWeight: 500 }} 
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", fontSize: "11px" }}
                  />
                  <Legend 
                    iconSize={8} 
                    wrapperStyle={{ fontSize: '10px', fontWeight: 600, paddingTop: '10px' }}
                  />
                  <Bar dataKey="enroll_count" fill="#4f46e5" name="Enrollments" radius={[0, 4, 4, 0]} barSize={6} />
                  <Bar dataKey="completed_lessons" fill="#0ea5e9" name="Lessons Completed" radius={[0, 4, 4, 0]} barSize={6} />
                  <Bar dataKey="quiz_attempts" fill="#10b981" name="Quizzes Taken" radius={[0, 4, 4, 0]} barSize={6} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">No engagement metrics detected.</div>
            )}
          </div>
        </div>

        {/* Financial conversions trend - premium visual vector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-bold text-slate-900 text-md mb-4 flex items-center gap-1.5">
              <TrendingUp className="text-emerald-500" size={18} /> Points Conversion Volume
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Visualizes approved Vodafone Cash topups and platform capital conversion. Points represent purchasing strength utilized inside the platform.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Converted Value</span>
              <h2 className="text-3xl font-display font-bold text-slate-800">{data?.total_revenue} Points</h2>
            </div>
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 shrink-0">
              <Wallet size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Ledgers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Student Signups */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-900 text-md mb-4 flex items-center gap-1.5">
            <Users size={18} className="text-slate-400" /> Recent Student Registrations
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="text-left text-slate-400 font-bold">
                  <th className="py-2">Student Name</th>
                  <th className="py-2">Email</th>
                  <th className="py-2">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recent_registrations.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-400 italic">No registrations yet.</td>
                  </tr>
                ) : (
                  data?.recent_registrations.map(student => (
                    <tr key={student.id} className="text-slate-600">
                      <td className="py-2.5 font-semibold text-slate-800">{student.name}</td>
                      <td className="py-2.5">{student.email}</td>
                      <td className="py-2.5">{formatDate(student.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Purchases */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-display font-bold text-slate-900 text-md mb-4 flex items-center gap-1.5">
            <CreditCard size={18} className="text-slate-400" /> Recent Course Purchases
          </h3>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead>
                <tr className="text-left text-slate-400 font-bold">
                  <th className="py-2">Student</th>
                  <th className="py-2">Course Title</th>
                  <th className="py-2">Price Paid</th>
                  <th className="py-2">Purchase Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.recent_purchases.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-400 italic">No course purchases yet.</td>
                  </tr>
                ) : (
                  data?.recent_purchases.map(p => (
                    <tr key={p.id} className="text-slate-600">
                      <td className="py-2.5 font-semibold text-slate-800">{p.student_name}</td>
                      <td className="py-2.5 font-medium max-w-[120px] truncate" title={p.course_title}>{p.course_title}</td>
                      <td className="py-2.5 font-bold text-indigo-600">{p.points_amount} pts</td>
                      <td className="py-2.5">{formatDate(p.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
