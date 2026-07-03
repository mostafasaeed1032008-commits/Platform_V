import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { rateLimiter } from "../middleware/rateLimiter";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "platform-super-secret-key-123!";

// Auto seed teacher account function
export async function seedTeacherAccount() {
  try {
    const existing = await prisma.user.findFirst({
      where: { role: "teacher" }
    });
    if (!existing) {
      console.log("Seeding default teacher account...");
      const hashedPassword = await bcrypt.hash("teacher123", 10);
      await prisma.user.create({
        data: {
          name: "Teacher Account",
          email: "teacher@platform.com",
          password_hash: hashedPassword,
          role: "teacher",
          created_at: new Date().toISOString()
        }
      });
      console.log("Default teacher account successfully seeded!");
    }
  } catch (err) {
    console.error("Error seeding teacher account:", err);
  }
}

// Student signup rate limit: max 5 requests per 15 minutes
const signupLimiter = rateLimiter(5, 15 * 60 * 1000);
// Login rate limit: max 10 requests per 5 minutes
const loginLimiter = rateLimiter(10, 5 * 60 * 1000);

// Student registration (Teacher signup is disabled)
router.post("/signup", signupLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: "Missing required fields: name, email, password" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long" });
      return;
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (existing) {
      res.status(400).json({ error: "Email address is already registered" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password_hash: hashedPassword,
        role: "student",
        created_at: new Date().toISOString()
      }
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post("/login", loginLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Missing email or password" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
});

// Fetch current user self details
router.get("/me", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthenticated" });
      return;
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!dbUser) {
      res.status(401).json({ error: "User not found in database. Please log in again." });
      return;
    }
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
});

// Update current user profile / password
router.put("/profile", authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id || "";
    const { name, password } = req.body;

    const dataToUpdate: any = {};
    if (name) {
      dataToUpdate.name = name;
    }
    if (password) {
      if (password.length < 6) {
        res.status(400).json({ error: "Password must be at least 6 characters long" });
        return;
      }
      dataToUpdate.password_hash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(dataToUpdate).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate
    });

    res.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
