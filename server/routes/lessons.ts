import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { prisma } from "../config/prisma";
import { StorageProvider, getProtectedVideoPath } from "../services/storage";
import multer from "multer";
import fs from "fs";
import path from "path";

const router = Router();
const tmpDir = path.join(process.cwd(), "storage", "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}
const upload = multer({ dest: tmpDir });

// Retrieve lessons for a course (Verify enrollment or role)
router.get("/course/:courseId", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    let enrolled = true;
    if (role !== "teacher") {
      // Confirm student enrollment
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: userId,
          course_id: courseId
        }
      });

      if (!enrollment) {
        enrolled = false;
      }
    }

    const lessonsList = await prisma.lesson.findMany({
      where: {
        course_id: courseId
      },
      orderBy: {
        order_index: "asc"
      }
    });

    const lessons = lessonsList.map(l => {
      if (enrolled) {
        return {
          ...l,
          attached_files: l.attached_files ? JSON.parse(l.attached_files) : [],
          is_locked: false
        };
      } else {
        // Redact sensitive details for non-enrolled students
        return {
          id: l.id,
          course_id: l.course_id,
          title: l.title,
          order_index: l.order_index,
          created_at: l.created_at,
          video_provider: "",
          video_id_or_url: "",
          notes: null,
          attached_files: [],
          is_locked: true
        };
      }
    });

    res.json(lessons);
  } catch (err) {
    next(err);
  }
});

// Add lesson (Teacher ONLY)
router.post("/course/:courseId", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const { title, video_provider, video_id_or_url, notes, attached_files, order_index } = req.body;

    if (!title) {
      res.status(400).json({ error: "Lesson title is required" });
      return;
    }

    const newLesson = await prisma.lesson.create({
      data: {
        course_id: courseId,
        title,
        video_provider: video_provider || "url",
        video_id_or_url: video_id_or_url || "",
        notes: notes || "",
        attached_files: attached_files ? JSON.stringify(attached_files) : "[]",
        order_index: Number(order_index) || 0,
        created_at: new Date().toISOString()
      }
    });

    res.status(201).json({
      ...newLesson,
      attached_files: JSON.parse(newLesson.attached_files || "[]")
    });
  } catch (err) {
    next(err);
  }
});

// Edit lesson (Teacher ONLY)
router.put("/:id", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, video_provider, video_id_or_url, notes, attached_files, order_index } = req.body;

    if (!title) {
      res.status(400).json({ error: "Lesson title is required" });
      return;
    }

    const updated = await prisma.lesson.update({
      where: { id },
      data: {
        title,
        video_provider,
        video_id_or_url,
        notes,
        attached_files: attached_files ? JSON.stringify(attached_files) : "[]",
        order_index: Number(order_index) || 0
      }
    });

    res.json({
      ...updated,
      attached_files: JSON.parse(updated.attached_files || "[]")
    });
  } catch (err) {
    next(err);
  }
});

// Delete lesson (Teacher ONLY)
router.delete("/:id", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const lesson = await prisma.lesson.findUnique({ where: { id } });

    if (lesson && lesson.video_provider === "local") {
      try {
        const meta = JSON.parse(lesson.video_id_or_url);
        if (meta && meta.path) {
          await StorageProvider.deleteFile(meta.path);
        }
      } catch (e) {
        // Not JSON or delete failed, ignore
      }
    }

    await prisma.lesson.delete({ where: { id } });
    res.json({ success: true, message: "Lesson deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// Reorder lessons in bulk (Teacher ONLY)
router.post("/reorder", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lessons } = req.body; // array of { id: string, order_index: number }
    if (!Array.isArray(lessons)) {
      res.status(400).json({ error: "Invalid lessons order format" });
      return;
    }

    await Promise.all(
      lessons.map((lesson: any) =>
        prisma.lesson.update({
          where: { id: lesson.id },
          data: { order_index: Number(lesson.order_index) }
        })
      )
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Video Upload (Teacher ONLY)
router.post("/upload-video", authenticateJWT, requireRole("teacher"), upload.single("video"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No video file provided" });
      return;
    }

    // Size limit check
    const maxMB = Number(process.env.MAX_VIDEO_SIZE_MB) || 500;
    const maxBytes = maxMB * 1024 * 1024;
    if (req.file.size > maxBytes) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      res.status(400).json({ error: `File exceeds maximum upload size limit of ${maxMB}MB` });
      return;
    }

    // Verify format (support both mime type and file extension checks for robust compatibility)
    const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/mpeg", "video/avi", "video/x-msvideo", "video/x-ms-wmv", "video/3gpp"];
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".m4v", ".mpg", ".mpeg", ".wmv", ".3gp"];

    const isAllowedMime = allowedMimeTypes.includes(req.file.mimetype);
    const isAllowedExt = allowedExtensions.includes(ext);

    if (!isAllowedMime && !isAllowedExt) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      res.status(400).json({ error: "Unsupported video format. Allowed formats: MP4, WebM, MOV, MKV, AVI, M4V." });
      return;
    }

    // Save protected video
    const uniqueFileName = await StorageProvider.saveFile(req.file, false);

    // Return metadata
    const metadata = {
      provider: "local",
      path: uniqueFileName,
      original_filename: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      created_at: new Date().toISOString()
    };

    res.json(metadata);
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
});

