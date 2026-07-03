import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { prisma } from "../config/prisma";
import { GoogleGenAI, Type } from "@google/genai";

const router = Router();

// Retrieve quizzes for a course
router.get("/course/:courseId", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { courseId } = req.params;
    const quizzesList = await prisma.quiz.findMany({
      where: {
        course_id: courseId
      }
    });

    const quizzes = quizzesList.map(q => ({
      ...q,
      questions: JSON.parse(q.questions || "[]")
    }));

    res.json(quizzes);
  } catch (err) {
    next(err);
  }
});

// Retrieve all quizzes (Teacher ONLY)
router.get("/", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const quizzesList = await prisma.quiz.findMany({
      orderBy: { created_at: "desc" }
    });

    const quizzes = quizzesList.map(q => ({
      ...q,
      questions: JSON.parse(q.questions || "[]")
    }));

    res.json(quizzes);
  } catch (err) {
    next(err);
  }
});

// Create Quiz (Teacher ONLY)
router.post("/", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { course_id, title, duration_minutes, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions)) {
      res.status(400).json({ error: "Title and list of questions are required" });
      return;
    }

    // Validate JSON structure
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || typeof q.correct_index !== "number" || !q.explanation) {
        res.status(400).json({ error: "Invalid question schema. Each question must have a 'question', 'options', 'correct_index', and 'explanation'." });
        return;
      }
    }

    const newQuiz = await prisma.quiz.create({
      data: {
        course_id: course_id || null,
        title,
        duration_minutes: Number(duration_minutes) || 30,
        questions: JSON.stringify(questions),
        created_at: new Date().toISOString()
      }
    });

    res.status(201).json({
      ...newQuiz,
      questions: JSON.parse(newQuiz.questions || "[]")
    });
  } catch (err) {
    next(err);
  }
});

// Update Quiz (Teacher ONLY)
router.put("/:id", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { course_id, title, duration_minutes, questions } = req.body;

    if (!title || !questions || !Array.isArray(questions)) {
      res.status(400).json({ error: "Title and list of questions are required" });
      return;
    }

    // Validate JSON structure
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || typeof q.correct_index !== "number" || !q.explanation) {
        res.status(400).json({ error: "Invalid question schema inside questions array." });
        return;
      }
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        course_id: course_id || null,
        title,
        duration_minutes: Number(duration_minutes) || 30,
        questions: JSON.stringify(questions)
      }
    });

    res.json({
      ...updated,
      questions: JSON.parse(updated.questions || "[]")
    });
  } catch (err) {
    next(err);
  }
});

