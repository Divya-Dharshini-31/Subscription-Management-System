"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell, { Alert, Field, SubmitButton } from "@/components/AuthShell";
import { apiRequest } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Password and confirm password do not match.");
      return;
    }
    setLoading(true);
    try {
      await apiRequest("/api/auth/register", { method: "POST", body: form });
      router.push("/login");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Public registration creates a CUSTOMER account. Admin and staff accounts are not available here."
      footer={
        <p>
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-moss">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
        <Field
          label="Full name"
          name="full_name"
          value={form.full_name}
          onChange={update}
          autoComplete="name"
          placeholder="Jordan Lee"
        />
        <Field
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={update}
          autoComplete="email"
          placeholder="you@example.com"
        />
        <Field
          label="Password"
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
        <SubmitButton loading={loading}>Sign up</SubmitButton>
      </form>
    </AuthShell>
  );
}
