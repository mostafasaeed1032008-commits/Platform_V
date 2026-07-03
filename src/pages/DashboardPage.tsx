import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { THEME_CONFIG, getBrandName, getPlatformSettings } from "../theme.config";
import { t } from "../locales";
import { motion } from "motion/react";
import { 
  ShieldCheck, 
  Database, 
  UserCheck, 
  Coins, 
  BookOpen, 
  CheckSquare, 
  TrendingUp, 
  FileText,
  Lock,
  Globe,
  Grid,
  Users,
  Wallet,
  Settings,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Tv,
  Clock
} from "lucide-react";

// Import teacher components
import { TeacherOverview } from "../components/teacher/TeacherOverview";
import { TeacherCourses } from "../components/teacher/TeacherCourses";
import { TeacherCourseDetails } from "../components/teacher/TeacherCourseDetails";
import { TeacherQuizzes } from "../components/teacher/TeacherQuizzes";
import { TeacherWallet } from "../components/teacher/TeacherWallet";
import { TeacherStudents } from "../components/teacher/TeacherStudents";
import { TeacherAnalytics } from "../components/teacher/TeacherAnalytics";
import { TeacherSettings } from "../components/teacher/TeacherSettings";

// Import student components
import { StudentOverview } from "../components/student/StudentOverview";
import { StudentCourses } from "../components/student/StudentCourses";
import { StudentMyCourses } from "../components/student/StudentMyCourses";
import { StudentCourseDetails } from "../components/student/StudentCourseDetails";
import { StudentWallet } from "../components/student/StudentWallet";
import { StudentQuiz } from "../components/student/StudentQuiz";
import { StudentProfile } from "../components/student/StudentProfile";
import { StudentHistory } from "../components/student/StudentHistory";

