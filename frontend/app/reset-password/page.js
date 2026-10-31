"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import AuthShell, { Alert, Field, SubmitButton } from "@/components/AuthShell";
import { apiRequest } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This reset link is missing a token.");
      return;
    }
    if (form.password !== form.confirm_password) {
      setError("Password and confirm password do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: { token, ...form },
      });
      router.push("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a new password using the same rules as registration."
      footer={
        <p>
          <Link href="/login" className="font-semibold text-moss">
            Return to login
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        {!token ? (
          <Alert>Open the reset link from your email to continue.</Alert>
        ) : null}
        <Field
          label="New password"
          type="password"
          name="password"
          value={form.password}
          onChange={update}
          autoComplete="new-password"
        />
        <Field
          label="Confirm password"
          type="password"
          name="confirm_password"
          value={form.confirm_password}
          onChange={update}
          autoComplete="new-password"
        />
        <p className="mb-4 text-xs leading-5 text-ink/55">
          Use more than 8 characters, with uppercase, lowercase, and a special
          character.
        </p>
        <SubmitButton loading={loading}>Update password</SubmitButton>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-ink/60">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
