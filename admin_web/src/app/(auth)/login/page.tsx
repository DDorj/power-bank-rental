import { Suspense } from "react";
import { LoginScreen } from "@/features/auth/login-screen";
import { LoadingScreen } from "@/shared/ui/loading-screen";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Login хуудас ачаалж байна..." />}>
      <LoginScreen />
    </Suspense>
  );
}
