"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  FileText,
  Settings,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  Package,
  Building2,
  ChevronRight,
  X,
  Check,
  Calendar,
  Zap,
} from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import { apiRequest } from "@/lib/api";

/* ── Mock data ────────────────────────────────────────────────── */
const MOCK = {
  company: {
    name: "Acme Corp",
    taxId: "27AABCA1234L1ZN",
    address: "14, Park Street, Mumbai - 400001, Maharashtra",
    contact: "admin@acme.com",
  },
  subscriptions: [
    {
      id: "SUB-001",
      plan: "Brightloop ERP Pro",
      billing: "Monthly",
      amount: "₹22,000",
      status: "Active",
      addons: ["Brightloop HRM", "Brightloop Analytics"],
      nextBill: "Nov 1, 2026",
      startDate: "Jan 1, 2026",
    },
    {
      id: "SUB-002",
      plan: "Brightloop POS Plus",
      billing: "Quarterly",
      amount: "₹12,000",
      status: "Active",
      addons: [],
      nextBill: "Dec 1, 2026",
      startDate: "Jul 1, 2026",
    },
    {
      id: "SUB-003",
      plan: "Brightloop ERP Core",
      billing: "Monthly",
      amount: "₹12,500",
      status: "Trial",
      addons: ["Brightloop Payroll"],
      nextBill: "Nov 12, 2026",
      startDate: "Mar 5, 2026",
    },
    {
      id: "SUB-004",
      plan: "Brightloop HRM",
      billing: "Annual",
      amount: "₹38,400",
      status: "Active",
      addons: ["Brightloop Support Pro"],
      nextBill: "Dec 10, 2026",
      startDate: "Feb 18, 2026",
    },
  ],
  invoices: [
    { id: "INV-2026-088", plan: "Brightloop ERP Pro", amount: "₹22,000", period: "Nov 2026", due: "Nov 1, 2026", status: "Unpaid" },
    { id: "INV-2026-082", plan: "Brightloop ERP Pro", amount: "₹22,000", period: "Oct 2026", due: "Oct 1, 2026", status: "Paid" },
    { id: "INV-2026-076", plan: "Brightloop ERP Pro", amount: "₹22,000", period: "Sep 2026", due: "Sep 1, 2026", status: "Paid" },
    { id: "INV-2026-070", plan: "Brightloop ERP Pro", amount: "₹22,000", period: "Aug 2026", due: "Aug 1, 2026", status: "Paid" },
    { id: "INV-2026-044", plan: "Brightloop POS Plus", amount: "₹12,000", period: "Q3 2026", due: "Sep 1, 2026", status: "Paid" },
    { id: "INV-2026-039", plan: "Brightloop HRM", amount: "₹38,400", period: "Q4 2026", due: "Oct 22, 2026", status: "Paid" },
  ],
  payments: [
    { id: "PAY-2026-082", invoice: "INV-2026-082", amount: "₹22,000", method: "Bank Transfer", date: "Oct 2, 2026", ref: "TXN8834411200" },
    { id: "PAY-2026-076", invoice: "INV-2026-076", amount: "₹22,000", method: "UPI", date: "Sep 3, 2026", ref: "UPI990882217" },
    { id: "PAY-2026-070", invoice: "INV-2026-070", amount: "₹22,000", method: "Bank Transfer", date: "Aug 4, 2026", ref: "TXN7721100384" },
    { id: "PAY-2026-044", invoice: "INV-2026-044", amount: "₹12,000", method: "Cheque", date: "Sep 5, 2026", ref: "CHQ00448812" },
    { id: "PAY-2026-039", invoice: "INV-2026-039", amount: "₹38,400", method: "UPI", date: "Oct 24, 2026", ref: "UPI983114552" },
  ],
};

const STATUS_PILL = {
  Active: "pill pill-green",
  Trial: "pill pill-blue",
  Suspended: "pill pill-red",
  Paid: "pill pill-green",
  Unpaid: "pill pill-amber",
  Overdue: "pill pill-red",
  Draft: "pill pill-gray",
  Confirmed: "pill pill-blue",
  Closed: "pill pill-gray",
};

