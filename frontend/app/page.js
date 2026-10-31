"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { RefreshCw } from "lucide-react";

/**
 * Root page — checks who is logged in and redirects them to their dashboard.
 * If not authenticated, sends them to /login.
 */
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    apiRequest("/api/auth/me")
      .then((data) => {
        const role = data?.user?.role;
        if (role === "ADMIN") {
          router.replace("/dashboard/admin");
        } else if (role === "PRODUCT_OWNER") {
          router.replace("/dashboard/staff");
        } else if (role === "CUSTOMER") {
          router.replace("/dashboard/customer");
        } else {
          router.replace("/login");
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4efe6",
        gap: 16,
      }}
    >
      <RefreshCw
        size={30}
        color="#1f6f5b"
        style={{ animation: "spin 1s linear infinite" }}
      />
      <p
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "rgba(15,28,46,0.45)",
        }}
      >
        Redirecting…
      </p>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
