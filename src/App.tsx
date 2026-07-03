import React from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { getPlatformDirection } from "./locales";

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const dir = getPlatformDirection();

  if (loading) {
    return (
      <div dir={dir} className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div dir={dir} className="min-h-screen bg-slate-50 selection:bg-indigo-500 selection:text-white">
      {!user ? (
        <LoginPage />
      ) : (
        <DashboardLayout>
          <DashboardPage />
        </DashboardLayout>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
