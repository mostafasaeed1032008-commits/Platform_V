import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { prisma } from "../config/prisma";

const router = Router();

// Retrieve list of registered students with aggregated statistics (Teacher ONLY)
router.get("/", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentsList = await prisma.user.findMany({
      where: {
        role: "student"
      },
      orderBy: {
        created_at: "desc"
      }
    });

    // Fetch transactions and enrollments and quiz attempts for statistics
    const transactions = await prisma.walletTransaction.findMany();
    const enrollments = await prisma.enrollment.findMany();
    const quizAttempts = await prisma.quizAttempt ? await prisma.quizAttempt.findMany() : [];

    const enrichedStudents = studentsList.map(student => {
      // Calculate balance
      const studentTx = transactions.filter(t => t.student_id === student.id);
      let balance = 0;
      studentTx.forEach(tx => {
        if (tx.type === "topup_approved") {
          balance += tx.points_amount;
        } else if (tx.type === "course_purchase") {
          balance -= tx.points_amount;
        }
      });

      const studentEnrollments = enrollments.filter(e => e.student_id === student.id);
      const studentAttempts = quizAttempts.filter(q => q.student_id === student.id);

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        created_at: student.created_at,
        current_balance: balance,
        courses_count: studentEnrollments.length,
        quiz_attempts_count: studentAttempts.length
      };
    });

    res.json(enrichedStudents);
  } catch (err) {
    next(err);
  }
});

// Retrieve single student's complete historical details (Teacher or own Student)
router.get("/:id", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "";
    const userRole = req.user?.role;

    if (userRole !== "teacher" && userId !== id) {
      res.status(403).json({ error: "Access Denied. You can only view your own records." });
      return;
    }

    const student = await prisma.user.findFirst({
      where: {
        id,
        role: "student"
      }
    });

    if (!student) {
      res.status(404).json({ error: "Student not found" });
      return;
    }

    // Wallet transaction history
    const walletHistory = await prisma.walletTransaction.findMany({
      where: { student_id: id },
      orderBy: { created_at: "desc" }
    });

    // Compute balance
    let balance = 0;
    walletHistory.forEach(tx => {
      if (tx.type === "topup_approved") {
        balance += tx.points_amount;
      } else if (tx.type === "course_purchase") {
        balance -= tx.points_amount;
      }
    });

    // Enrollments with Course details
    const studentEnrollments = await prisma.enrollment.findMany({
      where: { student_id: id },
      orderBy: { created_at: "desc" }
    });

    const courses = await prisma.course.findMany();
    const enrollmentsWithDetails = studentEnrollments.map(e => {
      const course = courses.find(c => c.id === e.course_id);
      return {
        id: e.id,
        course_id: e.course_id,
        course_title: course?.title || "Unknown Course",
        enrolled_at: e.created_at
      };
    });

    // Quiz history / attempts
    let attemptsList: any[] = [];
    try {
      attemptsList = await prisma.quizAttempt.findMany({
        where: { student_id: id },
        orderBy: { created_at: "desc" }
      });
    } catch (e) {
      // QuizAttempt table fallback
    }

    const quizAttemptsParsed = attemptsList.map(a => ({
      ...a,
      answers: typeof a.answers === "string" ? JSON.parse(a.answers) : a.answers
    }));

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        created_at: student.created_at,
        current_balance: balance
      },
      enrollments: enrollmentsWithDetails,
      wallet_history: walletHistory,
      quiz_history: quizAttemptsParsed
    });
  } catch (err) {
    next(err);
  }
});

export default router;
