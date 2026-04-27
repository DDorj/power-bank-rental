import { OtpScreen } from "@/features/auth/otp-screen";

export default async function OtpPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ phone?: string; next?: string }>;
}>) {
  const params = await searchParams;

  return (
    <OtpScreen
      phone={params.phone || ""}
      nextPath={params.next || "/home"}
    />
  );
}
