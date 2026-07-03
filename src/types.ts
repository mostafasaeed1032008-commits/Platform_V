export type UserRole = "teacher" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url: string;
  price_points: number;
  created_at: string;
}

export interface AttachedFile {
  name: string;
  url: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  video_provider: "vdocipher" | "url";
  video_id_or_url: string;
  attached_files: AttachedFile[];
  notes?: string;
  created_at: string;
}

export interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  image_url?: string;
}

export interface Quiz {
  id: string;
  course_id: string | null; // can belong to a course or stand alone
  title: string;
  duration_minutes: number;
  questions: Question[];
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
}

export type WalletTransactionType = "topup_pending" | "topup_approved" | "topup_rejected" | "course_purchase";

export interface WalletTransaction {
  id: string;
  student_id: string;
  type: WalletTransactionType;
  points_amount: number;
  reference_note: string; // student-provided tx reference or screenshot info
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
}

export interface QuizAttempt {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  quiz_id: string;
  quiz_title: string;
  course_id: string | null;
  course_title?: string;
  score: number; // e.g., number of correct answers
  total_questions: number;
  answers: number[]; // chosen indices
  created_at: string;
}

export interface WalletBalance {
  current_balance: number;
  transactions: WalletTransaction[];
}

export interface AnalyticsSummary {
  total_students: number;
  total_revenue: number;
  most_enrolled_courses: { course_title: string; enroll_count: number }[];
}
