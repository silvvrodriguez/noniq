import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const createBudgetSchema = z.object({
  amount: z.number().positive(),
  month: z.iso.date(),
  categoryId: z.string().uuid(),
});

const updateBudgetSchema = z.object({
  amount: z.number().positive(),
});

router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const parsed = createBudgetSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid budget data",
        errors: parsed.error.flatten(),
      });
    }

    const { amount, month, categoryId } = parsed.data;

    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        userId: req.userId!,
      },
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (category.type !== "EXPENSE") {
      return res.status(400).json({
        message: "Budgets can only be created for expense categories",
      });
    }

    const monthDate = new Date(`${month}T00:00:00.000Z`);

    const normalizedMonth = new Date(
      Date.UTC(
        monthDate.getUTCFullYear(),
        monthDate.getUTCMonth(),
        1
      )
    );

    const existingBudget = await prisma.budget.findUnique({
      where: {
        userId_categoryId_month: {
          userId: req.userId!,
          categoryId,
          month: normalizedMonth,
        },
      },
    });

    if (existingBudget) {
      return res.status(409).json({
        message: "A budget already exists for this category and month",
      });
    }

    const budget = await prisma.budget.create({
      data: {
        amount,
        month: normalizedMonth,
        userId: req.userId!,
        categoryId,
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json({
      budget,
    });
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const budgets = await prisma.budget.findMany({
      where: {
        userId: req.userId!,
      },
      include: {
        category: true,
      },
      orderBy: {
        month: "desc",
      },
    });

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const startOfMonth = budget.month;

        const startOfNextMonth = new Date(
          Date.UTC(
            startOfMonth.getUTCFullYear(),
            startOfMonth.getUTCMonth() + 1,
            1
          )
        );

        const expenses = await prisma.transaction.aggregate({
          where: {
            userId: req.userId!,
            categoryId: budget.categoryId,
            type: "EXPENSE",
            date: {
              gte: startOfMonth,
              lt: startOfNextMonth,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const amount = Number(budget.amount);
        const spent = Number(expenses._sum.amount ?? 0);
        const remaining = amount - spent;

        const percentage =
          amount > 0
            ? Math.round((spent / amount) * 100)
            : 0;

        return {
          id: budget.id,
          amount,
          spent,
          remaining,
          percentage,
          month: budget.month,
          category: {
            id: budget.category.id,
            name: budget.category.name,
          },
        };
      })
    );

    return res.status(200).json({
      budgets: result,
    });
  }
);

router.patch(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const budgetId = req.params.id;

    if (typeof budgetId !== "string") {
      return res.status(400).json({
        message: "Invalid budget ID",
      });
    }

    const parsed = updateBudgetSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid budget data",
        errors: parsed.error.flatten(),
      });
    }

    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: req.userId!,
      },
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    const updatedBudget = await prisma.budget.update({
      where: {
        id: budget.id,
      },
      data: {
        amount: parsed.data.amount,
      },
      include: {
        category: true,
      },
    });

    return res.status(200).json({
      budget: updatedBudget,
    });
  }
);

router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const budgetId = req.params.id;

    if (typeof budgetId !== "string") {
      return res.status(400).json({
        message: "Invalid budget ID",
      });
    }

    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId: req.userId!,
      },
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    await prisma.budget.delete({
      where: {
        id: budget.id,
      },
    });

    return res.status(200).json({
      message: "Budget deleted successfully",
    });
  }
);

export default router;