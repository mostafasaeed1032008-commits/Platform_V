import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { prisma } from "../config/prisma";

const router = Router();

// Retrieve analytics summary (Teacher ONLY)
router.get("/summary", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Total Students count
    const totalStudents = await prisma.user.count({
      where: { role: "student" }
    });

    // Total Courses
    const totalCourses = await prisma.course.count();

    // Total Lessons
    const totalLessons = await prisma.lesson.count();

    // Total Quizzes
    const totalQuizzes = await prisma.quiz.count();

    // Approved Wallet Top-ups count and amount
    const approvedTx = await prisma.walletTransaction.findMany({
      where: { type: "topup_approved" }
    });

    const approvedTopupsCount = approvedTx.length;
    let totalRevenue = 0;
    approvedTx.forEach(tx => {
      totalRevenue += Number(tx.points_amount) || 0;
    });

    // Recent Registrations (limit 5)
    const recentStudents = await prisma.user.findMany({
      where: { role: "student" },
      orderBy: { created_at: "desc" },
      take: 5
    });

    // Recent purchases (limit 5)
    const recentPurchases = await prisma.walletTransaction.findMany({
      where: { type: "course_purchase" },
      orderBy: { created_at: "desc" },
      take: 5
    });

    // Most Enrolled Courses calculation
    const enrollments = await prisma.enrollment.findMany();
    const courses = await prisma.course.findMany();

    const enrollmentCountsByCourse: { [courseId: string]: number } = {};
    enrollments.forEach(e => {
      enrollmentCountsByCourse[e.course_id] = (enrollmentCountsByCourse[e.course_id] || 0) + 1;
    });

    const mostEnrolledCourses = courses.map(c => ({
      id: c.id,
      title: c.title,
      price_points: c.price_points,
      enroll_count: enrollmentCountsByCourse[c.id] || 0
    })).sort((a, b) => b.enroll_count - a.enroll_count).slice(0, 5);

    // Deep Engagement Metrics
    const lessons = await prisma.lesson.findMany({ select: { id: true, course_id: true } });
    const quizzes = await prisma.quiz.findMany({ select: { id: true, course_id: true } });
    const lessonProgress = await prisma.lessonProgress.findMany({ select: { id: true, lesson_id: true, completed_at: true } });
    const quizAttempts = await prisma.quizAttempt.findMany({ select: { id: true, course_id: true, quiz_id: true, created_at: true } });

    const courseEngagement = courses.map(c => {
      const courseLessons = lessons.filter(l => l.course_id === c.id);
      const courseQuizzes = quizzes.filter(q => q.course_id === c.id);
      const courseEnrollments = enrollments.filter(e => e.course_id === c.id);
      
      const lessonIds = courseLessons.map(l => l.id);
      const quizIds = courseQuizzes.map(q => q.id);
      
      const completedLessonsCount = lessonProgress.filter(lp => lessonIds.includes(lp.lesson_id)).length;
      const quizAttemptsCount = quizAttempts.filter(qa => qa.course_id === c.id || (qa.quiz_id && quizIds.includes(qa.quiz_id))).length;
      
      return {
        id: c.id,
        title: c.title,
        enroll_count: courseEnrollments.length,
        completed_lessons: completedLessonsCount,
        quiz_attempts: quizAttemptsCount,
        engagement_score: (courseEnrollments.length * 10) + (completedLessonsCount * 5) + (quizAttemptsCount * 8)
      };
    }).sort((a, b) => b.engagement_score - a.engagement_score);

    // Periodic Engagement Trend (Last 6 Months)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const enrollmentTrendMap: { [month: string]: number } = {};
    const completionsTrendMap: { [month: string]: number } = {};
    const quizTrendMap: { [month: string]: number } = {};
    
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); // YYYY-MM
      const displayStr = months[d.getMonth()] + " " + d.getFullYear().toString().slice(-2);
      enrollmentTrendMap[displayStr] = 0;
      completionsTrendMap[displayStr] = 0;
      quizTrendMap[displayStr] = 0;
    }

    enrollments.forEach(e => {
      try {
        const d = new Date(e.created_at);
        const displayStr = months[d.getMonth()] + " " + d.getFullYear().toString().slice(-2);
        if (enrollmentTrendMap[displayStr] !== undefined) {
          enrollmentTrendMap[displayStr]++;
        }
      } catch (err) {}
    });

    lessonProgress.forEach(lp => {
      try {
        const d = new Date(lp.completed_at);
        const displayStr = months[d.getMonth()] + " " + d.getFullYear().toString().slice(-2);
        if (completionsTrendMap[displayStr] !== undefined) {
          completionsTrendMap[displayStr]++;
        }
      } catch (err) {}
    });

    quizAttempts.forEach(qa => {
      try {
        const d = new Date(qa.created_at);
        const displayStr = months[d.getMonth()] + " " + d.getFullYear().toString().slice(-2);
        if (quizTrendMap[displayStr] !== undefined) {
          quizTrendMap[displayStr]++;
        }
      } catch (err) {}
    });

    const engagementTrend = Object.keys(enrollmentTrendMap).map(displayStr => ({
      name: displayStr,
      enrollments: enrollmentTrendMap[displayStr],
      lesson_completions: completionsTrendMap[displayStr],
      quiz_attempts: quizTrendMap[displayStr]
    }));

    res.json({
      total_students: totalStudents,
      total_courses: totalCourses,
      total_lessons: totalLessons,
      total_quizzes: totalQuizzes,
      approved_topups_count: approvedTopupsCount,
      total_revenue: totalRevenue,
      most_enrolled_courses: mostEnrolledCourses,
      course_engagement: courseEngagement,
      engagement_trend: engagementTrend,
      recent_registrations: recentStudents.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        created_at: s.created_at
      })),
      recent_purchases: recentPurchases.map(p => ({
        id: p.id,
        student_id: p.student_id,
        student_name: p.student_name,
        student_email: p.student_email,
        points_amount: p.points_amount,
        course_title: p.reference_note, // In course_purchase, reference_note stores course title
        created_at: p.created_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
