import { Router } from "express";
import authRouter from "./auth";
import coursesRouter from "./courses";
import lessonsRouter from "./lessons";
import quizzesRouter from "./quizzes";
import walletRouter from "./wallet";
import studentsRouter from "./students";
import analyticsRouter from "./analytics";

const router = Router();

// Mount endpoints under dedicated namespaces
router.use("/auth", authRouter);
router.use("/courses", coursesRouter);
router.use("/lessons", lessonsRouter);
router.use("/quizzes", quizzesRouter);
router.use("/wallet", walletRouter);
router.use("/students", studentsRouter);
router.use("/analytics", analyticsRouter);

export default router;
