"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AuthShell, { Alert, Field, SubmitButton } from "@/components/AuthShell";
import { apiRequest } from "@/lib/api";

function validateLoginForm({ email, password }) {
  const trimmedEmail = String(email || "").trim();
  const emailIsValid = /.+@.+\..+/.test(trimmedEmail);

  if (!trimmedEmail) {
    return "Please enter your email address.";
  }
  if (!emailIsValid) {
    return "Please enter a valid email address.";
  }
  if (!password || String(password).trim().length === 0) {
    return "Please enter your password.";
  }
  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    const validationError = validateLoginForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/api/auth/login", { method: "POST", body: form });
      router.push(data.redirect || "/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with the email and password for your Brightloop account."
      footer={
        <p>
          New here?{" "}
          <Link href="/register" className="font-semibold text-moss">
            Create an account
          </Link>
          <span className="mx-2">·</span>
          <Link href="/forgot-password" className="font-semibold text-moss">
            Forgot password
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit}>
        {error ? <Alert>{error}</Alert> : null}
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
          autoComplete="current-password"
        />
        <SubmitButton loading={loading}>Log in</SubmitButton>
      </form>
    </AuthShell>
  );
}
