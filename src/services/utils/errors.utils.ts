export class AppError extends Error {
  public statusCode: number;
  public status: string;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";

    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (message: string, statusCode: number) => {
  return new AppError(message, statusCode);
};

export const BadRequestError = (message: string) => createError(message, 400);
export const UnauthorizedError = (message: string) => createError(message, 401);
export const ForbiddenError = (message: string) => createError(message, 403);
export const NotFoundError = (message: string) => createError(message, 404);
export const ConflictError = (message: string) => createError(message, 409);
export const ValidationError = (
  message: string,
  errors: Record<string, string[]>
) => {
  const error = createError(message, 422);
  (error as any).errors = errors;
  return error;
};
export class PeriodClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PeriodClosedError';
  }
}