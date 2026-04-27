import { LoginScreen } from "@/features/auth/login-screen";

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ next?: string }>;
}>) {
  const params = await searchParams;

  return <LoginScreen nextPath={params.next || "/home"} />;
}
