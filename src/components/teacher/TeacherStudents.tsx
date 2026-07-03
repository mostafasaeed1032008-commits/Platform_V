import React, { useEffect, useState } from "react";
import { Search, User, Mail, Calendar, Wallet, GraduationCap, X, ChevronRight, BookOpen, AlertCircle, FileText } from "lucide-react";

interface EnrichedStudent {
  id: string;
  name: string;
  email: string;
  created_at: string;
  current_balance: number;
  courses_count: number;
  quiz_attempts_count: number;
}

interface StudentDetailData {
  student: {
    id: string;
    name: string;
    email: string;
    created_at: string;
    current_balance: number;
  };
  enrollments: Array<{ id: string; course_id: string; course_title: string; enrolled_at: string }>;
  wallet_history: Array<{ id: string; type: string; points_amount: number; reference_note: string; created_at: string; rejection_reason?: string }>;
  quiz_history: Array<{ id: string; quiz_title: string; score: number; total_questions: number; created_at: string }>;
}

export const TeacherStudents: React.FC = () => {
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");

  // Detail Drawer state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<StudentDetailData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = () => {
    setLoading(true);
    fetch("/api/students", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch registered students");
        return res.json();
      })
      .then(data => {
        setStudents(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleOpenDetails = (studentId: string) => {
    setSelectedStudentId(studentId);
    setLoadingDetails(true);
    setDetailData(null);

    fetch(`/api/students/${studentId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to load student details history");
        return res.json();
      })
      .then(data => {
        setDetailData(data);
        setLoadingDetails(false);
      })
      .catch(err => {
        alert(err.message || "Could not retrieve details");
        setLoadingDetails(false);
      });
  };

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString();
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Main Grid: split with details drawer on large screen */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Side: Student List */}
        <div className="flex-1 space-y-6 w-full">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Student Directory</h1>
            <p className="text-slate-500 text-sm mt-1">Monitor course progress, point balances, and exam histories of your learners.</p>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Search by student name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl">
              Error fetching students: {error}
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl">
              <User className="mx-auto text-slate-300 mb-4" size={48} />
              <h3 className="font-display font-bold text-slate-700 text-lg">No Students Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto mt-2">
                {searchQuery ? "No learners match this search string." : "Students who register on your platform will appear here."}
              </p>
            </div>
          ) : (
            /* Student Table styled cleanly */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student info</th>
                      <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joined date</th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points balance</th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Courses</th>
                      <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quizzes</th>
                      <th className="relative px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {filteredStudents.map(student => (
                      <tr
                        key={student.id}
                        onClick={() => handleOpenDetails(student.id)}
                        className={`hover:bg-indigo-50/20 transition-colors cursor-pointer ${selectedStudentId === student.id ? "bg-indigo-50/40" : ""}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-slate-800">{student.name}</h4>
                              <p className="text-xs text-slate-400">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                          {formatDate(student.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="text-xs font-bold text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                            {student.current_balance} pts
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-semibold text-indigo-600">
                          {student.courses_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-slate-500">
                          {student.quiz_attempts_count}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold text-indigo-600">
                          <ChevronRight size={16} className="inline text-slate-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Floating details drawer panel */}
        {selectedStudentId && (
          <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden animate-slide-up sticky top-6 shrink-0">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <User size={18} className="text-indigo-600" />
                <h3 className="font-display font-bold text-slate-800 text-sm">Learner Portfolio</h3>
              </div>
              <button
                onClick={() => setSelectedStudentId(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {loadingDetails ? (
              <div className="p-12 flex flex-col items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                <span className="text-xs text-slate-400">Loading profile logs...</span>
              </div>
            ) : detailData ? (
              <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                {/* Header overview */}
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg mx-auto">
                    {detailData.student.name.charAt(0)}
                  </div>
                  <h4 className="font-bold text-slate-800 text-md mt-2">{detailData.student.name}</h4>
                  <p className="text-xs text-slate-400">{detailData.student.email}</p>
                </div>

                {/* Sub-details tabs/lists */}
                {/* Enrolled Courses */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <BookOpen size={13} /> Course Enrollments ({detailData.enrollments.length})
                  </h5>
                  {detailData.enrollments.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                      Not enrolled in any courses.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {detailData.enrollments.map(item => (
                        <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs flex justify-between items-center">
                          <span className="font-semibold text-slate-700 truncate max-w-[70%]">{item.course_title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">{formatDate(item.enrolled_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wallet Balance / History */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Wallet size={13} /> Point Transaction Ledger
                  </h5>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex justify-between items-center">
                    <span className="text-xs text-slate-500 font-medium">Accumulated Balance</span>
                    <span className="text-sm font-bold text-indigo-600">{detailData.student.current_balance} pts</span>
                  </div>

                  {detailData.wallet_history.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic text-center py-2">No manual wallet logs.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                      {detailData.wallet_history.map(tx => (
                        <div key={tx.id} className="p-2 bg-slate-50/70 border border-slate-100 rounded-xl text-[11px] flex justify-between items-center">
                          <div>
                            <span className={`font-semibold ${tx.type === "topup_approved" ? "text-emerald-600" : tx.type === "course_purchase" ? "text-indigo-600" : "text-rose-600"}`}>
                              {tx.type === "topup_approved" ? "Topup" : tx.type === "course_purchase" ? "Purchase" : "Rejected"}
                            </span>
                            <p className="text-[9px] text-slate-400 max-w-[140px] truncate">{tx.reference_note}</p>
                          </div>
                          <span className="font-bold text-slate-800">
                            {tx.type === "course_purchase" ? "-" : "+"}{tx.points_amount} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quiz attempts history */}
                <div className="space-y-2.5">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <GraduationCap size={13} /> Quiz / Exam Grades
                  </h5>
                  {detailData.quiz_history.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-100">
                      No quiz attempts logged.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {detailData.quiz_history.map(attempt => {
                        const scorePercent = Math.round((attempt.score / attempt.total_questions) * 100);
                        return (
                          <div key={attempt.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-slate-700 truncate max-w-[65%]">{attempt.quiz_title}</span>
                              <span className={`font-semibold shrink-0 text-[11px] px-2 py-0.5 rounded-sm ${scorePercent >= 70 ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}`}>
                                {attempt.score} / {attempt.total_questions} ({scorePercent}%)
                              </span>
                            </div>
                            <p className="text-[9px] text-slate-400">{formatDate(attempt.created_at)}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">Failed to parse profile details logs.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
