import { ApiError } from "@/shared/api/http";

const errorMessageByCode: Record<string, string> = {};

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return errorMessageByCode[error.code] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Алдаа гарлаа. Дахин оролдоно уу.";
}
