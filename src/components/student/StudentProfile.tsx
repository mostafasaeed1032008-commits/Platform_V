import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { THEME_CONFIG } from "../../theme.config";
import { UserCheck, Shield, Key, RefreshCw, Mail, Calendar, BookOpen, HelpCircle } from "lucide-react";
import { motion } from "motion/react";

export const StudentProfile: React.FC = () => {
  const { token, user, login } = useAuth();
  
  // Profile update form states
  const [name, setName] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState<any>({
    courses_count: 0,
    wallet_balance: 0,
    created_at: new Date().toISOString()
  });

  useEffect(() => {
    if (user) {
      setName(user.name);
    }
    fetchStudentProfileStats();
  }, [user]);

  const fetchStudentProfileStats = () => {
    // We can retrieve from `/api/wallet/balance` to see transactions, and from `/api/courses/my-courses` for course count
    Promise.all([
      fetch("/api/wallet/balance", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
      fetch("/api/courses/my-courses", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
    ])
      .then(([walletData, coursesData]) => {
        setStats({
          courses_count: coursesData.length || 0,
          wallet_balance: walletData.current_balance || 0,
          created_at: user?.created_at || new Date().toISOString()
        });
      })
      .catch(err => console.error(err));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (password) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          ...(password ? { password } : {})
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profile update failed");

      // Set success and update context
      setSuccess("Your profile details have been successfully updated!");
      setPassword("");
      setConfirmPassword("");
      
      // Update local storage or state by calling login with new user info
      if (data.user) {
        // Re-save session
        localStorage.setItem("platform_user", JSON.stringify(data.user));
        // Force refresh
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-800">Account Profile</h1>
        <p className="text-xs text-slate-500">Edit your user details, manage secure passwords, and inspect platform activity statistics.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left Card: Summary Stats */}
        <div className="md:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="text-center space-y-2 border-b border-slate-50 pb-5">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 font-extrabold text-2xl flex items-center justify-center mx-auto shadow-sm">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm">{user.name}</h3>
              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-full uppercase">
                {user.role}
              </span>
            </div>
          </div>

          {/* Quick stats items */}
          <div className="space-y-4 text-xs text-slate-600">
            <div className="flex items-center gap-3">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] text-slate-400 font-bold block">EMAIL ADDRESS</span>
                <span className="font-semibold text-slate-700">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar size={16} className="text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">REGISTERED DATE</span>
                <span className="font-semibold text-slate-700">
                  {new Date(stats.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-slate-50 pt-4">
              <BookOpen size={16} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">PURCHASED COURSES</span>
                <span className="font-bold text-slate-800">{stats.courses_count} Courses</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <HelpCircle size={16} className="text-indigo-600 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">AVAILABLE POINTS</span>
                <span className="font-bold text-slate-800">{stats.wallet_balance.toLocaleString()} Points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Settings Update Form */}
        <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-slate-800 text-sm">Update Profile Credentials</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">EDIT ACCOUNT DATA</p>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {/* Name Input */}
            <div className="space-y-1.5">
              <label className={THEME_CONFIG.classes.label}>Full Name</label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Your Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={THEME_CONFIG.classes.input + " pl-10"}
                  required
                />
              </div>
            </div>

            {/* Email field (Read only for integrity) */}
            <div className="space-y-1.5 opacity-60">
              <label className={THEME_CONFIG.classes.label}>Email Address (Read-only)</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  value={user.email}
                  className={THEME_CONFIG.classes.input + " pl-10 cursor-not-allowed bg-slate-50"}
                  disabled
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="space-y-1">
              <h4 className="font-display font-bold text-slate-800 text-xs flex items-center gap-1">
                <Key size={14} className="text-indigo-600" /> Update Password (Optional)
              </h4>
              <p className="text-[10px] text-slate-400">Leave blank if you don't wish to modify your account password.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* New Password */}
              <div className="space-y-1.5">
                <label className={THEME_CONFIG.classes.label}>New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={THEME_CONFIG.classes.input}
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className={THEME_CONFIG.classes.label}>Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={THEME_CONFIG.classes.input}
                />
              </div>
            </div>

            {success && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs flex items-start gap-2 leading-relaxed">
                <Shield size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs flex items-start gap-2 leading-relaxed">
                <Shield size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={THEME_CONFIG.classes.primaryButton}
              >
                {submitting ? "Saving..." : "Save Credentials"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
