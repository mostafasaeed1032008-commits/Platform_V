import { Router, Response, NextFunction } from "express";
import { authenticateJWT, AuthenticatedRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { prisma } from "../config/prisma";

const router = Router();

// Retrieve student points balance & historical ledgers (Student ONLY)
router.get("/balance", authenticateJWT, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = req.user?.id || "";
    
    // Fetch approved/deducted ledger history
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        student_id: studentId
      },
      orderBy: {
        created_at: "desc"
      }
    });

    // Compute balance from approved transactions
    let balance = 0;
    transactions.forEach((tx) => {
      if (tx.type === "topup_approved") {
        balance += tx.points_amount;
      } else if (tx.type === "course_purchase") {
        balance -= tx.points_amount;
      }
    });

    res.json({
      current_balance: balance,
      transactions
    });
  } catch (err) {
    next(err);
  }
});

// Submit manual topup transaction request (Student ONLY)
router.post("/topup", authenticateJWT, requireRole("student"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const studentId = req.user?.id || "";
    const { points, reference_note } = req.body;

    if (!points || !reference_note) {
      res.status(400).json({ error: "Points and transaction reference notes are required" });
      return;
    }

    const newTx = await prisma.walletTransaction.create({
      data: {
        student_id: studentId,
        student_name: req.user?.name || "",
        student_email: req.user?.email || "",
        type: "topup_pending",
        points_amount: Number(points),
        reference_note,
        created_at: new Date().toISOString()
      }
    });

    res.status(201).json({ success: true, transaction: newTx });
  } catch (err) {
    next(err);
  }
});

// Retrieve pending approvals (Teacher ONLY)
router.get("/approvals", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const approvals = await prisma.walletTransaction.findMany({
      where: {
        type: "topup_pending"
      },
      orderBy: {
        created_at: "asc"
      }
    });
    res.json(approvals);
  } catch (err) {
    next(err);
  }
});

// Approve Transaction (Teacher ONLY)
router.post("/approvals/:id/approve", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const tx = await prisma.walletTransaction.findUnique({
      where: { id }
    });

    if (!tx) {
      res.status(404).json({ error: "Transaction ledger entry not found" });
      return;
    }

    if (tx.type !== "topup_pending") {
      res.status(400).json({ error: "Transaction is not in a pending review state" });
      return;
    }

    await prisma.walletTransaction.update({
      where: { id },
      data: {
        type: "topup_approved",
        approved_at: new Date().toISOString(),
        approved_by: req.user?.id || ""
      }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Reject Transaction (Teacher ONLY)
router.post("/approvals/:id/reject", authenticateJWT, requireRole("teacher"), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const tx = await prisma.walletTransaction.findUnique({
      where: { id }
    });

    if (!tx) {
      res.status(404).json({ error: "Transaction ledger entry not found" });
      return;
    }

    if (tx.type !== "topup_pending") {
      res.status(400).json({ error: "Transaction is not in a pending review state" });
      return;
    }

    await prisma.walletTransaction.update({
      where: { id },
      data: {
        type: "topup_rejected",
        rejection_reason: reason || "No reason specified",
        approved_at: new Date().toISOString(),
        approved_by: req.user?.id || ""
      }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
