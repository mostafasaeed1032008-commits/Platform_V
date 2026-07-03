import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { prisma } from "../config/prisma";
import { StorageProvider } from "../services/storage";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Retrieve all courses
router.get("/", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const courses = await prisma.course.findMany({
      orderBy: { created_at: "desc" }
    });

    // For students, fetch their enrollments so we can return owned/locked status badges
    const enrollments = userId && role === "student"
      ? await prisma.enrollment.findMany({ where: { student_id: userId } })
      : [];

    const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));

    // Enrich courses with enrollment status and lesson/quiz counts
    const enriched = await Promise.all(courses.map(async (course) => {
      const lessonsCount = await prisma.lesson.count({ where: { course_id: course.id } });
      const quizzesCount = await prisma.quiz.count({ where: { course_id: course.id } });
      return {
        ...course,
        enrolled: role === "teacher" || enrolledCourseIds.has(course.id),
        lessons_count: lessonsCount,
        quizzes_count: quizzesCount
      };
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Retrieve courses the current student has enrolled in (Student ONLY)
router.get("/my-courses", authenticateJWT, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = req.user?.id || "";

    const enrollments = await prisma.enrollment.findMany({
      where: { student_id: studentId }
    });

    const courseIds = enrollments.map(e => e.course_id);

    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds } },
      orderBy: { created_at: "desc" }
    });

    // Enrich with statistics
    const enriched = await Promise.all(courses.map(async (course) => {
      const lessonsCount = await prisma.lesson.count({ where: { course_id: course.id } });
      const quizzesCount = await prisma.quiz.count({ where: { course_id: course.id } });

      // Fetch lessons to get their IDs
      const lessons = await prisma.lesson.findMany({
        where: { course_id: course.id },
        select: { id: true }
      });
      const lessonIds = lessons.map(l => l.id);

      // Count completed progress items
      const completedCount = await prisma.lessonProgress.count({
        where: {
          student_id: studentId,
          lesson_id: { in: lessonIds }
        }
      });

      return {
        ...course,
        enrolled: true,
        lessons_count: lessonsCount,
        quizzes_count: quizzesCount,
        completed_lessons_count: completedCount
      };
    }));

    res.json(enriched);
  } catch (err) {
    next(err);
  }
});

// Retrieve single course
router.get("/:id", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    const course = await prisma.course.findUnique({
      where: { id }
    });
    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    let enrolled = false;
    if (role === "teacher") {
      enrolled = true;
    } else if (userId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: userId,
          course_id: id
        }
      });
      enrolled = !!enrollment;
    }

    const lessonsCount = await prisma.lesson.count({ where: { course_id: id } });
    const quizzesCount = await prisma.quiz.count({ where: { course_id: id } });

    res.json({
      ...course,
      enrolled,
      lessons_count: lessonsCount,
      quizzes_count: quizzesCount
    });
  } catch (err) {
    next(err);
  }
});

// Purchase course with wallet points (Student ONLY)
router.post("/:id/purchase", authenticateJWT, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id || "";

    // Fetch the course to purchase
    const course = await prisma.course.findUnique({
      where: { id }
    });

    if (!course) {
      res.status(404).json({ error: "Course not found" });
      return;
    }

    // Check if student is already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        course_id: id
      }
    });

    if (existingEnrollment) {
      res.status(400).json({ error: "You are already enrolled in this course" });
      return;
    }

    // Run within a Prisma transaction to guarantee atomic point deduction and enrollment creation
    await prisma.$transaction(async (tx) => {
      // 1. Calculate current balance
      const transactions = await tx.walletTransaction.findMany({
        where: { student_id: studentId }
      });

      let currentBalance = 0;
      transactions.forEach((t) => {
        if (t.type === "topup_approved") {
          currentBalance += t.points_amount;
        } else if (t.type === "course_purchase") {
          currentBalance -= t.points_amount;
        }
      });

      if (currentBalance < course.price_points) {
        throw new Error("Insufficient points balance. Please top up your wallet first.");
      }

      // 2. Create the course purchase transaction
      await tx.walletTransaction.create({
        data: {
          student_id: studentId,
          student_name: req.user?.name || "",
          student_email: req.user?.email || "",
          type: "course_purchase",
          points_amount: course.price_points,
          reference_note: `Purchase of course: ${course.title}`,
          created_at: new Date().toISOString(),
          approved_at: new Date().toISOString()
        }
      });

      // 3. Create the enrollment
      await tx.enrollment.create({
        data: {
          student_id: studentId,
          course_id: id,
          created_at: new Date().toISOString()
        }
      });
    });

    res.json({ success: true, message: "Course purchased and unlocked successfully!" });
  } catch (err: any) {
    if (err.message && err.message.includes("Insufficient points balance")) {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

// Create course (Teacher ONLY)
router.post("/", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, description, cover_image_url, price_points } = req.body;
    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    const newCourse = await prisma.course.create({
      data: {
        title,
        description,
        cover_image_url: cover_image_url || "",
        price_points: Number(price_points) || 0,
        created_at: new Date().toISOString(),
        teacher_id: req.user?.id || ""
      }
    });

    res.status(201).json(newCourse);
  } catch (err) {
    next(err);
  }
});

// Update course (Teacher ONLY)
router.put("/:id", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, cover_image_url, price_points } = req.body;

    if (!title || !description) {
      res.status(400).json({ error: "Title and description are required" });
      return;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        title,
        description,
        cover_image_url,
        price_points: Number(price_points) || 0
      }
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// Delete course (Teacher ONLY)
router.delete("/:id", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // First delete associated lessons and quizzes or handle properly
    await prisma.lesson.deleteMany({ where: { course_id: id } });
    await prisma.quiz.deleteMany({ where: { course_id: id } });

    await prisma.course.delete({
      where: { id }
    });

    res.json({ success: true, message: "Course deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// Upload Cover Image (Teacher ONLY)
router.post("/upload-cover", authenticateJWT, requireRole("teacher"), upload.single("cover"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    // Save public file using StorageProvider
    const fileUrl = await StorageProvider.saveFile(req.file, true);
    res.json({ url: fileUrl });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
});

export default router;