function moneyString(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeSubscription(item) {
  const payload = item?.payload || item || {};
  const amountValue = payload.total_amount ?? payload.amount ?? payload.current_total ?? 0;
  return {
    id: item?.id || payload.id || payload.subscription_number || "SUB-unknown",
    plan: payload.plan_name || payload.plan || payload.name || "Brightloop subscription",
    billing: payload.billing_interval ? titleCase(payload.billing_interval) : "Monthly",
    amount: moneyString(amountValue),
    status: payload.status || "Active",
    addons: Array.isArray(payload.lines)
      ? payload.lines
          .map((line) => line.product_name || line.name)
          .filter(Boolean)
          .slice(0, 3)
      : [],
    nextBill: payload.next_billing_date || payload.next_bill || "—",
    startDate: payload.start_date || payload.created_at || "—",
  };
}

function normalizeInvoice(item) {
  const payload = item?.payload || item || {};
  const amountValue = payload.total_amount ?? payload.amount ?? payload.amount_due ?? 0;
  return {
    id: payload.invoice_number || item?.id || payload.id || "INV-unknown",
    plan: payload.plan_name || payload.subscription_number || payload.customer_name || "Brightloop plan",
    amount: moneyString(amountValue),
    period: payload.period_start && payload.period_end
      ? `${payload.period_start} to ${payload.period_end}`
      : payload.issue_date || payload.due_date || "—",
    due: payload.due_date || payload.issue_date || "—",
    status: payload.status || "Draft",
  };
}

function normalizePayment(item) {
  const payload = item?.payload || item || {};
  return {
    id: payload.payment_number || item?.id || payload.id || "PAY-unknown",
    invoice: payload.invoice_number || payload.invoice_id || "—",
    amount: moneyString(payload.amount ?? 0),
    method: payload.payment_method || "Bank Transfer",
    date: payload.payment_date || payload.created_at || "—",
    ref: payload.reference || payload.id || "—",
  };
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={22} color="rgba(15,28,46,0.3)" />
      </div>
      <h3 className="empty-title">{title}</h3>
      <p className="empty-body">{description}</p>
    </div>
  );
}

