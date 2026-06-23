import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../services/utils/errors.utils";

interface ErrorResponse {
  status: string;
  message: string;
  errors?: Record<string, string[]>;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // Log error for debugging
  console.error("Error:", {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationErrors: Record<string, string[]> = {};
    err.errors.forEach((error) => {
      const path = error.path.join(".");
      if (!validationErrors[path]) {
        validationErrors[path] = [];
      }
      validationErrors[path].push(error.message);
    });

    error = new AppError("Validation failed", 422);
    (error as any).errors = validationErrors;
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    status: (error as AppError).status || "error",
    message: error.message || "Something went wrong",
  };

  // Add validation errors if present
  if ((error as any).errors) {
    errorResponse.errors = (error as any).errors;
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    errorResponse.stack = error.stack;
  }

  res.status((error as AppError).statusCode || 500).json(errorResponse);
};
