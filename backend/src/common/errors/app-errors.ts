export interface AppErrorBody {
  code: string;
  message: string;
}

export const APP_ERRORS = {
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: 'Хэрэглэгч олдсонгүй',
  },
  HTTP_ERROR: {
    code: 'HTTP_ERROR',
    message: 'Хүсэлт боловсруулахад алдаа гарлаа',
  },
  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Серверт алдаа гарлаа',
  },
  OTP_INVALID: {
    code: 'OTP_INVALID',
    message: 'Нэг удаагийн код буруу байна',
  },
  OTP_EXPIRED: {
    code: 'OTP_EXPIRED',
    message: 'Нэг удаагийн кодын хугацаа дууссан',
  },
  OTP_MAX_ATTEMPTS: {
    code: 'OTP_MAX_ATTEMPTS',
    message: 'Оролдлогын тоо хэтэрсэн. Шинэ код авна уу',
  },
  OTP_COOLDOWN: {
    code: 'OTP_COOLDOWN',
    message: 'Кодыг дахин илгээхийн өмнө 60 секунд хүлээнэ үү',
  },
  INVALID_REFRESH_TOKEN: {
    code: 'INVALID_REFRESH_TOKEN',
    message: 'Нэвтрэлтийн мэдээлэл хүчингүй байна',
  },
  AUTH_CLIENT_INVALID: {
    code: 'AUTH_CLIENT_INVALID',
    message: 'Token client type хүчингүй байна',
  },
  TOKEN_AUDIENCE_INVALID: {
    code: 'TOKEN_AUDIENCE_INVALID',
    message: 'Энэ token энэ API-д зориулагдаагүй байна',
  },
  ADMIN_AUDIENCE_FORBIDDEN: {
    code: 'ADMIN_AUDIENCE_FORBIDDEN',
    message: 'Admin token зөвхөн admin хэрэглэгчид олгогдоно',
  },
  USER_INACTIVE: {
    code: 'USER_INACTIVE',
    message: 'Таны бүртгэл түр зогссон байна',
  },
  GOOGLE_AUTH_FAILED: {
    code: 'GOOGLE_AUTH_FAILED',
    message: 'Google нэвтрэлт амжилтгүй болсон',
  },
  DAN_AUTH_FAILED: {
    code: 'DAN_AUTH_FAILED',
    message: 'DAN баталгаажуулалт амжилтгүй болсон',
  },
  DAN_INVALID_STATE: {
    code: 'DAN_INVALID_STATE',
    message: 'DAN холбоосын хүсэлт хүчингүй эсвэл хугацаа дууссан',
  },
  DAN_ALREADY_VERIFIED: {
    code: 'DAN_ALREADY_VERIFIED',
    message: 'Таны бүртгэл аль хэдийн баталгаажсан',
  },
  DAN_NOT_CONFIGURED: {
    code: 'DAN_NOT_CONFIGURED',
    message: 'DAN интеграц тохируулагдаагүй байна',
  },
  GOOGLE_NOT_CONFIGURED: {
    code: 'GOOGLE_NOT_CONFIGURED',
    message: 'Google интеграц тохируулагдаагүй байна',
  },
  BONUM_NOT_CONFIGURED: {
    code: 'BONUM_NOT_CONFIGURED',
    message: 'Bonum интеграц тохируулагдаагүй байна',
  },
  BONUM_INVOICE_CREATE_FAILED: {
    code: 'BONUM_INVOICE_CREATE_FAILED',
    message: 'Bonum invoice үүсгэхэд алдаа гарлаа',
  },
  BONUM_AUTH_FAILED: {
    code: 'BONUM_AUTH_FAILED',
    message: 'Bonum нэвтрэлт амжилтгүй болсон',
  },
  BONUM_INVALID_SIGNATURE: {
    code: 'BONUM_INVALID_SIGNATURE',
    message: 'Bonum webhook signature хүчингүй байна',
  },
  BONUM_INVOICE_NOT_FOUND: {
    code: 'BONUM_INVOICE_NOT_FOUND',
    message: 'Bonum invoice олдсонгүй',
  },
  BONUM_INVALID_PAYLOAD: {
    code: 'BONUM_INVALID_PAYLOAD',
    message: 'Bonum webhook payload хүчингүй байна',
  },
  MQTT_NOT_CONFIGURED: {
    code: 'MQTT_NOT_CONFIGURED',
    message: 'MQTT broker тохируулагдаагүй байна',
  },
  MQTT_UNAVAILABLE: {
    code: 'MQTT_UNAVAILABLE',
    message: 'MQTT broker-т холбогдож чадсангүй',
  },
  CABINET_NOT_CONFIGURED: {
    code: 'CABINET_NOT_CONFIGURED',
    message: 'Станцын cabinet тохируулагдаагүй байна',
  },
  CABINET_OFFLINE: {
    code: 'CABINET_OFFLINE',
    message: 'Cabinet offline байна',
  },
  CABINET_ACK_TIMEOUT: {
    code: 'CABINET_ACK_TIMEOUT',
    message: 'Cabinet командад хугацаандаа хариу өгсөнгүй',
  },
  CABINET_COMMAND_FAILED: {
    code: 'CABINET_COMMAND_FAILED',
    message: 'Cabinet команд амжилтгүй боллоо',
  },
  TRUST_TIER_INSUFFICIENT: {
    code: 'TRUST_TIER_INSUFFICIENT',
    message: 'Энэ үйлдлийг гүйцэтгэхэд нэмэлт баталгаажуулалт шаардлагатай',
  },
  STATION_NOT_FOUND: {
    code: 'STATION_NOT_FOUND',
    message: 'Станц олдсонгүй',
  },
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    message: 'Хэтэвчний үлдэгдэл хүрэлцэхгүй байна',
  },
  WALLET_NOT_FOUND: {
    code: 'WALLET_NOT_FOUND',
    message: 'Хэтэвч олдсонгүй',
  },
  RENTAL_NOT_FOUND: {
    code: 'RENTAL_NOT_FOUND',
    message: 'Түрээс олдсонгүй',
  },
  SLOT_NOT_FOUND: {
    code: 'SLOT_NOT_FOUND',
    message: 'Слот олдсонгүй',
  },
  SLOT_EMPTY: {
    code: 'SLOT_EMPTY',
    message: 'Слотэнд идэвхтэй power bank байхгүй байна',
  },
  SLOT_OCCUPIED: {
    code: 'SLOT_OCCUPIED',
    message: 'Слот дүүрэн байна',
  },
  POWER_BANK_NOT_IDLE: {
    code: 'POWER_BANK_NOT_IDLE',
    message: 'Power bank одоогоор ашиглалтад байна',
  },
  ACTIVE_RENTAL_EXISTS: {
    code: 'ACTIVE_RENTAL_EXISTS',
    message: 'Та аль хэдийн идэвхтэй түрээстэй байна',
  },
  NO_PRICING_RULE: {
    code: 'NO_PRICING_RULE',
    message: 'Үнийн дүрэм олдсонгүй',
  },
  RENTAL_NOT_ACTIVE: {
    code: 'RENTAL_NOT_ACTIVE',
    message: 'Түрээс идэвхтэй биш байна',
  },
  POWER_BANK_STATE_MISMATCH: {
    code: 'POWER_BANK_STATE_MISMATCH',
    message: 'Power bank төлөв тохирохгүй байна',
  },
  POWER_BANK_NOT_FOUND: {
    code: 'POWER_BANK_NOT_FOUND',
    message: 'Power bank олдсонгүй',
  },
} as const satisfies Record<string, AppErrorBody>;

export type AppErrorKey = keyof typeof APP_ERRORS;
export type AppErrorCode = (typeof APP_ERRORS)[AppErrorKey]['code'];
export type AppErrorDefinition = (typeof APP_ERRORS)[AppErrorKey];

const APP_ERRORS_BY_CODE = Object.fromEntries(
  Object.values(APP_ERRORS).map((error) => [error.code, error]),
);

export function buildAppError(
  error: AppErrorKey | AppErrorBody,
  overrides?: Partial<AppErrorBody>,
): AppErrorBody {
  const base = typeof error === 'string' ? APP_ERRORS[error] : error;

  return {
    code: overrides?.code ?? base.code,
    message: overrides?.message ?? base.message,
  };
}

export function findAppErrorByCode(
  code: string,
): AppErrorDefinition | undefined {
  return APP_ERRORS_BY_CODE[code];
}
