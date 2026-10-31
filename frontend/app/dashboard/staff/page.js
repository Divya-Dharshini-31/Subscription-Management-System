"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
  ClipboardList,
  Users,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
  Briefcase,
  Send,
  Activity,
  AlertCircle,
} from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import { apiRequest } from "@/lib/api";

/* ── Mock data ────────────────────────────────────────────────── */
const MOCK = {
  stats: [
    { label: "My Customers", value: "34", change: "+2", up: true, icon: Users, color: "#1d4ed8", bg: "rgba(29,78,216,0.08)" },
    { label: "Active Subscriptions", value: "41", change: "+3", up: true, icon: Activity, color: "#1f6f5b", bg: "rgba(31,111,91,0.1)" },
    { label: "Pending Invoices", value: "7", change: "-2", up: false, icon: AlertTriangle, color: "#b45309", bg: "rgba(180,83,9,0.08)" },
    { label: "Quotes Sent", value: "12", change: "+4", up: true, icon: Send, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  ],
  subscriptions: [
    { id: "SUB-001", customer: "Acme Corp", plan: "Brightloop ERP Pro", billing: "Monthly", amount: "₹22,000", status: "Active", nextBill: "Nov 1, 2026" },
    { id: "SUB-002", customer: "Nexus Retail", plan: "Brightloop POS Plus", billing: "Quarterly", amount: "₹12,000", status: "Active", nextBill: "Dec 1, 2026" },
    { id: "SUB-003", customer: "CloudFin Ltd", plan: "Brightloop ERP Core", billing: "Monthly", amount: "₹12,500", status: "Trial", nextBill: "Nov 5, 2026" },
    { id: "SUB-004", customer: "Delta Logistics", plan: "Brightloop HRM", billing: "Annual", amount: "₹32,000", status: "Suspended", nextBill: "—" },
    { id: "SUB-005", customer: "Summit School", plan: "Brightloop ERP Core", billing: "Monthly", amount: "₹12,500", status: "Active", nextBill: "Nov 12, 2026" },
  ],
  quotes: [
    { id: "QT-2026-011", customer: "Greenleaf Pvt", plan: "Brightloop ERP Pro", value: "₹22,000/mo", status: "Draft", created: "Oct 28, 2026" },
    { id: "QT-2026-010", customer: "SkyLink Infra", plan: "Brightloop ERP Core + HRM", value: "₹15,700/mo", status: "Sent", created: "Oct 25, 2026" },
    { id: "QT-2026-009", customer: "BrightFoods Co", plan: "Brightloop POS Plus", value: "₹4,500/mo", status: "Confirmed", created: "Oct 20, 2026" },
    { id: "QT-2026-008", customer: "Alpine Tech", plan: "Brightloop ERP Pro", value: "₹22,000/mo", status: "Cancelled", created: "Oct 15, 2026" },
  ],
  invoices: [
    { id: "INV-2026-088", customer: "Acme Corp", amount: "₹22,000", due: "Nov 1, 2026", status: "Unpaid" },
    { id: "INV-2026-087", customer: "Summit School", amount: "₹12,500", due: "Oct 30, 2026", status: "Overdue" },
    { id: "INV-2026-086", customer: "Nexus Retail", amount: "₹12,000", due: "Oct 20, 2026", status: "Paid" },
    { id: "INV-2026-085", customer: "CloudFin Ltd", amount: "₹12,500", due: "Oct 15, 2026", status: "Paid" },
  ],
};

const STATUS_PILL = {
  Active: "pill pill-green",
  Trial: "pill pill-blue",
  Suspended: "pill pill-red",
  Closed: "pill pill-gray",
  Draft: "pill pill-gray",
  Sent: "pill pill-blue",
  Confirmed: "pill pill-moss",
  Cancelled: "pill pill-red",
  Paid: "pill pill-green",
  Unpaid: "pill pill-amber",
  Overdue: "pill pill-red",
};

/* ── New Quote Modal ─────────────────────────────────────────── */
function NewQuoteModal({ onClose }) {
  const [form, setForm] = useState({ customer: "", plan: "", billing: "Monthly", notes: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900)); // Simulate API
    setLoading(false);
    setDone(true);
    setTimeout(onClose, 1200);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 className="modal-title">New Quotation</h2>
            <p className="modal-sub">Create a subscription quote for a customer.</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(15,28,46,0.4)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 700, fontSize: 15 }}>Quote created!</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input className="form-input" placeholder="e.g. Acme Corp" value={form.customer} onChange={(e) => set("customer", e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Product Plan</label>
              <select className="form-select" value={form.plan} onChange={(e) => set("plan", e.target.value)} required>
                <option value="">Select a plan…</option>
                <option>Brightloop ERP Core</option>
                <option>Brightloop ERP Pro</option>
                <option>Brightloop POS Plus</option>
                <option>Brightloop HRM</option>
                <option>Brightloop Analytics</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Billing Interval</label>
              <select className="form-select" value={form.billing} onChange={(e) => set("billing", e.target.value)}>
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annual</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Any special terms or notes…"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                style={{ resize: "none" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
                {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={14} />}
                {loading ? "Creating…" : "Create Quote"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Record Payment Modal ────────────────────────────────────── */
function RecordPaymentModal({ invoice, onClose }) {
  const [method, setMethod] = useState("Bank Transfer");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const idempotencyKey = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch(`/api/v1/invoices/${invoice.id}/payments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount: invoice.amount_due,
          payment_method: method,
          reference: ref,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to record payment");
      }
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 className="modal-title">Record Payment</h2>
            <p className="modal-sub">{invoice.invoice_number} · {invoice.customer_name} · ₹{invoice.amount_due}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(15,28,46,0.4)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {error && (
          <div style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.15)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#dc2626", marginBottom: 14 }}>
            {error}
          </div>
        )}
        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <CheckCircle2 size={40} color="#16a34a" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontWeight: 700, fontSize: 15 }}>Payment recorded!</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Bank Transfer</option>
                <option>Cheque</option>
                <option>Cash</option>
                <option>UPI</option>
                <option>Credit Card</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Reference / Transaction ID</label>
              <input className="form-input" placeholder="e.g. TXN1234567890" value={ref} onChange={(e) => setRef(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
                {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
                {loading ? "Recording…" : "Confirm Payment"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Sub-views ────────────────────────────────────────────────── */
function Overview({ stats }) {
  return (
    <div>
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div className="stat-card" key={s.label}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <Icon size={18} color={s.color} />
              </div>
              <div className="stat-value">{s.value}</div>
              <div className="stat-label">{s.label}</div>
              <span className={`stat-change ${s.up ? "up" : "down"}`}>
                {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {s.change} this month
              </span>
            </div>
          );
        })}
      </div>

      <div className="two-col">
        <div className="dash-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">Recent Subscriptions</h2>
              <p className="section-sub">Across all assigned customers</p>
            </div>
          </div>
          <table className="dash-table">
            <thead>
              <tr><th>Customer</th><th>Plan</th><th>Status</th></tr>
            </thead>
            <tbody>
              {MOCK.subscriptions.slice(0, 4).map((s) => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.customer}</td>
                  <td style={{ fontSize: 12.5, color: "rgba(15,28,46,0.6)" }}>{s.plan}</td>
                  <td><span className={STATUS_PILL[s.status] || "pill pill-gray"}>{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">Pending Invoices</h2>
              <p className="section-sub">Awaiting payment or overdue</p>
            </div>
          </div>
          <table className="dash-table">
            <thead>
              <tr><th>Invoice</th><th>Customer</th><th>Status</th></tr>
            </thead>
            <tbody>
              {MOCK.invoices.filter((i) => i.status !== "Paid").map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{i.id}</td>
                  <td style={{ fontSize: 13 }}>{i.customer}</td>
                  <td><span className={STATUS_PILL[i.status] || "pill pill-gray"}>{i.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SubscriptionsView() {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? MOCK.subscriptions : MOCK.subscriptions.filter((s) => s.status.toLowerCase() === tab);

  return (
    <div>
      <div className="tab-bar">
        {["all", "active", "trial", "suspended"].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="dash-card">
        <table className="dash-table">
          <thead>
            <tr>
              <th>ID</th><th>Customer</th><th>Plan</th><th>Billing</th>
              <th>Amount</th><th>Next Bill</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id}>
                <td style={{ fontWeight: 600, fontSize: 12.5, color: "rgba(15,28,46,0.55)" }}>{s.id}</td>
                <td style={{ fontWeight: 600 }}>{s.customer}</td>
                <td style={{ fontSize: 13 }}>{s.plan}</td>
                <td><span className="pill pill-gray">{s.billing}</span></td>
                <td style={{ fontWeight: 700 }}>{s.amount}</td>
                <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{s.nextBill}</td>
                <td><span className={STATUS_PILL[s.status] || "pill pill-gray"}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuotesView({ onNew }) {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Quotations</h2>
          <p className="section-sub">{MOCK.quotes.length} quotes issued</p>
        </div>
        <button className="btn-primary" onClick={onNew}>
          <Plus size={14} />
          New Quote
        </button>
      </div>
      <table className="dash-table">
        <thead>
          <tr><th>Quote ID</th><th>Customer</th><th>Plan</th><th>Value</th><th>Created</th><th>Status</th></tr>
        </thead>
        <tbody>
          {MOCK.quotes.map((q) => (
            <tr key={q.id}>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{q.id}</td>
              <td style={{ fontWeight: 600 }}>{q.customer}</td>
              <td style={{ fontSize: 13 }}>{q.plan}</td>
              <td style={{ fontWeight: 700 }}>{q.value}</td>
              <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{q.created}</td>
              <td><span className={STATUS_PILL[q.status] || "pill pill-gray"}>{q.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoicesView({ onRecord }) {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Invoices</h2>
          <p className="section-sub">All billing records</p>
        </div>
      </div>
      <table className="dash-table">
        <thead>
          <tr><th>Invoice ID</th><th>Customer</th><th>Amount</th><th>Due Date</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {MOCK.invoices.map((i) => (
            <tr key={i.id}>
              <td style={{ fontWeight: 600, fontSize: 13 }}>{i.id}</td>
              <td style={{ fontWeight: 600 }}>{i.customer}</td>
              <td style={{ fontWeight: 700 }}>{i.amount}</td>
              <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{i.due}</td>
              <td><span className={STATUS_PILL[i.status] || "pill pill-gray"}>{i.status}</span></td>
              <td>
                {i.status !== "Paid" && (
                  <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => onRecord(i)}>
                    Record Payment
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomersView() {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">My Customers</h2>
          <p className="section-sub">Accounts assigned to you</p>
        </div>
      </div>
      <table className="dash-table">
        <thead>
          <tr><th>Customer</th><th>Plan</th><th>Status</th><th>Next Bill</th><th>Amount</th></tr>
        </thead>
        <tbody>
          {MOCK.subscriptions.map((s) => (
            <tr key={s.id}>
              <td style={{ fontWeight: 600 }}>{s.customer}</td>
              <td style={{ fontSize: 13 }}>{s.plan}</td>
              <td><span className={STATUS_PILL[s.status] || "pill pill-gray"}>{s.status}</span></td>
              <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{s.nextBill}</td>
              <td style={{ fontWeight: 700 }}>{s.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Nav config ─────────────────────────────────────────────── */
const NAV = [
  {
    label: "Main",
    items: [
      { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
      { id: "customers", label: "My Customers", icon: <Users size={16} /> },
      { id: "subscriptions", label: "Subscriptions", icon: <ClipboardList size={16} /> },
    ],
  },
  {
    label: "Billing",
    items: [
      { id: "quotes", label: "Quotations", icon: <FileText size={16} /> },
      { id: "invoices", label: "Invoices", icon: <Receipt size={16} /> },
    ],
  },
];

const PAGE_TITLE = {
  overview: "Staff Overview",
  customers: "My Customers",
  subscriptions: "Subscriptions",
  quotes: "Quotations",
  invoices: "Invoices",
};

/* ── Page component ─────────────────────────────────────────── */
export default function StaffDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(MOCK.stats);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);

  useEffect(() => {
    apiRequest("/api/auth/me")
      .then((data) => {
        const role = data.user?.role;
        if (role !== "PRODUCT_OWNER" && role !== "INTERNAL" && role !== "ADMIN") {
          router.replace(data.redirect || "/login");
        } else {
          setUser(data.user);
          apiRequest("/api/v1/reports/summary")
            .then((summary) => {
              setStats([
                { ...MOCK.stats[0], value: String(summary.total_customers || 0) },
                { ...MOCK.stats[1], value: String(summary.active_subscriptions || 0) },
                { ...MOCK.stats[2], value: String(summary.overdue_invoices || 0) },
                { ...MOCK.stats[3], value: String(summary.pending_quotes || 0) },
              ]);
            })
            .catch(() => {});
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4efe6" }}>
        <RefreshCw size={28} color="#1f6f5b" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  function renderView() {
    switch (activeTab) {
      case "overview": return <Overview stats={stats} />;
      case "customers": return <CustomersView />;
      case "subscriptions": return <SubscriptionsView />;
      case "quotes": return <QuotesView onNew={() => setShowQuoteModal(true)} />;
      case "invoices": return <InvoicesView onRecord={setPayInvoice} />;
      default: return <Overview stats={stats} />;
    }
  }

  return (
    <>
      <DashboardShell
        navSections={NAV}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={PAGE_TITLE[activeTab]}
        user={user}
        roleBadge={user?.role === "ADMIN" ? "Administrator" : user?.role === "INTERNAL" || user?.role === "PRODUCT_OWNER" ? "Internal Staff" : "Customer"}
        topbarRight={
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, background: "rgba(29,78,216,0.08)", color: "#1d4ed8", padding: "5px 12px", borderRadius: 20 }}>
            <Briefcase size={13} /> Staff
          </span>
        }
      >
        {renderView()}
      </DashboardShell>

      {showQuoteModal && <NewQuoteModal onClose={() => setShowQuoteModal(false)} />}
      {payInvoice && <RecordPaymentModal invoice={payInvoice} onClose={() => setPayInvoice(null)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
