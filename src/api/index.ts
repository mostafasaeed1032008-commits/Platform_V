import { User, Course, Lesson, Quiz, WalletBalance, WalletTransaction, AnalyticsSummary } from "../types";

const getHeaders = (token: string | null) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  auth: {
    login: async (email: string, password: string): Promise<{ token: string; user: User }> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: getHeaders(null),
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      return data;
    },

    signup: async (name: string, email: string, password: string): Promise<{ token: string; user: User }> => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: getHeaders(null),
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      return data;
    },

    me: async (token: string): Promise<{ user: User }> => {
      const res = await fetch("/api/auth/me", {
        headers: getHeaders(token),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Session validation failed");
      return data;
    },
  },

  courses: {
    list: async (token: string): Promise<Course[]> => {
      const res = await fetch("/api/courses", { headers: getHeaders(token) });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },

    get: async (token: string, id: string): Promise<Course & { lessons: Lesson[]; quizzes: Quiz[] }> => {
      const res = await fetch(`/api/courses/${id}`, { headers: getHeaders(token) });
      if (!res.ok) throw new Error("Failed to fetch course details");
      return res.json();
    },
  },

  wallet: {
    getBalance: async (token: string): Promise<WalletBalance> => {
      const res = await fetch("/api/wallet/balance", { headers: getHeaders(token) });
      if (!res.ok) throw new Error("Failed to fetch wallet balance");
      return res.json();
    },

    requestTopup: async (token: string, points: number, refNote: string): Promise<{ success: boolean; transaction: WalletTransaction }> => {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify({ points, reference_note: refNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Topup request failed");
      return data;
    },

    getPendingApprovals: async (token: string): Promise<WalletTransaction[]> => {
      const res = await fetch("/api/wallet/approvals", { headers: getHeaders(token) });
      if (!res.ok) throw new Error("Failed to fetch pending approvals");
      return res.json();
    },

    approveTransaction: async (token: string, id: string): Promise<{ success: boolean }> => {
      const res = await fetch(`/api/wallet/approvals/${id}/approve`, {
        method: "POST",
        headers: getHeaders(token),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approval failed");
      return data;
    },

    rejectTransaction: async (token: string, id: string, reason: string): Promise<{ success: boolean }> => {
      const res = await fetch(`/api/wallet/approvals/${id}/reject`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Rejection failed");
      return data;
    },
  },

  analytics: {
    getSummary: async (token: string): Promise<AnalyticsSummary> => {
      const res = await fetch("/api/analytics/summary", { headers: getHeaders(token) });
      if (!res.ok) throw new Error("Failed to fetch analytics summary");
      return res.json();
    },
  },
};
