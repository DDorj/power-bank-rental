import { ApiError } from "@/shared/api/http";

const errorMessageByCode: Record<string, string> = {
  ADMIN_AUDIENCE_FORBIDDEN:
    "Энэ дугаар admin эрхгүй байна. Локал demo admin дугаар: +97699000001",
};

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return errorMessageByCode[error.code] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Алдаа гарлаа. Дахин оролдоно уу.";
}