// Downloadable File Attachment Upload (Teacher ONLY)
router.post("/upload-file", authenticateJWT, requireRole("teacher"), upload.single("file"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    // Save public file so student can click and download
    const fileUrl = await StorageProvider.saveFile(req.file, true);

    res.json({
      name: req.file.originalname,
      url: fileUrl
    });
  } catch (err) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    next(err);
  }
});

// Secure video stream with playback controls, seeking & authorization (Authenticated student/teacher ONLY)
router.get("/video/stream/:lessonId", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.id || "";
    const role = req.user?.role;

    // Fetch lesson
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Validate access
    if (role !== "teacher") {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: userId,
          course_id: lesson.course_id
        }
      });

      if (!enrollment) {
        res.status(403).json({ error: "Unauthorized access. Student is not enrolled in this course." });
        return;
      }
    }

    // If video provider is url, redirect or pipe
    if (lesson.video_provider !== "local") {
      res.redirect(lesson.video_id_or_url);
      return;
    }

    // Read metadata
    let meta: any = null;
    try {
      meta = JSON.parse(lesson.video_id_or_url);
    } catch (e) {
      // Compatibility fallback: if not JSON, assume raw filename
      meta = { path: lesson.video_id_or_url, mime_type: "video/mp4" };
    }

    const videoPath = getProtectedVideoPath(meta.path);

    if (!fs.existsSync(videoPath)) {
      res.status(404).json({ error: "Video file not found on server" });
      return;
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const mimeType = meta.mime_type || "video/mp4";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send("Requested range not satisfiable\n" + start + " >= " + fileSize);
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": mimeType,
      };

      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        "Content-Length": fileSize,
        "Content-Type": mimeType,
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
});

// Get progress for a student in a course
router.get("/course/:courseId/progress", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const studentId = req.user?.id || "";

    // Find all lessons for the course
    const lessons = await prisma.lesson.findMany({
      where: { course_id: courseId },
      select: { id: true }
    });

    const lessonIds = lessons.map(l => l.id);

    // Get completed progress records
    const progressList = await prisma.lessonProgress.findMany({
      where: {
        student_id: studentId,
        lesson_id: { in: lessonIds }
      }
    });

    res.json({
      completed_lesson_ids: progressList.map(p => p.lesson_id)
    });
  } catch (err) {
    next(err);
  }
});

// Toggle/set progress for a specific lesson
router.post("/:lessonId/toggle-progress", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { lessonId } = req.params;
    const studentId = req.user?.id || "";

    // Find lesson to confirm it exists and get its course ID
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId }
    });

    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }

    // Check enrollment
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        student_id: studentId,
        course_id: lesson.course_id
      }
    });

    if (!enrollment) {
      res.status(403).json({ error: "Access Denied. You are not enrolled in this course." });
      return;
    }

    // Check if progress already exists
    const existing = await prisma.lessonProgress.findUnique({
      where: {
        student_id_lesson_id: {
          student_id: studentId,
          lesson_id: lessonId
        }
      }
    });

    let completed = false;
    if (existing) {
      // Remove progress
      await prisma.lessonProgress.delete({
        where: {
          student_id_lesson_id: {
            student_id: studentId,
            lesson_id: lessonId
          }
        }
      });
      completed = false;
    } else {
      // Add progress
      await prisma.lessonProgress.create({
        data: {
          student_id: studentId,
          lesson_id: lessonId,
          completed_at: new Date().toISOString()
        }
      });
      completed = true;
    }

    // After toggle, check if ALL lessons in this course are completed
    const allCourseLessons = await prisma.lesson.findMany({
      where: { course_id: lesson.course_id },
      select: { id: true }
    });

    const allLessonIds = allCourseLessons.map(l => l.id);

    const completedProgressList = await prisma.lessonProgress.findMany({
      where: {
        student_id: studentId,
        lesson_id: { in: allLessonIds }
      }
    });

    const isAllCompleted = allLessonIds.length > 0 && completedProgressList.length === allLessonIds.length;
    let certificate = null;

    if (isAllCompleted) {
      // Check if certificate already exists
      const existingCert = await prisma.certificate.findFirst({
        where: {
          student_id: studentId,
          course_id: lesson.course_id
        }
      });

      if (!existingCert) {
        // Generate new certificate with unique, human-typeable verification code
        const randStr1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const randStr2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const certificate_code = `CERT-${randStr1}-${randStr2}`;

        certificate = await prisma.certificate.create({
          data: {
            student_id: studentId,
            course_id: lesson.course_id,
            issued_at: new Date().toISOString(),
            certificate_code
          }
        });
      } else {
        certificate = existingCert;
      }
    }

    res.json({
      success: true,
      completed,
      course_id: lesson.course_id,
      all_completed: isAllCompleted,
      certificate
    });
  } catch (err) {
    next(err);
  }
});

// Retrieve certificate for a course
router.get("/course/:courseId/certificate", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const studentId = req.user?.id || "";

    const certificate = await prisma.certificate.findFirst({
      where: {
        student_id: studentId,
        course_id: courseId
      }
    });

    res.json(certificate);
  } catch (err) {
    next(err);
  }
});

export default router;
