import { Router } from "express";
import { z } from "zod";
import { Prisma } from "../generated/prisma/client.js";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(["INCOME", "EXPENSE"]),
});

const updateCategorySchema = z
  .object({
    name: z.string().min(1).max(50).optional(),
    type: z.enum(["INCOME", "EXPENSE"]).optional(),
  })
  .refine((data) => data.name !== undefined || data.type !== undefined, {
    message: "At least one field is required",
  });

router.post(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const result = createCategorySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid category data",
        errors: result.error.flatten(),
      });
    }

    const { name, type } = result.data;

    const category = await prisma.category.create({
      data: {
        name,
        type,
        userId: req.userId!,
      },
    });

    return res.status(201).json({
      message: "Category created successfully",
      category,
    });
  }
);

router.get(
  "/",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const categories = await prisma.category.findMany({
      where: {
        userId: req.userId!,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      categories,
    });
  }
);

router.patch(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const result = updateCategorySchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid category data",
        errors: result.error.flatten(),
      });
    }

    const categoryId = req.params.id;

    if (typeof categoryId !== "string") {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

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

    const updatedCategory = await prisma.category.update({
      where: {
        id: category.id,
      },
      data: result.data,
    });

    return res.status(200).json({
      message: "Category updated successfully",
      category: updatedCategory,
    });
  }
);

router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    const categoryId = req.params.id;

    if (typeof categoryId !== "string") {
      return res.status(400).json({
        message: "Invalid category ID",
      });
    }

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

    try {
      await prisma.category.delete({
        where: {
          id: category.id,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return res.status(409).json({
          message:
            "Category cannot be deleted because it is being used by transactions or budgets",
        });
      }

      throw error;
    }

    return res.status(200).json({
      message: "Category deleted successfully",
    });
  }
);

export default router;