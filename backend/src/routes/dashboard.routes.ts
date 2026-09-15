import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

router.get(
  "/summary",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const income = await prisma.transaction.aggregate({
      where: {
        userId: req.userId!,
        type: "INCOME",
      },
      _sum: {
        amount: true,
      },
    });

    const expenses = await prisma.transaction.aggregate({
      where: {
        userId: req.userId!,
        type: "EXPENSE",
      },
      _sum: {
        amount: true,
      },
    });

    const totalIncome = Number(income._sum.amount ?? 0);
    const totalExpenses = Number(expenses._sum.amount ?? 0);
    const balance = totalIncome - totalExpenses;

    const now = new Date();

    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );

    const monthlyIncomeResult = await prisma.transaction.aggregate({
      where: {
        userId: req.userId!,
        type: "INCOME",
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const monthlyExpensesResult = await prisma.transaction.aggregate({
      where: {
        userId: req.userId!,
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

    const monthlyIncome = Number(
      monthlyIncomeResult._sum.amount ?? 0
    );

    const monthlyExpenses = Number(
      monthlyExpensesResult._sum.amount ?? 0
    );

    const recentTransactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
    });

    return res.status(200).json({
      message: "Dashboard summary",
      userId: req.userId,
      totalIncome,
      totalExpenses,
      balance,
      monthlyIncome,
      monthlyExpenses,
      recentTransactions,
    });
  }
);

export default router;