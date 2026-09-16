import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const dateSchema = z.iso.date();

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
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const startOfNextMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
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

    const monthlyIncome = Number(monthlyIncomeResult._sum.amount ?? 0);

    const monthlyExpenses = Number(monthlyExpensesResult._sum.amount ?? 0);

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
  },
);

router.get(
  "/categories",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const from = req.query.from;
    const to = req.query.to;

    if (
      from !== undefined &&
      (typeof from !== "string" || !dateSchema.safeParse(from).success)
    ) {
      return res.status(400).json({
        message: "Invalid from date. Use YYYY-MM-DD",
      });
    }

    if (
      to !== undefined &&
      (typeof to !== "string" || !dateSchema.safeParse(to).success)
    ) {
      return res.status(400).json({
        message: "Invalid to date. Use YYYY-MM-DD",
      });
    }

    const fromDate =
      typeof from === "string" ? new Date(`${from}T00:00:00.000Z`) : undefined;

    let toDate: Date | undefined;

    if (typeof to === "string") {
      toDate = new Date(`${to}T00:00:00.000Z`);
      toDate.setUTCDate(toDate.getUTCDate() + 1);
    }

    if (fromDate && toDate && fromDate >= toDate) {
      return res.status(400).json({
        message: "From date must be before or equal to to date",
      });
    }

    const expensesByCategory = await prisma.transaction.groupBy({
      by: ["categoryId"],
      where: {
        userId: req.userId!,
        type: "EXPENSE",
        date: {
          gte: fromDate,
          lt: toDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const categoryIds = expensesByCategory.map((item) => item.categoryId);

    const categories = await prisma.category.findMany({
      where: {
        userId: req.userId!,
        id: {
          in: categoryIds,
        },
      },
    });

    const result = expensesByCategory
      .map((item) => {
        const category = categories.find(
          (category) => category.id === item.categoryId,
        );

        return {
          categoryId: item.categoryId,
          categoryName: category?.name ?? "Unknown",
          total: Number(item._sum.amount ?? 0),
        };
      })
      .sort((a, b) => b.total - a.total);

    return res.status(200).json({
      categories: result,
    });
  },
);

router.get(
  "/monthly",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const now = new Date();

    const startMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1),
    );

    const endMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
        date: {
          gte: startMonth,
          lt: endMonth,
        },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
      );

      const month = `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0")}`;

      return {
        month,
        income: 0,
        expenses: 0,
      };
    });

    for (const transaction of transactions) {
      const transactionMonth = `${transaction.date.getUTCFullYear()}-${String(
        transaction.date.getUTCMonth() + 1,
      ).padStart(2, "0")}`;

      const month = months.find((item) => item.month === transactionMonth);

      if (!month) {
        continue;
      }

      const amount = Number(transaction.amount);

      if (transaction.type === "INCOME") {
        month.income += amount;
      } else {
        month.expenses += amount;
      }
    }

    return res.status(200).json({
      months,
    });
  },
);

export default router;
