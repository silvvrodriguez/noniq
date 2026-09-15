import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const createTransactionSchema = z.object({
  amount: z.number().positive(),
  description: z.string().max(200).optional(),
  type: z.enum(["INCOME", "EXPENSE"]),
  date: z.iso.datetime(),
  categoryId: z.string().uuid(),
});

const updateTransactionSchema = z
  .object({
    amount: z.number().positive().optional(),
    description: z.string().max(200).optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
    date: z.iso.datetime().optional(),
    categoryId: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      data.amount !== undefined ||
      data.description !== undefined ||
      data.type !== undefined ||
      data.date !== undefined ||
      data.categoryId !== undefined,
    {
      message: "At least one field is required",
    }
  );

router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const result = createTransactionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid transaction data",
        errors: result.error.flatten(),
      });
    }

    const { amount, description, type, date, categoryId } = result.data;

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

    if (category.type !== type) {
      return res.status(400).json({
        message: "Transaction type must match category type",
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        description,
        type,
        date: new Date(date),
        userId: req.userId!,
        categoryId: category.id,
      },
      include: {
        category: true,
      },
    });

    return res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId!,
      },
      include: {
        category: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.status(200).json({
      transactions,
    });
  }
);

router.patch(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const result = updateTransactionSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid transaction data",
        errors: result.error.flatten(),
      });
    }

    const transactionId = req.params.id;

    if (typeof transactionId !== "string") {
      return res.status(400).json({
        message: "Invalid transaction ID",
      });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.userId!,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const finalCategoryId =
      result.data.categoryId ?? transaction.categoryId;

    const finalType =
      result.data.type ?? transaction.type;

    const category = await prisma.category.findFirst({
      where: {
        id: finalCategoryId,
        userId: req.userId!,
      },
    });

    if (!category) {
      return res.status(404).json({
        message: "Category not found",
      });
    }

    if (category.type !== finalType) {
      return res.status(400).json({
        message: "Transaction type must match category type",
      });
    }

    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: transaction.id,
      },
      data: {
        amount: result.data.amount,
        description: result.data.description,
        type: result.data.type,
        date: result.data.date
          ? new Date(result.data.date)
          : undefined,
        categoryId: result.data.categoryId,
      },
      include: {
        category: true,
      },
    });

    return res.status(200).json({
      message: "Transaction updated successfully",
      transaction: updatedTransaction,
    });
  }
);

router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const transactionId = req.params.id;

    if (typeof transactionId !== "string") {
      return res.status(400).json({
        message: "Invalid transaction ID",
      });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: req.userId!,
      },
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    await prisma.transaction.delete({
      where: {
        id: transaction.id,
      },
    });

    return res.status(200).json({
      message: "Transaction deleted successfully",
    });
  }
);

export default router;