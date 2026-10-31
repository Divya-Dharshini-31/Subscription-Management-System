"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  ChevronRight,
} from "lucide-react";
import { apiRequest } from "@/lib/api";

/**
 * DashboardShell — reusable sidebar + topbar wrapper.
 *
 * Props:
 *   navSections  – array of { label, items: [{ id, icon, label }] }
 *   activeTab    – currently selected item id
 *   onTabChange  – (id) => void
 *   title        – topbar page title
 *   topbarRight  – optional JSX to render in topbar right slot
 *   user         – { full_name, email, role }
 *   roleBadge    – string label shown under logo
 *   accentColor  – CSS color for active nav accent (optional)
 *   children     – page content
 */
export default function DashboardShell({
  navSections = [],
  activeTab,
  onTabChange,
  title,
  topbarRight,
  user,
  roleBadge,
  children,
}) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
    }
  }

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join("")
    : "?";

  return (
    <div className="dash-shell">
      {/* ── Sidebar ─────────────────────────── */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-logo">
          <p className="brand">Brightloop</p>
          {roleBadge && <span className="role-badge">{roleBadge}</span>}
        </div>

        <nav className="dash-sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="dash-nav-section">
              {section.label && (
                <p className="dash-nav-label">{section.label}</p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`dash-nav-item${activeTab === item.id ? " active" : ""}`}
                  onClick={() => onTabChange(item.id)}
                  aria-current={activeTab === item.id ? "page" : undefined}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          {user && (
            <div className="dash-user-card">
              <div className="dash-avatar">{initials}</div>
              <div className="dash-user-info" style={{ minWidth: 0 }}>
                <p className="name">{user.full_name}</p>
                <p className="email">{user.email}</p>
              </div>
            </div>
          )}
          <button
            className="logout-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <LogOut size={14} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────── */}
      <main className="dash-main">
        <header className="dash-topbar">
          <h1 className="dash-topbar-title">{title}</h1>
          <div className="dash-topbar-actions">{topbarRight}</div>
        </header>

        <div className="dash-content fade-up">{children}</div>
      </main>
    </div>
  );
}
