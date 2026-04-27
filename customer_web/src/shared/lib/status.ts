import type {
  KycStatus,
  PaymentStatus,
  PowerBankStatus,
  RentalStatus,
  StationStatus,
  WalletTransactionType,
} from "@/shared/types/api";

type Tone = "neutral" | "positive" | "warning" | "danger" | "accent";

export const kycStatusLabels: Record<KycStatus, string> = {
  none: "Баталгаажаагүй",
  pending: "Хүлээгдэж буй",
  verified: "Баталгаажсан",
  rejected: "Татгалзсан",
};

export const stationStatusLabels: Record<StationStatus, string> = {
  active: "Идэвхтэй",
  inactive: "Идэвхгүй",
  maintenance: "Засвартай",
};

export const rentalStatusLabels: Record<RentalStatus, string> = {
  active: "Идэвхтэй",
  completed: "Дууссан",
  overdue: "Хэтэрсэн",
  cancelled: "Цуцлагдсан",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Хүлээгдэж буй",
  paid: "Төлөгдсөн",
  failed: "Амжилтгүй",
  expired: "Хугацаа дууссан",
};

export const walletTypeLabels: Record<WalletTransactionType, string> = {
  topup: "Цэнэглэлт",
  freeze: "Түр түгжээ",
  unfreeze: "Түгжээ суллалт",
  charge: "Суутгалт",
  refund: "Буцаалт",
  adjustment: "Засвар",
};

export const powerBankStatusLabels: Record<PowerBankStatus, string> = {
  idle: "Бэлэн",
  rented: "Түрээслэгдсэн",
  charging: "Цэнэглэж байна",
  faulty: "Гэмтэлтэй",
};

export function statusTone(
  status:
    | StationStatus
    | RentalStatus
    | PaymentStatus
    | PowerBankStatus
    | KycStatus
    | boolean,
): Tone {
  if (typeof status === "boolean") {
    return status ? "positive" : "danger";
  }

  if (
    status === "active" ||
    status === "verified" ||
    status === "paid" ||
    status === "idle"
  ) {
    return "positive";
  }

  if (status === "maintenance" || status === "pending" || status === "charging") {
    return "warning";
  }

  if (
    status === "inactive" ||
    status === "overdue" ||
    status === "failed" ||
    status === "expired" ||
    status === "faulty" ||
    status === "rejected"
  ) {
    return "danger";
  }

  if (status === "completed" || status === "cancelled" || status === "none") {
    return "neutral";
  }

  return "accent";
}
