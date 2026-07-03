import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api } from "../api";
import { THEME_CONFIG, getBrandName } from "../theme.config";
import { t } from "../locales";
import { Mail, Lock, User, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (authMode === "login") {
        const data = await api.auth.login(email, password);
        login(data.token, data.user);
      } else {
        const data = await api.auth.signup(name, email, password);
        login(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 px-4" id="login-container">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`${THEME_CONFIG.classes.card} p-6 sm:p-8 space-y-6`}
      >
        <div className="text-center space-y-2">
          <span className="text-4xl inline-block animate-bounce" id="logo-symbol">
            {THEME_CONFIG.logoSymbol}
          </span>
          <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
            {getBrandName()}
          </h1>
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase">
            {authMode === "login" ? "Platform Portal Gateway" : t("signup")}
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-50 border border-red-100 text-red-800 p-4 rounded-xl text-xs font-semibold flex items-start gap-2.5"
            id="login-error-banner"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" id="auth-form">
          {authMode === "signup" && (
            <div>
              <label className={THEME_CONFIG.classes.label}>{t("full_name")}</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className={`${THEME_CONFIG.classes.input} pl-10`}
                  id="signup-name-input"
                />
              </div>
            </div>
          )}

          <div>
            <label className={THEME_CONFIG.classes.label}>{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className={`${THEME_CONFIG.classes.input} pl-10`}
                id="auth-email-input"
              />
            </div>
          </div>

          <div>
            <label className={THEME_CONFIG.classes.label}>{t("password")}</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`${THEME_CONFIG.classes.input} pl-10`}
                id="auth-password-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`${THEME_CONFIG.classes.primaryButton} w-full py-3 mt-2`}
            id="btn-auth-submit"
          >
            {submitting ? t("submitting") : authMode === "login" ? t("login") : t("signup")}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === "login" ? "signup" : "login");
              setError(null);
            }}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors cursor-pointer"
            id="btn-switch-auth-mode"
          >
            {authMode === "login" ? t("switch_to_signup") : t("switch_to_login")}
          </button>
        </div>

        {authMode === "login" && (
          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 text-center leading-relaxed">
            🎓 <span className="font-semibold">Teacher Account seeded:</span> Login with{" "}
            <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600">
              teacher@platform.com
            </code>{" "}
            and password{" "}
            <code className="bg-slate-50 px-1.5 py-0.5 rounded font-mono font-bold text-slate-600">
              teacher123
            </code>.
          </div>
        )}
      </motion.div>
    </div>
  );
};
