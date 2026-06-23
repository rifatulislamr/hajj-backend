import bcrypt from "bcrypt";
import { BadRequestError } from "./errors.utils";

const SALT_ROUNDS = 12;
const MIN_LENGTH = 8;
const MAX_LENGTH = 100;

export const hashPassword = async (password: string): Promise<string> => {
  try {
    validatePassword(password);
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    if (error instanceof BadRequestError) {
      throw error;
    }
    throw new Error("Error hashing password");
  }
};

export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

export const validatePassword = (password: string): void => {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
  }

  if (password.length > MAX_LENGTH) {
    errors.push(`Password must not exceed ${MAX_LENGTH} characters`);
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  const commonPasswords = ["password123", "admin123", "12345678"];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common");
  }

  if (errors.length > 0) {
    throw BadRequestError(errors.join(". "));
  }
};
