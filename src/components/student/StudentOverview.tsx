import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG, getPlatformSettings } from "../../theme.config";
import { 
  ShieldCheck, 
  UserCheck, 
  Coins, 
  BookOpen, 
  Award, 
  Bell, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  ShoppingBag, 
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { motion } from "motion/react";

interface StudentOverviewProps {
  onNavigate: (hash: string) => void;
  onSelectCourse: (courseId: string) => void;
}

export const StudentOverview: React.FC<StudentOverviewProps> = ({ onNavigate, onSelectCourse }) => {
  const { token, user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [coursesCount, setCoursesCount] = useState<number>(0);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchOverviewData();
  }, [token]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      // 1. Fetch balance & transactions (gives Approved, Rejected, Purchases)
      const balanceRes = await fetch("/api/wallet/balance", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const balanceData = await balanceRes.json();
      setBalance(balanceData.current_balance || 0);

      // 2. Fetch my courses count
      const coursesRes = await fetch("/api/courses/my-courses", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const coursesData = await coursesRes.json();
      setCoursesCount(coursesData.length || 0);

      // 3. Compile dynamic live in-app notifications list from actual db logs
      const rawTx = balanceData.transactions || [];
      const compiledAlerts: any[] = [];

      // Add Topups, Rejections, and Purchases
      rawTx.forEach((tx: any) => {
        if (tx.type === "topup_approved") {
          compiledAlerts.push({
            id: `notif-tx-app-${tx.id}`,
            title: "Wallet Top-up Approved",
            description: `Your Vodafone Cash deposit of ${tx.points_amount} points has been verified and added to your balance!`,
            type: "approved",
            time: tx.approved_at || tx.created_at,
            icon: CheckCircle
          });
        } else if (tx.type === "topup_rejected") {
          compiledAlerts.push({
            id: `notif-tx-rej-${tx.id}`,
            title: "Deposit Request Declined",
            description: `Your top-up was rejected. Reason: ${tx.rejection_reason || "Invalid receipt metadata"}.`,
            type: "rejected",
            time: tx.approved_at || tx.created_at,
            icon: XCircle
          });
        } else if (tx.type === "course_purchase") {
          compiledAlerts.push({
            id: `notif-tx-pur-${tx.id}`,
            title: "Course Syllabus Unlocked",
            description: `Successfully enrolled and unlocked full syllabus details for: ${tx.reference_note.replace("Purchase of course: ", "")}.`,
            type: "purchase",
            time: tx.created_at,
            icon: ShoppingBag
          });
        }
      });

      // Let's query student details for quiz attempts if any
      const studentDetailsRes = await fetch(`/api/students/${user?.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (studentDetailsRes.ok) {
        const studentDetails = await studentDetailsRes.json();
        const quizHistory = studentDetails.quiz_history || [];
        setAttemptsCount(quizHistory.length);

        quizHistory.forEach((attempt: any) => {
          compiledAlerts.push({
            id: `notif-qz-${attempt.id}`,
            title: "Quiz Attempt Finalized",
            description: `You finished the exercise "${attempt.quiz_title}" scoring ${attempt.score} out of ${attempt.total_questions}!`,
            type: "quiz",
            time: attempt.created_at,
            icon: Award
          });
        });
      }

      // Sort chronological descending
      compiledAlerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setNotifications(compiledAlerts.slice(0, 10)); // Top 10 notifications
    } catch (err) {
      console.error("Overview metrics aggregation error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium text-xs mt-4">Synthesizing learning dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-violet-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/5 rounded-full blur-2xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>Student Dashboard Active</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-4xl tracking-tight">
            Welcome back, {user?.name}!
          </h1>
          <p className="text-sm text-indigo-100 max-w-2xl leading-relaxed">
            Resume your lessons, unlock available curriculum packages with wallet points, or review your quiz performance timeline with expert feedback.
          </p>
        </div>
      </motion.div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Wallet balance */}
        <div 
          onClick={() => onNavigate("#/student/wallet")}
          className={`${THEME_CONFIG.classes.card} p-6 flex items-start gap-4 cursor-pointer hover:border-indigo-500 group`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <Coins className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Wallet Points</span>
            <div className="text-lg font-bold text-slate-800">{balance.toLocaleString()} pts</div>
            <p className="text-[10px] text-slate-500 font-semibold group-hover:text-indigo-600 transition-colors flex items-center gap-1">
              Top up points <ArrowRight size={10} />
            </p>
          </div>
        </div>

        {/* Owned Courses */}
        <div 
          onClick={() => onNavigate("#/student/my-courses")}
          className={`${THEME_CONFIG.classes.card} p-6 flex items-start gap-4 cursor-pointer hover:border-indigo-500 group`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Syllabuses Unlocked</span>
            <div className="text-lg font-bold text-slate-800">{coursesCount} Courses</div>
            <p className="text-[10px] text-slate-500 font-semibold group-hover:text-indigo-600 transition-colors flex items-center gap-1">
              Resume learning <ArrowRight size={10} />
            </p>
          </div>
        </div>

        {/* Exercises Finished */}
        <div 
          className={`${THEME_CONFIG.classes.card} p-6 flex items-start gap-4`}
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Quizzes Executed</span>
            <div className="text-lg font-bold text-slate-800">{attemptsCount} Homeworks</div>
            <p className="text-[10px] text-slate-500 font-semibold">Explanations stored</p>
          </div>
        </div>
      </div>

      {/* Grid: Notifications & Calendar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Notification Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-slate-700" />
            <h2 className="font-display font-bold text-base text-slate-800">Dynamic In-App Notifications</h2>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs divide-y divide-slate-100">
            {notifications.map((notif) => {
              const Icon = notif.icon;
              return (
                <div key={notif.id} className="p-4 sm:p-5 flex items-start gap-4">
                  <div className={`p-2.5 rounded-2xl shrink-0 ${
                    notif.type === "approved" ? "bg-emerald-50 text-emerald-600" :
                    notif.type === "rejected" ? "bg-rose-50 text-rose-600" :
                    notif.type === "purchase" ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"
                  }`}>
                    <Icon size={18} />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-bold text-slate-800">{notif.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">{notif.description}</p>
                    <span className="text-[10px] text-slate-400 block font-bold">
                      {new Date(notif.time).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {notifications.length === 0 && (
              <div className="p-12 text-center text-xs text-slate-400 font-medium">
                No recent in-app announcements or transaction receipts recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Security / Info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-slate-700" />
            <h2 className="font-display font-bold text-base text-slate-800">System Logs</h2>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
              <p>
                <strong>Points Economy:</strong> Balance is computed directly from APPROVED point additions ledger entries minus unlocked course points, preventing race conditions or manual tampering.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
              <p>
                <strong>AI Explanations:</strong> Quiz solutions are stored natively in the SQLite ledger containing full historical metadata with step-by-step correct choices logic.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0"></span>
              <p>
                <strong>Security:</strong> All downloads and video playback requests authenticate each block dynamically with temporary JSON Web Tokens.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
