import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required",
    });
  }

  const token = authorization.split(" ")[1];

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);

    if (
      typeof payload === "string" ||
      typeof payload.userId !== "string"
    ) {
      return res.status(401).json({
        message: "Invalid token",
      });
    }

    req.userId = payload.userId;

    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}