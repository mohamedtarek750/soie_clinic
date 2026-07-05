"use client";

import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="shell__link"
      onClick={async () => {
        try {
          await api("/api/auth/logout", { method: "POST", body: {} });
        } finally {
          router.push("/login");
          router.refresh();
        }
      }}
    >
      Sign out
    </button>
  );
}
