"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BarChart3,
  Settings,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  UserCheck,
  AlertCircle,
  X,
  Check,
  RefreshCw,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";

import DashboardShell from "@/components/DashboardShell";
import { apiRequest } from "@/lib/api";

/* ── Mock data (shown while API warms up or as fallback) ── */
const MOCK = {
  stats: [
    { label: "Total Revenue", value: "₹4,28,500", change: "+12.4%", up: true, icon: DollarSign, color: "#1f6f5b", bg: "rgba(31,111,91,0.1)" },
    { label: "Active Subscriptions", value: "148", change: "+8", up: true, icon: Activity, color: "#1d4ed8", bg: "rgba(29,78,216,0.08)" },
    { label: "Total Customers", value: "212", change: "+5", up: true, icon: Users, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
    { label: "Pending Invoices", value: "23", change: "-3", up: false, icon: AlertCircle, color: "#b45309", bg: "rgba(180,83,9,0.08)" },
  ],
  recentCustomers: [
    { id: 1, name: "Acme Corp", email: "admin@acme.com", plan: "Brightloop ERP Pro", status: "Active", since: "Oct 28, 2026" },
    { id: 2, name: "Nexus Retail", email: "billing@nexus.io", plan: "Brightloop POS Plus", status: "Active", since: "Oct 25, 2026" },
    { id: 3, name: "CloudFin Ltd", email: "ops@cloudfin.in", plan: "Brightloop ERP Core", status: "Trial", since: "Oct 20, 2026" },
    { id: 4, name: "Delta Logistics", email: "it@deltalog.com", plan: "Brightloop HRM", status: "Suspended", since: "Oct 15, 2026" },
    { id: 5, name: "Summit School", email: "admin@summit.edu", plan: "Brightloop ERP Core", status: "Active", since: "Oct 12, 2026" },
    { id: 6, name: "Greenleaf Pvt", email: "finance@greenleaf.in", plan: "Brightloop ERP Pro", status: "Active", since: "Oct 9, 2026" },
    { id: 7, name: "SkyLine Infra", email: "ops@skylineinfra.com", plan: "Brightloop Analytics", status: "Trial", since: "Oct 7, 2026" },
    { id: 8, name: "BrightFoods Co", email: "billing@brightfoods.co", plan: "Brightloop POS Plus", status: "Active", since: "Sep 30, 2026" },
  ],
  products: [
    { id: 1, name: "Brightloop ERP Core", type: "Software License", price: "₹12,500/mo", subscribers: 54 },
    { id: 2, name: "Brightloop ERP Pro", type: "Software License", price: "₹22,000/mo", subscribers: 38 },
    { id: 3, name: "Brightloop POS Plus", type: "Add-on", price: "₹4,500/mo", subscribers: 29 },
    { id: 4, name: "Brightloop HRM", type: "Add-on", price: "₹3,200/mo", subscribers: 17 },
    { id: 5, name: "Brightloop Analytics", type: "Add-on", price: "₹5,800/mo", subscribers: 10 },
    { id: 6, name: "Brightloop Payroll", type: "Add-on", price: "₹2,900/mo", subscribers: 12 },
    { id: 7, name: "Brightloop Support Pro", type: "Service", price: "₹6,400/mo", subscribers: 18 },
  ],
  staff: [
    { id: 1, name: "Priya Menon", email: "priya@brightloop.io", role: "Product Owner", customers: 34, since: "Jan 2025" },
    { id: 2, name: "Arjun Das", email: "arjun@brightloop.io", role: "Product Owner", customers: 28, since: "Mar 2025" },
    { id: 3, name: "Kavitha R", email: "kavitha@brightloop.io", role: "Product Owner", customers: 21, since: "Jun 2025" },
    { id: 4, name: "Rohan Iyer", email: "rohan@brightloop.io", role: "Internal Staff", customers: 18, since: "Aug 2025" },
    { id: 5, name: "Meera Nair", email: "meera@brightloop.io", role: "Internal Staff", customers: 16, since: "Sep 2025" },
  ],
};

const STATUS_PILL = {
  Active: "pill pill-green",
  Trial: "pill pill-blue",
  Suspended: "pill pill-red",
  Closed: "pill pill-gray",
};

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString("en-IN")}`;
}

function normalizeProduct(item) {
  const payload = item?.payload || item || {};
  const rawPrice = payload.sales_price ?? payload.price ?? payload.amount ?? payload.total_amount ?? 0;
  return {
    id: item?.id || payload.id || "prod-unknown",
    name: payload.name || payload.title || "Untitled product",
    type: payload.type || "Software License",
    price: rawPrice !== 0 ? `${formatCurrency(rawPrice)}/mo` : "₹0/mo",
    subscribers: Number(payload.subscribers || payload.customer_count || 0),
  };
}

/* ── Create Product Owner Modal ─────────────────────────────── */
function CreateOwnerModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "" });
  const [roleType, setRoleType] = useState("INTERNAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field, val) {
    setForm((f) => ({ ...f, [field]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = roleType === "INTERNAL" ? "/api/auth/staff" : "/api/auth/product-owners";
      await apiRequest(endpoint, { method: "POST", body: form });
      onCreated();
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
            <h2 className="modal-title">Add Staff Member</h2>
            <p className="modal-sub">Create a new Internal Staff or Product Owner account.</p>
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
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Role Type</label>
            <select
              className="form-select"
              value={roleType}
              onChange={(e) => setRoleType(e.target.value)}
            >
              <option value="INTERNAL">Internal Staff (/api/auth/staff)</option>
              <option value="PRODUCT_OWNER">Product Owner (/api/auth/product-owners)</option>
            </select>
          </div>
          {[
            { field: "full_name", label: "Full name", type: "text" },
            { field: "email", label: "Email address", type: "email" },
            { field: "password", label: "Password", type: "password" },
            { field: "confirm_password", label: "Confirm password", type: "password" },
          ].map(({ field, label, type }) => (
            <div className="form-group" key={field}>
              <label className="form-label">{label}</label>
              <input
                className="form-input"
                type={type}
                value={form[field]}
                onChange={(e) => set(field, e.target.value)}
                required
              />
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
              {loading ? "Creating…" : "Create account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Sub-views ────────────────────────────────────────────────── */
function EmptyTableState({ icon: Icon, title, description }) {
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
              <h2 className="section-title">Recent Customers</h2>
              <p className="section-sub">Latest onboarded accounts</p>
            </div>
          </div>
          <table className="dash-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK.recentCustomers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(15,28,46,0.45)" }}>{c.since}</div>
                  </td>
                  <td style={{ fontSize: 12.5, color: "rgba(15,28,46,0.65)" }}>{c.plan}</td>
                  <td>
                    <span className={STATUS_PILL[c.status] || "pill pill-gray"}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="dash-card">
          <div className="section-head">
            <div>
              <h2 className="section-title">Revenue by Plan</h2>
              <p className="section-sub">Subscriber distribution</p>
            </div>
          </div>
          {MOCK.products.map((p) => (
            <div key={p.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: "rgba(15,28,46,0.5)" }}>{p.subscribers} subs</span>
              </div>
              <div style={{ background: "rgba(15,28,46,0.07)", borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    borderRadius: 6,
                    background: "linear-gradient(90deg, #1f6f5b, #4ade80)",
                    width: `${Math.round((p.subscribers / 54) * 100)}%`,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CustomersView() {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">All Customers</h2>
          <p className="section-sub">{MOCK.recentCustomers.length} registered accounts</p>
        </div>
      </div>
      {MOCK.recentCustomers.length === 0 ? (
        <EmptyTableState
          icon={Users}
          title="No customers found"
          description="There are no registered customer accounts to display yet."
        />
      ) : (
        <table className="dash-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Member Since</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.recentCustomers.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td style={{ color: "rgba(15,28,46,0.55)", fontSize: 13 }}>{c.email}</td>
                <td style={{ fontSize: 13 }}>{c.plan}</td>
                <td><span className={STATUS_PILL[c.status] || "pill pill-gray"}>{c.status}</span></td>
                <td style={{ color: "rgba(15,28,46,0.5)", fontSize: 13 }}>{c.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ProductsView({ products = [], loading = false, error = "" }) {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Product Catalogue</h2>
          <p className="section-sub">All subscription products</p>
        </div>
        <button className="btn-primary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
          <Plus size={14} />
          Add Product
        </button>
      </div>
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13, color: "#1f6f5b", fontWeight: 600 }}>
          <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
          Loading products…
        </div>
      )}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.14)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#b91c1c", fontWeight: 500 }}>
          {error}
        </div>
      )}
      {products.length === 0 ? (
        <EmptyTableState
          icon={Package}
          title="No products available"
          description="The product catalog is empty right now."
        />
      ) : (
        <table className="dash-table">
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Type</th>
              <th>Price</th>
              <th>Subscribers</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 600 }}>{p.name}</td>
                <td>
                  <span className={p.type === "Software License" ? "pill pill-moss" : "pill pill-blue"}>
                    {p.type}
                  </span>
                </td>
                <td style={{ fontWeight: 600 }}>{p.price}</td>
                <td style={{ fontWeight: 700, color: "#1f6f5b" }}>{p.subscribers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function StaffView({ onAddStaff }) {
  return (
    <div className="dash-card">
      <div className="section-head">
        <div>
          <h2 className="section-title">Staff Members</h2>
          <p className="section-sub">Product Owner accounts</p>
        </div>
        <button className="btn-primary" onClick={onAddStaff}>
          <Plus size={14} />
          Add Staff
        </button>
      </div>
      {MOCK.staff.length === 0 ? (
        <EmptyTableState
          icon={UserCheck}
          title="No staff members yet"
          description="Add a staff or product owner account to get started."
        />
      ) : (
        <table className="dash-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Customers Managed</th>
              <th>Member Since</th>
            </tr>
          </thead>
          <tbody>
            {MOCK.staff.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: "linear-gradient(135deg, #1f6f5b, #4ade80)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, color: "white",
                      }}
                    >
                      {s.name[0]}
                    </div>
                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                  </div>
                </td>
                <td style={{ fontSize: 13, color: "rgba(15,28,46,0.55)" }}>{s.email}</td>
                <td><span className="pill pill-moss">{s.role}</span></td>
                <td style={{ fontWeight: 700 }}>{s.customers}</td>
                <td style={{ color: "rgba(15,28,46,0.5)", fontSize: 13 }}>{s.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReportsView() {
  return (
    <div className="dash-card">
      <div className="empty-state">
        <div className="empty-icon">
          <BarChart3 size={22} color="rgba(15,28,46,0.3)" />
        </div>
        <h3 className="empty-title">Reports coming soon</h3>
        <p className="empty-body">
          Revenue analytics, churn metrics, and MRR trends will be available here once
          live data is connected.
        </p>
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="dash-card">
      <div className="empty-state">
        <div className="empty-icon">
          <Settings size={22} color="rgba(15,28,46,0.3)" />
        </div>
        <h3 className="empty-title">System Settings</h3>
        <p className="empty-body">
          Tax rules, discount policies, billing cycles, and notification preferences
          will be configurable here.
        </p>
      </div>
    </div>
  );
}

/* ── Nav config ────────────────────────────────────────────────── */
const NAV = [
  {
    label: "Main",
    items: [
      { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
      { id: "customers", label: "Customers", icon: <Users size={16} /> },
      { id: "products", label: "Products", icon: <Package size={16} /> },
    ],
  },
  {
    label: "Management",
    items: [
      { id: "staff", label: "Staff", icon: <UserCheck size={16} /> },
      { id: "reports", label: "Reports", icon: <BarChart3 size={16} /> },
      { id: "settings", label: "Settings", icon: <Settings size={16} /> },
    ],
  },
];

const PAGE_TITLE = {
  overview: "Dashboard Overview",
  customers: "Customers",
  products: "Products",
  staff: "Staff Members",
  reports: "Reports & Analytics",
  settings: "System Settings",
};

/* ── Page component ────────────────────────────────────────────── */
export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const [products, setProducts] = useState(MOCK.products);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(MOCK.stats);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerCreated, setOwnerCreated] = useState(false);

  useEffect(() => {
    apiRequest("/api/auth/me")
      .then((data) => {
        if (data.user?.role !== "ADMIN") {
          router.replace(data.redirect || "/login");
        } else {
          setUser(data.user);
          setSummaryLoading(true);
          setProductsLoading(true);
          apiRequest("/api/v1/reports/summary")
            .then((summary) => {
              setSummaryError("");
              setStats([
                { ...MOCK.stats[0], value: `₹${Number(summary.revenue_collected || 0).toLocaleString("en-IN")}` },
                { ...MOCK.stats[1], value: String(summary.active_subscriptions || 0) },
                { ...MOCK.stats[2], value: String(summary.total_customers || 0) },
                { ...MOCK.stats[3], value: String(summary.overdue_invoices || 0) },
              ]);
            })
            .catch((error) => {
              setSummaryError(error.message || "Unable to load admin summary right now.");
            })
            .finally(() => setSummaryLoading(false));

          apiRequest("/api/v1/catalog/products?page_size=50")
            .then((payload) => {
              const rows = Array.isArray(payload.items) ? payload.items : [];
              setProductsError("");
              setProducts(rows.length ? rows.map(normalizeProduct) : MOCK.products);
            })
            .catch((error) => {
              setProductsError(error.message || "Unable to load the product catalog right now.");
              setProducts(MOCK.products);
            })
            .finally(() => setProductsLoading(false));
        }
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f4efe6" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <RefreshCw size={28} color="#1f6f5b" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 14, color: "rgba(15,28,46,0.5)", fontWeight: 500 }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  function renderView() {
    switch (activeTab) {
      case "overview": return <Overview stats={stats} />;
      case "customers": return <CustomersView />;
      case "products": return <ProductsView products={products} loading={productsLoading} error={productsError} />;
      case "staff": return <StaffView onAddStaff={() => setShowOwnerModal(true)} />;
      case "reports": return <ReportsView />;
      case "settings": return <SettingsView />;
      default: return <Overview stats={stats} />;
    }
  }

  return (
    <>
      <DashboardShell
        navSections={NAV}
        activeTab={activeTab}
        onTabChange={(id) => { setActiveTab(id); setOwnerCreated(false); }}
        title={PAGE_TITLE[activeTab]}
        user={user}
        roleBadge="Administrator"
        topbarRight={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: 600,
                background: "rgba(31,111,91,0.1)", color: "#1f6f5b",
                padding: "5px 12px", borderRadius: 20,
              }}
            >
              <ShieldCheck size={13} /> Admin
            </span>
          </div>
        }
      >
        {summaryLoading && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "rgba(31,111,91,0.06)", border: "1px solid rgba(31,111,91,0.12)",
              borderRadius: 12, padding: "10px 14px", marginBottom: 20,
              fontSize: 13, color: "#1f6f5b", fontWeight: 600,
            }}
          >
            <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
            Loading summary…
          </div>
        )}
        {summaryError && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.14)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: "#b91c1c", fontWeight: 500,
            }}
          >
            {summaryError}
          </div>
        )}
        {ownerCreated && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: 12, padding: "12px 16px", marginBottom: 20,
              fontSize: 13, color: "#16a34a", fontWeight: 500,
            }}
          >
            <Check size={15} />
            Staff member account created successfully.
          </div>
        )}
        {renderView()}
      </DashboardShell>

      {showOwnerModal && (
        <CreateOwnerModal
          onClose={() => setShowOwnerModal(false)}
          onCreated={() => {
            setShowOwnerModal(false);
            setOwnerCreated(true);
          }}
        />
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
