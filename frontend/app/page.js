"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Alert, Field, SubmitButton } from "@/components/AuthShell";
import { apiRequest, roleCopy, roleLabel } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ownerForm, setOwnerForm] = useState({
    full_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [ownerLoading, setOwnerLoading] = useState(false);

  useEffect(() => {
    apiRequest("/api/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  async function createProductOwner(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setOwnerLoading(true);
    try {
      const data = await apiRequest("/api/auth/product-owners", {
        method: "POST",
        body: ownerForm,
      });
      setMessage(`Product owner account created for ${data.user.email}.`);
      setOwnerForm({ full_name: "", email: "", password: "", confirm_password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setOwnerLoading(false);
    }
  }

  if (loading || !user) {
    return <main className="min-h-screen bg-sand p-10 text-ink/60">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-sand px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-moss">
            Brightloop
          </p>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink hover:border-moss hover:text-moss"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>

        <section className="mt-8 rounded-3xl border border-ink/10 bg-white p-8 shadow-[0_20px_60px_rgba(15,28,46,0.08)]">
          <p className="text-sm uppercase tracking-[0.18em] text-moss">{roleLabel(user.role)}</p>
          <h1 className="font-display mt-2 text-4xl text-ink">Hello, {user.full_name}</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/70">{roleCopy(user.role)}</p>
          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink/45">Email</dt>
              <dd className="mt-1 font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-ink/45">Role</dt>
              <dd className="mt-1 font-medium">{user.role}</dd>
            </div>
          </dl>
        </section>

        {user.role === "ADMIN" ? (
          <section className="mt-6 rounded-3xl border border-ink/10 bg-white p-8">
            <h2 className="font-display text-2xl">Create a product owner account</h2>
            <p className="mt-2 text-sm text-ink/65">
              Only administrators can add PRODUCT_OWNER users. Public registration cannot
              create ADMIN or PRODUCT_OWNER accounts.
            </p>
            <form className="mt-6" onSubmit={createProductOwner}>
              {error ? <Alert>{error}</Alert> : null}
              {message ? <Alert tone="success">{message}</Alert> : null}
              <Field
                label="Full name"
                name="full_name"
                value={ownerForm.full_name}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, full_name: event.target.value }))
                }
              />
              <Field
                label="Email"
                type="email"
                name="email"
                value={ownerForm.email}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, email: event.target.value }))
                }
              />
              <Field
                label="Password"
                type="password"
                name="password"
                value={ownerForm.password}
                onChange={(event) =>
                  setOwnerForm((current) => ({ ...current, password: event.target.value }))
                }
              />
              <Field
                label="Confirm password"
                type="password"
                name="confirm_password"
                value={ownerForm.confirm_password}
                onChange={(event) =>
                  setOwnerForm((current) => ({
                    ...current,
                    confirm_password: event.target.value,
                  }))
                }
              />
              <SubmitButton loading={ownerLoading}>Create product owner</SubmitButton>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  );
}