// Delete Quiz (Teacher ONLY)
router.delete("/:id", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.quiz.delete({
      where: { id }
    });
    res.json({ success: true, message: "Quiz deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// AI Quiz Generation using Gemini 3.5 Flash (Teacher ONLY)
router.post("/generate-ai", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { topic, difficulty, question_count, source_text, include_images } = req.body;

    if (!topic || !question_count) {
      res.status(400).json({ error: "Topic and question count are required" });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: "Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets." });
      return;
    }

    // Initialize GoogleGenAI SDK
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const userPrompt = `
Generate a quiz based on the following parameters:
- Topic: ${topic}
- Difficulty: ${difficulty || "Medium"}
- Question Count: ${Number(question_count) || 5}
${source_text ? `- Source Reference Text: "${source_text}"` : ""}
${include_images ? "- Please generate a relevant, brief 2-4 word search term/query in 'image_query' to search Wikimedia Commons for an illustrative image for each question." : ""}

Guidelines:
1. Provide a list of accurate, non-trivial multiple-choice questions.
2. For each question, provide 4 options.
3. Choose the correct option index (0 to 3).
4. Provide a helpful educational explanation for the correct answer.
${source_text ? "5. IMPORTANT: Ground the questions and answers STRICTLY in the provided Source Reference Text." : ""}
    `;

    // Query Gemini 3.5 Flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: "You are an expert curriculum developer. Generate multiple-choice quiz questions in high-quality JSON according to the requested schema. Provide explanations, correct indices, and search queries.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "An array of multiple-choice questions.",
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The multiple choice question text." },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 4 options."
              },
              correct_index: { type: Type.INTEGER, description: "The 0-based index of the correct option (0, 1, 2, or 3)." },
              explanation: { type: Type.STRING, description: "Detailed explanation of why the selected option is correct." },
              image_query: { type: Type.STRING, description: "A 2-4 word search query to find a relevant image on Wikimedia Commons (e.g. 'gravity orbit' or 'mitosis cell')." },
              image_url: { type: Type.STRING, description: "Always leave empty or omit this field initially." }
            },
            required: ["question", "options", "correct_index", "explanation"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response received from GenAI");
    }

    let generatedQuestions = JSON.parse(jsonText.trim());

    // If include_images is requested, execute the Wikimedia lookup for each question in parallel
    if (include_images && Array.isArray(generatedQuestions)) {
      const lookupPromises = generatedQuestions.map(async (q: any) => {
        const query = q.image_query || q.question.split(" ").slice(0, 3).join(" ");
        if (query) {
          try {
            const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&prop=imageinfo&iiprop=url&format=json`;
            const wikiRes = await fetch(url, {
              headers: {
                "User-Agent": "BrandedTeacherPlatform/1.0 (mostafasaeed1032008@gmail.com)"
              }
            });
            if (wikiRes.ok) {
              const wikiData: any = await wikiRes.json();
              if (wikiData && wikiData.query && wikiData.query.pages) {
                const pages = wikiData.query.pages;
                const firstPageId = Object.keys(pages)[0];
                const page = pages[firstPageId];
                if (page && page.imageinfo && page.imageinfo[0] && page.imageinfo[0].url) {
                  q.image_url = page.imageinfo[0].url;
                }
              }
            }
          } catch (err) {
            console.error(`Wikimedia search failed for query "${query}":`, err);
          }
        }
        // Remove temporary search query
        delete q.image_query;
        return q;
      });

      generatedQuestions = await Promise.all(lookupPromises);
    }

    res.json({ questions: generatedQuestions });
  } catch (err: any) {
    console.error("AI quiz generation failed:", err);
    res.status(500).json({ error: err.message || "Failed to generate quiz using AI." });
  }
});

// Retrieve single quiz details (Gated by enrollment for students)
router.get("/:id", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || "";
    const role = req.user?.role;

    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    // Verify enrollment for students if quiz is course-bound
    if (role === "student" && quiz.course_id) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: userId,
          course_id: quiz.course_id
        }
      });
      if (!enrollment) {
        res.status(403).json({ error: "Access denied. You must be enrolled in the course to take this quiz." });
        return;
      }
    }

    res.json({
      ...quiz,
      questions: JSON.parse(quiz.questions || "[]")
    });
  } catch (err) {
    next(err);
  }
});

// Submit Quiz Attempt (Student ONLY)
router.post("/:id/attempt", authenticateJWT, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const studentId = req.user?.id || "";
    const { answers } = req.body; // array of chosen indices

    if (!Array.isArray(answers)) {
      res.status(400).json({ error: "Answers array is required" });
      return;
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id }
    });

    if (!quiz) {
      res.status(404).json({ error: "Quiz not found" });
      return;
    }

    // Verify enrollment if course-bound
    if (quiz.course_id) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          student_id: studentId,
          course_id: quiz.course_id
        }
      });
      if (!enrollment) {
        res.status(403).json({ error: "You are not enrolled in the course associated with this quiz" });
        return;
      }
    }

    const quizQuestions = JSON.parse(quiz.questions || "[]");
    let score = 0;

    const snapshot = quizQuestions.map((q: any, index: number) => {
      const studentAnswer = answers[index] !== undefined ? answers[index] : -1;
      const isCorrect = studentAnswer === q.correct_index;
      if (isCorrect) {
        score++;
      }
      return {
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation || "",
        image_url: q.image_url || null,
        selected_index: studentAnswer,
        is_correct: isCorrect
      };
    });

    const newAttempt = await prisma.quizAttempt.create({
      data: {
        student_id: studentId,
        student_name: req.user?.name || "",
        student_email: req.user?.email || "",
        quiz_id: id,
        quiz_title: quiz.title,
        course_id: quiz.course_id,
        score,
        total_questions: quizQuestions.length,
        answers: JSON.stringify(snapshot),
        created_at: new Date().toISOString()
      }
    });

    res.status(201).json({
      success: true,
      attempt: {
        ...newAttempt,
        answers: snapshot
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