/* ── Pay Invoice Modal ───────────────────────────────────────── */
function PayModal({ invoice, onClose }) {
  const [method, setMethod] = useState("Bank Transfer");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    setDone(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h2 className="modal-title">Pay Invoice</h2>
            <p className="modal-sub">{invoice.id} · {invoice.plan} · {invoice.amount}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(15,28,46,0.4)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "28px 0" }}>
            <CheckCircle2 size={48} color="#16a34a" style={{ margin: "0 auto 14px" }} />
            <p style={{ fontWeight: 700, fontSize: 16 }}>Payment submitted!</p>
            <p style={{ fontSize: 13, color: "rgba(15,28,46,0.5)", marginTop: 6 }}>
              Your payment will be confirmed by our team shortly.
            </p>
          </div>
        ) : (
          <>
            {/* Invoice summary */}
            <div style={{ background: "rgba(15,28,46,0.04)", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>Plan</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{invoice.plan}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>Period</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{invoice.period}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(15,28,46,0.07)", paddingTop: 10, marginTop: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Total Due</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#1f6f5b" }}>{invoice.amount}</span>
              </div>
            </div>

            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>Bank Transfer</option>
                  <option>UPI</option>
                  <option>Cheque</option>
                  <option>Cash</option>
                  <option>Credit Card</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Transaction Reference (optional)</label>
                <input className="form-input" placeholder="e.g. UPI1234567890" value={ref} onChange={(e) => setRef(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
                  {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <CreditCard size={14} />}
                  {loading ? "Processing…" : "Submit Payment"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-views ────────────────────────────────────────────────── */
function Overview({ company, subscriptions, invoices }) {
  const unpaid = invoices.filter((i) => i.status !== "Paid");
  const active = subscriptions.filter((s) => s.status === "Active");

  return (
    <div>
      <div
        style={{
          background: "linear-gradient(135deg, #0f1c2e 0%, #1f3a5a 100%)",
          borderRadius: 20,
          padding: "28px 32px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute", inset: 0, opacity: 0.07,
            backgroundImage: "radial-gradient(circle at 80% 50%, #4ade80 0%, transparent 60%)",
          }}
        />
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
          Your Subscription Portal
        </p>
        <h2 style={{ fontSize: 26, fontWeight: 800, color: "white", letterSpacing: "-0.02em", marginBottom: 6 }}>
          Welcome back, {company.name}
        </h2>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.55)" }}>
          You have <strong style={{ color: "white" }}>{active.length} active</strong> subscription{active.length !== 1 ? "s" : ""}
          {unpaid.length > 0 && (
            <> and <strong style={{ color: "#fbbf24" }}>{unpaid.length} unpaid</strong> invoice{unpaid.length !== 1 ? "s" : ""}</>
          )}.
        </p>
      </div>

      <div className="two-col">
        <div className="dash-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">Active Subscriptions</h2>
              <p className="section-sub">Your current plans</p>
            </div>
          </div>
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No active subscriptions"
              description="Your subscription list will appear here once your account is connected to a plan."
            />
          ) : (
            subscriptions.map((s) => (
              <div key={s.id} style={{ border: "1px solid rgba(15,28,46,0.07)", borderRadius: 14, padding: "16px 18px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14 }}>{s.plan}</p>
                    <p style={{ fontSize: 12, color: "rgba(15,28,46,0.45)", marginTop: 3 }}>
                      {s.billing} · Since {s.startDate}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className={STATUS_PILL[s.status] || "pill pill-gray"}>{s.status}</span>
                    <p style={{ fontWeight: 800, fontSize: 16, color: "#1f6f5b", marginTop: 6 }}>{s.amount}</p>
                  </div>
                </div>
                {s.addons.length > 0 && (
                  <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {s.addons.map((a) => (
                      <span key={a} className="pill pill-gray" style={{ fontSize: 11 }}>
                        <Zap size={10} style={{ marginRight: 3 }} />{a}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(15,28,46,0.45)" }}>
                  <Calendar size={12} />
                  Next billing: <strong style={{ color: "#0f1c2e" }}>{s.nextBill}</strong>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="dash-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">Invoices</h2>
              <p className="section-sub">Recent billing history</p>
            </div>
          </div>
          {invoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No invoices yet"
              description="Invoice records will appear here once they are generated for your subscriptions."
            />
          ) : (
            <table className="dash-table">
              <thead>
                <tr><th>Invoice</th><th>Period</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {invoices.slice(0, 5).map((i) => (
                  <tr key={i.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{i.id}</td>
                    <td style={{ fontSize: 13, color: "rgba(15,28,46,0.55)" }}>{i.period}</td>
                    <td style={{ fontWeight: 700 }}>{i.amount}</td>
                    <td><span className={STATUS_PILL[i.status] || "pill pill-gray"}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SubscriptionsView({ subscriptions }) {
  return (
    <div>
      {subscriptions.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No subscriptions found"
          description="There are no subscription records attached to this account yet."
        />
      ) : (
        subscriptions.map((s) => (
          <div className="dash-card" key={s.id} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(31,111,91,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Package size={18} color="#1f6f5b" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>{s.plan}</h3>
                    <p style={{ fontSize: 12, color: "rgba(15,28,46,0.45)" }}>{s.id}</p>
                  </div>
                </div>
              </div>
              <span className={STATUS_PILL[s.status] || "pill pill-gray"}>{s.status}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: s.addons.length > 0 ? 16 : 0 }}>
              {[
                { label: "Billing Cycle", value: s.billing },
                { label: "Amount", value: s.amount },
                { label: "Next Billing", value: s.nextBill },
                { label: "Start Date", value: s.startDate },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "rgba(15,28,46,0.03)", borderRadius: 10, padding: "10px 14px" }}>
                  <p style={{ fontSize: 11, color: "rgba(15,28,46,0.4)", fontWeight: 600, marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 13.5, fontWeight: 700 }}>{value}</p>
                </div>
              ))}
            </div>

            {s.addons.length > 0 && (
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(15,28,46,0.4)", marginBottom: 8 }}>ADD-ONS</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {s.addons.map((a) => (
                    <span key={a} className="pill pill-blue" style={{ gap: 5 }}>
                      <Zap size={11} />{a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function InvoicesView({ invoices, onPay }) {
  const [tab, setTab] = useState("all");
  const filtered = tab === "all" ? invoices : invoices.filter((i) => i.status.toLowerCase() === tab);

  return (
    <div>
      <div className="tab-bar">
        {["all", "unpaid", "paid"].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="dash-card">
          <EmptyState
            icon={FileText}
            title="No invoices to display"
            description="Invoices generated for your account will appear here."
          />
        </div>
      ) : (
        <div className="dash-card">
          <table className="dash-table">
            <thead>
              <tr><th>Invoice</th><th>Plan</th><th>Period</th><th>Due Date</th><th>Amount</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td style={{ fontWeight: 600, fontSize: 13 }}>{i.id}</td>
                  <td style={{ fontSize: 13 }}>{i.plan}</td>
                  <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{i.period}</td>
                  <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{i.due}</td>
                  <td style={{ fontWeight: 700 }}>{i.amount}</td>
                  <td><span className={STATUS_PILL[i.status] || "pill pill-gray"}>{i.status}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {i.status !== "Paid" && (
                        <button className="btn-primary" style={{ padding: "5px 12px", fontSize: 12 }} onClick={() => onPay(i)}>
                          Pay Now
                        </button>
                      )}
                      <button className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}>
                        <Download size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PaymentHistoryView({ payments }) {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Payment History</h2>
          <p className="section-sub">All settled payments</p>
        </div>
      </div>
      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment history"
          description="Completed payments will appear here once they are recorded."
        />
      ) : (
        <table className="dash-table">
          <thead>
            <tr><th>Payment ID</th><th>Invoice</th><th>Amount</th><th>Method</th><th>Date</th><th>Reference</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{p.id}</td>
                <td style={{ fontSize: 13 }}>{p.invoice}</td>
                <td style={{ fontWeight: 700, color: "#1f6f5b" }}>{p.amount}</td>
                <td><span className="pill pill-gray">{p.method}</span></td>
                <td style={{ fontSize: 13, color: "rgba(15,28,46,0.5)" }}>{p.date}</td>
                <td style={{ fontSize: 12, color: "rgba(15,28,46,0.45)", fontFamily: "monospace" }}>{p.ref}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ProfileView({ user }) {
  const profileRows = [
    { label: "Full Name", value: user?.full_name || "—" },
    { label: "Email", value: user?.email || "—" },
    { label: "Account Type", value: "Customer" },
    { label: "Portal Access", value: "Self-service billing and subscription management" },
  ];

  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Company Profile</h2>
          <p className="section-sub">Your billing and account details</p>
        </div>
        <button className="btn-secondary">Edit Profile</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {profileRows.map(({ label, value }) => (
          <div key={label} style={{ background: "rgba(15,28,46,0.03)", borderRadius: 12, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(15,28,46,0.4)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
            <p style={{ fontSize: 13.5, fontWeight: 600 }}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Nav config ─────────────────────────────────────────────── */
const NAV = [
  {
    label: "",
    items: [
      { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
      { id: "subscriptions", label: "My Subscriptions", icon: <Package size={16} /> },
      { id: "invoices", label: "Invoices", icon: <Receipt size={16} /> },
      { id: "payments", label: "Payment History", icon: <CreditCard size={16} /> },
      { id: "profile", label: "Company Profile", icon: <Building2 size={16} /> },
    ],
  },
];

const PAGE_TITLE = {
  overview: "My Portal",
  subscriptions: "My Subscriptions",
  invoices: "Invoices & Statements",
  payments: "Payment History",
  profile: "Company Profile",
};

/* ── Page component ─────────────────────────────────────────── */
export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dashboardData, setDashboardData] = useState({ subscriptions: [], invoices: [], payments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [payInvoice, setPayInvoice] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCustomerDashboard() {
      try {
        const me = await apiRequest("/api/auth/me");

        if (!isMounted) return;

        if (me.user?.role !== "CUSTOMER") {
          router.replace(me.redirect || "/login");
          return;
        }

        setUser(me.user);

        const [subscriptionResponse, invoiceResponse, paymentResponse] = await Promise.all([
          apiRequest("/api/v1/subscriptions").catch(() => ({ items: [] })),
          apiRequest("/api/v1/invoices").catch(() => ({ items: [] })),
          apiRequest("/api/v1/payments").catch(() => ({ items: [] })),
        ]);

        if (!isMounted) return;

        setDashboardData({
          subscriptions: (subscriptionResponse.items || []).map(normalizeSubscription),
          invoices: (invoiceResponse.items || []).map(normalizeInvoice),
          payments: (paymentResponse.items || []).map(normalizePayment),
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || "Unable to load your customer dashboard right now.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadCustomerDashboard();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4efe6" }}>
        <RefreshCw size={28} color="#1f6f5b" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const displayUser = user ? { ...user, full_name: user.full_name || "Customer" } : { full_name: "Customer", email: "" };
  const companyName = user?.full_name || "Customer";

  function renderView() {
    switch (activeTab) {
      case "overview": return <Overview company={{ name: companyName }} subscriptions={dashboardData.subscriptions} invoices={dashboardData.invoices} />;
      case "subscriptions": return <SubscriptionsView subscriptions={dashboardData.subscriptions} />;
      case "invoices": return <InvoicesView invoices={dashboardData.invoices} onPay={setPayInvoice} />;
      case "payments": return <PaymentHistoryView payments={dashboardData.payments} />;
      case "profile": return <ProfileView user={displayUser} />;
      default: return <Overview company={{ name: companyName }} subscriptions={dashboardData.subscriptions} invoices={dashboardData.invoices} />;
    }
  }

  return (
    <>
      <DashboardShell
        navSections={NAV}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        title={PAGE_TITLE[activeTab]}
        user={displayUser}
        roleBadge="Customer Portal"
        topbarRight={
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, background: "rgba(124,58,237,0.08)", color: "#7c3aed", padding: "5px 12px", borderRadius: 20 }}>
            <Building2 size={13} /> {companyName}
          </span>
        }
      >
        {error ? (
          <div className="dash-card">
            <div style={{ padding: "18px 20px", color: "#7f1d1d", background: "rgba(239,68,68,0.06)", borderRadius: 12 }}>
              <strong>We could not load your dashboard.</strong>
              <p style={{ marginTop: 8, color: "rgba(15,28,46,0.7)" }}>{error}</p>
            </div>
          </div>
        ) : (
          renderView()
        )}
      </DashboardShell>

      {payInvoice && <PayModal invoice={payInvoice} onClose={() => setPayInvoice(null)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
