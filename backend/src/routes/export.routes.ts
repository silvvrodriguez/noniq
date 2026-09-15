import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import {
  authenticateToken,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.js";

const router = Router();

function escapeCsvValue(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

router.get(
  "/transactions.csv",
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

    const header = [
      "date",
      "type",
      "category",
      "description",
      "amount",
    ];

    const rows = transactions.map((transaction) => [
      transaction.date.toISOString(),
      transaction.type,
      transaction.category.name,
      transaction.description ?? "",
      transaction.amount.toString(),
    ]);

    const csv = [
      header.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row.map(escapeCsvValue).join(",")
      ),
    ].join("\r\n");

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="noniq-transactions.csv"'
    );

    return res.status(200).send(csv);
  }
);

export default router;