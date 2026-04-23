const moneyFormatter = new Intl.NumberFormat("mn-MN", {
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("mn-MN");

const dateTimeFormatter = new Intl.DateTimeFormat("mn-MN", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("mn-MN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function formatMoney(value: number) {
  return `${moneyFormatter.format(value)} ₮`;
}

export function formatNumber(value: number) {
  return numberFormatter.format(value);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return dateFormatter.format(new Date(value));
}

export function formatPhone(phone: string | null | undefined) {
  return phone || "—";
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}
