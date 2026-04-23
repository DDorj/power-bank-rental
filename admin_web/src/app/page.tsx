"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/shared/ui/loading-screen";
import { useAuth } from "@/shared/providers/auth-provider";

export default function HomePage() {
  const router = useRouter();
  const { initialized, session } = useAuth();

  useEffect(() => {
    if (!initialized) {
      return;
    }

    router.replace(session ? "/dashboard" : "/login");
  }, [initialized, router, session]);

  return <LoadingScreen label="Admin panel ачаалж байна..." />;
}
