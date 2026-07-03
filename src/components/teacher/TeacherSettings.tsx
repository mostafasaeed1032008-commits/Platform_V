import React, { useState, useEffect } from "react";
import { Save, User, Settings, Phone, Globe, Sliders, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export const TeacherSettings: React.FC = () => {
  const { user } = useAuth();

  // Profile fields (Read-only as requested for security/passwords unless updating names)
  const [profileName, setProfileName] = useState(user?.name || "Teacher");
  const [profileEmail, setProfileEmail] = useState(user?.email || "teacher@example.com");

  // Customizable platform settings (linked with localStorage + theme.config)
  const [platformNameEn, setPlatformNameEn] = useState("");
  const [platformNameAr, setPlatformNameAr] = useState("");
  const [platformVodafone, setPlatformVodafone] = useState("");
  const [platformLogo, setPlatformLogo] = useState("");
  const [platformLang, setPlatformLang] = useState("");

  useEffect(() => {
    // Load config from localStorage with fallback defaults matching theme.config
    setPlatformNameEn(localStorage.getItem("platform_name_en") || "Academia Platform");
    setPlatformNameAr(localStorage.getItem("platform_name_ar") || "منصة أكاديميا التعليمية");
    setPlatformVodafone(localStorage.getItem("platform_vodafone") || "01012345678");
    setPlatformLogo(localStorage.getItem("platform_logo") || "🎓");
    setPlatformLang(localStorage.getItem("platform_language") || "en");
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    if (!platformNameEn || !platformNameAr || !platformVodafone) {
      alert("Please fill in all platform details");
      return;
    }

    // Write directly to localStorage
    localStorage.setItem("platform_name_en", platformNameEn);
    localStorage.setItem("platform_name_ar", platformNameAr);
    localStorage.setItem("platform_vodafone", platformVodafone);
    localStorage.setItem("platform_logo", platformLogo);
    localStorage.setItem("platform_language", platformLang);

    // If platform language was modified, reload or update immediately
    const currentLang = localStorage.getItem("preferred_language");
    if (currentLang !== platformLang) {
      localStorage.setItem("preferred_language", platformLang);
    }

    alert("Settings saved successfully! Brand details have been updated across the platform.");
    window.location.reload(); // Refresh to apply brand translations immediately
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure your personal profile and brand identity variables globally.</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* SECTION: Teacher Profile summary (Read-only / verified role) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="text-indigo-600" size={18} />
            <h3 className="font-display font-bold text-slate-800 text-sm">Teacher Credentials</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</span>
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-sm font-semibold">
                {profileName}
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email ID</span>
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-sm font-semibold">
                {profileEmail}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">Passwords and roles are handled securely by system authentication policies and cannot be updated dynamically.</p>
        </div>

        {/* SECTION: Platform Branding Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="text-indigo-600" size={18} />
            <h3 className="font-display font-bold text-slate-800 text-sm">Platform Customization</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Platform Name (English)</label>
              <input
                type="text"
                required
                value={platformNameEn}
                onChange={(e) => setPlatformNameEn(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Platform Name (Arabic)</label>
              <input
                type="text"
                required
                value={platformNameAr}
                onChange={(e) => setPlatformNameAr(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Logo Symbol / Emoji</label>
              <input
                type="text"
                required
                placeholder="🎓"
                value={platformLogo}
                onChange={(e) => setPlatformLogo(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Vodafone Cash Wallet Number</label>
              <div className="flex gap-2">
                <span className="flex items-center justify-center px-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="010XXXXXXXX"
                  value={platformVodafone}
                  onChange={(e) => setPlatformVodafone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Globe size={13} /> Preferred Platform Language
              </label>
              <select
                value={platformLang}
                onChange={(e) => setPlatformLang(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 text-sm"
              >
                <option value="en">English (default)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION: Save Changes */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Save size={16} /> Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
};
