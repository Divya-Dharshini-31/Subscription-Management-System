import Link from "next/link";
import { LoaderCircle } from "lucide-react";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <main className="min-h-screen bg-sand px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden lg:block">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-moss">
            Brightloop
          </p>
          <h1 className="font-display max-w-xl text-5xl leading-tight text-ink">
            A quieter way to sign in to your subscriptions.
          </h1>
          <p className="mt-6 max-w-md text-base leading-7 text-ink/70">
            Register, log in, and recover your password with the same simple
            account you will use across the Brightloop platform.
          </p>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-moss">
              Brightloop
            </p>
          </div>
          <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-[0_20px_60px_rgba(15,28,46,0.08)]">
            <h2 className="font-display text-3xl text-ink">{title}</h2>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-ink/65">{subtitle}</p>
            ) : null}
            <div className="mt-6">{children}</div>
            {footer ? <div className="mt-6 text-sm text-ink/70">{footer}</div> : null}
          </div>
          <p className="mt-6 text-center text-xs text-ink/45">
            <Link href="/login" className="hover:text-moss">
              Sign in
            </Link>
            <span className="mx-2">·</span>
            <Link href="/register" className="hover:text-moss">
              Create account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export function Field({ label, type = "text", name, value, onChange, autoComplete, placeholder }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      <input
        className="auth-input"
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
      />
    </label>
  );
}

export function Alert({ tone = "error", children }) {
  const styles =
    tone === "success"
      ? "border-moss/20 bg-moss/5 text-moss"
      : "border-clay/20 bg-clay/5 text-clay";
  return (
    <p className={`mb-4 rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</p>
  );
}

export function SubmitButton({ loading, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {loading ? "Please wait..." : children}
    </button>
  );
}