export const DashboardPage: React.FC = () => {
  const { user, token } = useAuth();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  // Router hash states
  const [currentHash, setCurrentHash] = useState(
    window.location.hash || (user?.role === "teacher" ? "#/teacher" : "#/student")
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || (user?.role === "teacher" ? "#/teacher" : "#/student"));
      setIsMobileMenuOpen(false); // Close mobile drawer on route transition
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, [user]);

  const fetchStudentBalance = () => {
    if (user?.role === "student" && token) {
      setLoadingBalance(true);
      fetch("/api/wallet/balance", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setWalletBalance(data.current_balance || 0);
        })
        .catch(err => console.error(err))
        .finally(() => setLoadingBalance(false));
    }
  };

  // Fetch balance for students
  useEffect(() => {
    fetchStudentBalance();
  }, [user, token]);

  if (!user) return null;

  // TEACHER FLOW
  if (user.role === "teacher") {
    // Menu links config
    const menuItems = [
      { label: "Overview", hash: "#/teacher", icon: Grid },
      { label: "Courses", hash: "#/teacher/courses", icon: BookOpen },
      { label: "Quizzes & Exams", hash: "#/teacher/quizzes", icon: CheckSquare },
      { label: "Manual Topups", hash: "#/teacher/wallet", icon: Wallet },
      { label: "Students", hash: "#/teacher/students", icon: Users },
      { label: "Platform Analytics", hash: "#/teacher/analytics", icon: TrendingUp },
      { label: "Brand Settings", hash: "#/teacher/settings", icon: Settings },
    ];

    // Simple path parser for nested routing (e.g. #/teacher/courses/:id)
    const renderTeacherContent = () => {
      if (currentHash === "#/teacher" || currentHash === "") {
        return <TeacherOverview />;
      }
      if (currentHash === "#/teacher/courses") {
        return <TeacherCourses />;
      }
      if (currentHash.startsWith("#/teacher/courses/")) {
        const id = currentHash.replace("#/teacher/courses/", "");
        return <TeacherCourseDetails courseId={id} onBack={() => window.location.hash = "#/teacher/courses"} />;
      }
      if (currentHash === "#/teacher/quizzes") {
        return <TeacherQuizzes />;
      }
      if (currentHash === "#/teacher/wallet") {
        return <TeacherWallet />;
      }
      if (currentHash === "#/teacher/students") {
        return <TeacherStudents />;
      }
      if (currentHash === "#/teacher/analytics") {
        return <TeacherAnalytics />;
      }
      if (currentHash === "#/teacher/settings") {
        return <TeacherSettings />;
      }

      // Default Fallback
      return <TeacherOverview />;
    };

    // Breadcrumbs generator
    const getBreadcrumbs = () => {
      const crumbs = [{ label: "Dashboard", hash: "#/teacher" }];

      if (currentHash === "#/teacher/courses") {
        crumbs.push({ label: "Courses", hash: "#/teacher/courses" });
      } else if (currentHash.startsWith("#/teacher/courses/")) {
        crumbs.push({ label: "Courses", hash: "#/teacher/courses" });
        crumbs.push({ label: "Course Curriculum", hash: currentHash });
      } else if (currentHash === "#/teacher/quizzes") {
        crumbs.push({ label: "Quizzes", hash: "#/teacher/quizzes" });
      } else if (currentHash === "#/teacher/wallet") {
        crumbs.push({ label: "Manual Payments Desk", hash: "#/teacher/wallet" });
      } else if (currentHash === "#/teacher/students") {
        crumbs.push({ label: "Students Directory", hash: "#/teacher/students" });
      } else if (currentHash === "#/teacher/analytics") {
        crumbs.push({ label: "Platform Analytics", hash: "#/teacher/analytics" });
      } else if (currentHash === "#/teacher/settings") {
        crumbs.push({ label: "Settings", hash: "#/teacher/settings" });
      }

      return crumbs;
    };

    const activeMenuItem = menuItems.find(item => 
      currentHash === item.hash || (item.hash !== "#/teacher" && currentHash.startsWith(item.hash))
    );

    return (
      <div className="flex min-h-[calc(100vh-4rem)] relative" id="teacher-workspace">
        {/* DESKTOP SIDEBAR - COLLAPSED ON MOBILE */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-xl">{getPlatformSettings().logoSymbol}</span>
            <div>
              <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest">Workspace</h4>
              <p className="font-semibold text-slate-700 text-xs">Instructor Panel</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentHash === item.hash || (item.hash !== "#/teacher" && currentHash.startsWith(item.hash));

              return (
                <a
                  key={item.label}
                  href={item.hash}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* MOBILE OVERLAY NAVIGATION MENU */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className="relative flex flex-col w-72 max-w-[80vw] bg-white h-full shadow-xl animate-slide-right">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getPlatformSettings().logoSymbol}</span>
                  <span className="font-display font-bold text-slate-800 text-sm">Teaching Workspace</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentHash === item.hash || (item.hash !== "#/teacher" && currentHash.startsWith(item.hash));

                  return (
                    <a
                      key={item.label}
                      href={item.hash}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </a>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* MAIN WORKSPACE BODY */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          {/* Top workspace navigation bar with hamburger and breadcrumbs */}
          <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-16 z-30">
            <div className="flex items-center gap-3">
              {/* Mobile hamburger menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer"
              >
                <Menu size={20} />
              </button>

              {/* Breadcrumbs List */}
              <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap scrollbar-none">
                {getBreadcrumbs().map((crumb, idx) => (
                  <React.Fragment key={crumb.label}>
                    {idx > 0 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
                    <a
                      href={crumb.hash}
                      className={`hover:text-slate-800 transition-colors ${idx === getBreadcrumbs().length - 1 ? "text-slate-800 font-bold" : ""}`}
                    >
                      {crumb.label}
                    </a>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden xs:inline-block text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
                ROLE: {user.role.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Mount dynamic teacher pages with premium animations */}
          <div className="flex-grow p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {renderTeacherContent()}
          </div>
        </div>
      </div>
    );
  }

  // STUDENT FLOW
  if (user.role === "student") {
    const studentMenuItems = [
      { label: "Dashboard", hash: "#/student", icon: Grid },
      { label: "Browse Catalog", hash: "#/student/courses", icon: BookOpen },
      { label: "My Syllabuses", hash: "#/student/my-courses", icon: Tv },
      { label: "Exam History", hash: "#/student/history", icon: Clock },
      { label: "Wallet Desk", hash: "#/student/wallet", icon: Wallet },
      { label: "Profile Settings", hash: "#/student/profile", icon: Settings },
    ];

    const renderStudentContent = () => {
      if (currentHash === "#/student" || currentHash === "") {
        return (
          <StudentOverview 
            onNavigate={(hash) => window.location.hash = hash}
            onSelectCourse={(courseId) => window.location.hash = `#/student/course/${courseId}`}
          />
        );
      }
      if (currentHash === "#/student/courses") {
        return (
          <StudentCourses 
            onSelectCourse={(courseId) => window.location.hash = `#/student/course/${courseId}`}
          />
        );
      }
      if (currentHash === "#/student/my-courses") {
        return (
          <StudentMyCourses 
            onSelectCourse={(courseId) => window.location.hash = `#/student/course/${courseId}`}
          />
        );
      }
      if (currentHash === "#/student/history") {
        return <StudentHistory />;
      }
      if (currentHash.startsWith("#/student/course/")) {
        const id = currentHash.replace("#/student/course/", "");
        return (
          <StudentCourseDetails 
            courseId={id} 
            onBack={() => window.location.hash = "#/student/courses"} 
            onRefreshBalance={fetchStudentBalance}
          />
        );
      }
      if (currentHash === "#/student/wallet") {
        return <StudentWallet onRefreshBalance={fetchStudentBalance} />;
      }
      if (currentHash.startsWith("#/student/quiz/")) {
        const id = currentHash.replace("#/student/quiz/", "");
        return <StudentQuiz quizId={id} onBack={() => window.location.hash = "#/student/courses"} />;
      }
      if (currentHash === "#/student/profile") {
        return <StudentProfile />;
      }

      // Default Fallback
      return (
        <StudentOverview 
          onNavigate={(hash) => window.location.hash = hash}
          onSelectCourse={(courseId) => window.location.hash = `#/student/course/${courseId}`}
        />
      );
    };

    const getStudentBreadcrumbs = () => {
      const crumbs = [{ label: "Dashboard", hash: "#/student" }];

      if (currentHash === "#/student/courses") {
        crumbs.push({ label: "Catalog", hash: "#/student/courses" });
      } else if (currentHash === "#/student/my-courses") {
        crumbs.push({ label: "My Syllabuses", hash: "#/student/my-courses" });
      } else if (currentHash === "#/student/history") {
        crumbs.push({ label: "Exam History", hash: "#/student/history" });
      } else if (currentHash.startsWith("#/student/course/")) {
        crumbs.push({ label: "Catalog", hash: "#/student/courses" });
        crumbs.push({ label: "Syllabus details", hash: currentHash });
      } else if (currentHash === "#/student/wallet") {
        crumbs.push({ label: "Points Wallet", hash: "#/student/wallet" });
      } else if (currentHash.startsWith("#/student/quiz/")) {
        crumbs.push({ label: "Quiz portal", hash: currentHash });
      } else if (currentHash === "#/student/profile") {
        crumbs.push({ label: "Profile", hash: "#/student/profile" });
      }

      return crumbs;
    };

    const activeMenuItem = studentMenuItems.find(item => 
      currentHash === item.hash || (item.hash !== "#/student" && currentHash.startsWith(item.hash))
    );

    return (
      <div className="flex min-h-[calc(100vh-4rem)] relative" id="student-workspace">
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-16 h-[calc(100vh-4rem)]">
          <div className="p-4 border-b border-slate-100 flex items-center gap-2">
            <span className="text-xl">{getPlatformSettings().logoSymbol}</span>
            <div>
              <h4 className="font-display font-bold text-xs text-slate-400 uppercase tracking-widest">Workspace</h4>
              <p className="font-semibold text-slate-700 text-xs">Student Portal</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {studentMenuItems.map(item => {
              const Icon = item.icon;
              const isActive = currentHash === item.hash || (item.hash !== "#/student" && currentHash.startsWith(item.hash));

              return (
                <a
                  key={item.label}
                  href={item.hash}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Points display inside sidebar footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 m-4 rounded-2xl flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Coins size={18} />
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-400 uppercase block">Available Balance</span>
              <span className="text-xs font-black text-slate-800">
                {loadingBalance ? "Loading..." : `${walletBalance.toLocaleString()} pts`}
              </span>
            </div>
          </div>
        </aside>

        {/* MOBILE OVERLAY NAVIGATION */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setIsMobileMenuOpen(false)}></div>
            <aside className="relative flex flex-col w-72 max-w-[80vw] bg-white h-full shadow-xl animate-slide-right">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{getPlatformSettings().logoSymbol}</span>
                  <span className="font-display font-bold text-slate-800 text-sm">Learning Portal</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {studentMenuItems.map(item => {
                  const Icon = item.icon;
                  const isActive = currentHash === item.hash || (item.hash !== "#/student" && currentHash.startsWith(item.hash));

                  return (
                    <a
                      key={item.label}
                      href={item.hash}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? "bg-indigo-600 text-white shadow-sm" 
                          : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </a>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 m-4 rounded-2xl flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Coins size={18} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Available Balance</span>
                  <span className="text-xs font-black text-slate-800">{walletBalance.toLocaleString()} pts</span>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* MAIN WORKSPACE BODY */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
          <div className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-16 z-30">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg shrink-0 cursor-pointer"
              >
                <Menu size={20} />
              </button>

              <nav className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap scrollbar-none">
                {getStudentBreadcrumbs().map((crumb, idx) => (
                  <React.Fragment key={crumb.label}>
                    {idx > 0 && <ChevronRight size={12} className="text-slate-300 shrink-0" />}
                    <a
                      href={crumb.hash}
                      className={`hover:text-slate-800 transition-colors ${idx === getStudentBreadcrumbs().length - 1 ? "text-slate-800 font-bold" : ""}`}
                    >
                      {crumb.label}
                    </a>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden xs:inline-block text-[10px] uppercase font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
                ROLE: {user.role.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex-grow p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {renderStudentContent()}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
