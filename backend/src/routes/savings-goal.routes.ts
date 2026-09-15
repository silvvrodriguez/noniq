import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const createSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(100),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.iso.date().optional(),
});

const updateSavingsGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  targetAmount: z.number().positive().optional(),
  currentAmount: z.number().min(0).optional(),
  targetDate: z.iso.date().nullable().optional(),
});

router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const parsed = createSavingsGoalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid savings goal data",
        errors: parsed.error.flatten(),
      });
    }

    const {
      name,
      targetAmount,
      currentAmount = 0,
      targetDate,
    } = parsed.data;

    const savingsGoal = await prisma.savingsGoal.create({
      data: {
        name,
        targetAmount,
        currentAmount,
        targetDate: targetDate
          ? new Date(`${targetDate}T00:00:00.000Z`)
          : null,
        userId: req.userId!,
      },
    });

    return res.status(201).json({
      savingsGoal,
    });
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const savingsGoals = await prisma.savingsGoal.findMany({
      where: {
        userId: req.userId!,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const result = savingsGoals.map((goal) => {
      const targetAmount = Number(goal.targetAmount);
      const currentAmount = Number(goal.currentAmount);

      const remaining = Math.max(
        targetAmount - currentAmount,
        0
      );

      const percentage =
        targetAmount > 0
          ? Math.round((currentAmount / targetAmount) * 100)
          : 0;

      return {
        id: goal.id,
        name: goal.name,
        targetAmount,
        currentAmount,
        remaining,
        percentage,
        targetDate: goal.targetDate,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      };
    });

    return res.status(200).json({
      savingsGoals: result,
    });
  }
);

router.patch(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const goalId = req.params.id;

    if (typeof goalId !== "string") {
      return res.status(400).json({
        message: "Invalid savings goal ID",
      });
    }

    const parsed = updateSavingsGoalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid savings goal data",
        errors: parsed.error.flatten(),
      });
    }

    const savingsGoal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        userId: req.userId!,
      },
    });

    if (!savingsGoal) {
      return res.status(404).json({
        message: "Savings goal not found",
      });
    }

    const {
      name,
      targetAmount,
      currentAmount,
      targetDate,
    } = parsed.data;

    const updatedSavingsGoal = await prisma.savingsGoal.update({
      where: {
        id: savingsGoal.id,
      },
      data: {
        ...(name !== undefined && {
          name,
        }),
        ...(targetAmount !== undefined && {
          targetAmount,
        }),
        ...(currentAmount !== undefined && {
          currentAmount,
        }),
        ...(targetDate !== undefined && {
          targetDate:
            targetDate === null
              ? null
              : new Date(`${targetDate}T00:00:00.000Z`),
        }),
      },
    });

    return res.status(200).json({
      savingsGoal: updatedSavingsGoal,
    });
  }
);

router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const goalId = req.params.id;

    if (typeof goalId !== "string") {
      return res.status(400).json({
        message: "Invalid savings goal ID",
      });
    }

    const savingsGoal = await prisma.savingsGoal.findFirst({
      where: {
        id: goalId,
        userId: req.userId!,
      },
    });

    if (!savingsGoal) {
      return res.status(404).json({
        message: "Savings goal not found",
      });
    }

    await prisma.savingsGoal.delete({
      where: {
        id: savingsGoal.id,
      },
    });

    return res.status(200).json({
      message: "Savings goal deleted successfully",
    });
  }
);

export default router;