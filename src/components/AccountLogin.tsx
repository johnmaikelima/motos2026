"use client";

import { useRouter } from "next/navigation";
import CheckoutLogin from "@/components/CheckoutLogin";

export default function AccountLogin() {
  const router = useRouter();
  return <CheckoutLogin onLogin={() => router.refresh()} />;
}
