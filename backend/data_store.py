import datetime
import copy
from typing import Dict, List, Any, Optional

# Initial Seed Data for Brightloop Software Subscription Management System
SEED_PRODUCTS = [
    {
        "id": "prod_1",
        "name": "Brightloop ERP Core",
        "type": "Software License",
        "sales_price": 1200.0,
        "cost_price": 350.0,
        "notes": "Primary enterprise resource & subscription backbone license",
        "variants": [
            {"id": "var_std", "name": "Standard Edition", "extra_price": 0.0},
            {"id": "var_odoo", "name": "Odoo Brand Integration", "extra_price": 560.0},
            {"id": "var_ent", "name": "Enterprise Multi-Tenant", "extra_price": 1100.0}
        ]
    },
    {
        "id": "prod_2",
        "name": "Automated Billing & Tax Engine",
        "type": "Add-on",
        "sales_price": 350.0,
        "cost_price": 60.0,
        "notes": "Autonomous billing day generation with multi-jurisdiction tax rules",
        "variants": [
            {"id": "var_single", "name": "Single Region", "extra_price": 0.0},
            {"id": "var_global", "name": "Global Tax Compliance", "extra_price": 150.0}
        ]
    },
    {
        "id": "prod_3",
        "name": "Multi-Bank Reconciliation Sync",
        "type": "Add-on",
        "sales_price": 250.0,
        "cost_price": 40.0,
        "notes": "Automated matching of payments to invoices directly from statements",
        "variants": [
            {"id": "var_daily", "name": "Daily Sync", "extra_price": 0.0},
            {"id": "var_realtime", "name": "Realtime Webhook Sync", "extra_price": 100.0}
        ]
    },
    {
        "id": "prod_4",
        "name": "24/7 Dedicated Support SLA",
        "type": "Service",
        "sales_price": 600.0,
        "cost_price": 200.0,
        "notes": "15-minute response guarantee with dedicated technical account manager",
        "variants": [
            {"id": "var_biz", "name": "Business Hours (8x5)", "extra_price": -200.0},
            {"id": "var_247", "name": "24x7 Mission Critical", "extra_price": 0.0}
        ]
    },
    {
        "id": "prod_5",
        "name": "Client Self-Service Portal Access",
        "type": "Add-on",
        "sales_price": 180.0,
        "cost_price": 25.0,
        "notes": "Branded customer portal for invoices, plan adjustments & payments",
        "variants": []
    }
]

SEED_PLANS = [
    {
        "id": "plan_monthly",
        "name": "Monthly Growth Tier",
        "cost": 450.0,
        "billing_interval": "monthly",
        "min_quantity": 1,
        "available_start_date": "2026-01-01",
        "available_end_date": "2026-12-31",
        "auto_close_on_expiry": False,
        "allow_early_close": True,
        "allow_pause": True,
        "allow_renew": True,
        "description": "Flexible monthly subscription for scaling businesses"
    },
    {
        "id": "plan_annual",
        "name": "Annual Enterprise Contract",
        "cost": 4800.0,
        "billing_interval": "yearly",
        "min_quantity": 3,
        "available_start_date": "2026-01-01",
        "available_end_date": "2027-12-31",
        "auto_close_on_expiry": False,
        "allow_early_close": False,
        "allow_pause": True,
        "allow_renew": True,
        "description": "Committed yearly subscription with discounted bulk rates"
    },
    {
        "id": "plan_weekly",
        "name": "Weekly Sprint Pilot",
        "cost": 120.0,
        "billing_interval": "weekly",
        "min_quantity": 1,
        "available_start_date": "2026-02-01",
        "available_end_date": "2026-11-30",
        "auto_close_on_expiry": True,
        "allow_early_close": True,
        "allow_pause": False,
        "allow_renew": False,
        "description": "Short-term evaluation pilot tier that automatically closes upon term finish"
    },
    {
        "id": "plan_daily",
        "name": "Daily High-Capacity Compute",
        "cost": 25.0,
        "billing_interval": "daily",
        "min_quantity": 5,
        "available_start_date": "2026-01-01",
        "available_end_date": "2026-12-31",
        "auto_close_on_expiry": False,
        "allow_early_close": True,
        "allow_pause": True,
        "allow_renew": True,
        "description": "Burst usage plan billed daily for event-driven workloads"
    }
]

SEED_DISCOUNTS = [
    {
        "id": "disc_1",
        "code": "GROWTH2026",
        "name": "Scale-Up 15% Incentive",
        "type": "percentage",
        "value": 15.0,
        "min_purchase_amount": 500.0,
        "min_quantity": 1,
        "start_date": "2026-01-01",
        "end_date": "2026-12-31",
        "usage_limit": 100,
        "used_count": 34,
        "target": "subscription",
        "product_id": None,
        "is_active": True
    },
    {
        "id": "disc_2",
        "code": "ODOOSWITCH",
        "name": "Odoo Brand Rebate",
        "type": "fixed",
        "value": 560.0,
        "min_purchase_amount": 1000.0,
        "min_quantity": 1,
        "start_date": "2026-01-15",
        "end_date": "2026-11-30",
        "usage_limit": 50,
        "used_count": 22,
        "target": "product",
        "product_id": "prod_1",
        "is_active": True
    },
    {
        "id": "disc_3",
        "code": "EARLYBIRD100",
        "name": "First Quarter Kickoff",
        "type": "fixed",
        "value": 100.0,
        "min_purchase_amount": 300.0,
        "min_quantity": 2,
        "start_date": "2026-01-01",
        "end_date": "2026-06-30",
        "usage_limit": 200,
        "used_count": 89,
        "target": "subscription",
        "product_id": None,
        "is_active": True
    }
]

SEED_TAXES = [
    {"id": "tax_1", "name": "Standard VAT (18%)", "rate": 18.0, "region": "EU & Global Standard", "is_default": True},
    {"id": "tax_2", "name": "State Sales Tax (8.25%)", "rate": 8.25, "region": "US Commercial", "is_default": False},
    {"id": "tax_3", "name": "GST (18%)", "rate": 18.0, "region": "India / APAC", "is_default": False},
    {"id": "tax_4", "name": "Export Tax Exempt (0%)", "rate": 0.0, "region": "International Exempt", "is_default": False}
]

SEED_TEMPLATES = [
    {
        "id": "tmpl_enterprise",
        "title": "Enterprise Cloud & Support Bundle",
        "description": "Pre-configured for large organizations with ERP Core, 24/7 SLA and Banking sync",
        "validity_days": 30,
        "plan_id": "plan_annual",
        "lines": [
            {"product_id": "prod_1", "product_name": "Brightloop ERP Core", "variant": "Odoo Brand Integration", "quantity": 1, "unit_price": 1760.0},
            {"product_id": "prod_4", "product_name": "24/7 Dedicated Support SLA", "variant": "24x7 Mission Critical", "quantity": 1, "unit_price": 600.0},
            {"product_id": "prod_3", "product_name": "Multi-Bank Reconciliation Sync", "variant": "Realtime Webhook Sync", "quantity": 1, "unit_price": 350.0}
        ]
    },
    {
        "id": "tmpl_standard",
        "title": "Fast-Track Mid-Market SaaS",
        "description": "Standard monthly bundle for fast-growing startups with Core & Billing automation",
        "validity_days": 14,
        "plan_id": "plan_monthly",
        "lines": [
            {"product_id": "prod_1", "product_name": "Brightloop ERP Core", "variant": "Standard Edition", "quantity": 1, "unit_price": 1200.0},
            {"product_id": "prod_2", "product_name": "Automated Billing & Tax Engine", "variant": "Single Region", "quantity": 1, "unit_price": 350.0}
        ]
    }
]

SEED_CUSTOMERS = [
    {
        "id": "cust_1",
        "name": "Apex Global Logistics",
        "email": "billing@apexlogistics.com",
        "contact_person": "Julian Wright",
        "phone": "+1 (555) 349-2041",
        "tax_id": "VAT-US928374",
        "address": "400 Harbor Blvd, Suite 800, Seattle, WA",
        "created_at": "2026-01-10"
    },
    {
        "id": "cust_2",
        "name": "Kochi Tech Solvers",
        "email": "accounts@kochitech.io",
        "contact_person": "Divya Dharshini",
        "phone": "+91 98450 12345",
        "tax_id": "GSTIN32AAACL1234F1Z5",
        "address": "Infopark Phase 2, Kochi, Kerala",
        "created_at": "2026-01-18"
    },
    {
        "id": "cust_3",
        "name": "Boutique Artisans Ltd",
        "email": "finance@boutiqueartisans.co.uk",
        "contact_person": "Clara Oswald",
        "phone": "+44 20 7946 0912",
        "tax_id": "GB849204812",
        "address": "14 Regent Street, London",
        "created_at": "2026-02-01"
    },
    {
        "id": "cust_4",
        "name": "Zenith FinTech Corp",
        "email": "procurement@zenithfintech.com",
        "contact_person": "Nathan Drake",
        "phone": "+1 (415) 890-4412",
        "tax_id": "US-CA882193",
        "address": "555 Market St, San Francisco, CA",
        "created_at": "2026-02-14"
    },
    {
        "id": "cust_5",
        "name": "Horizon Retailers",
        "email": "contact@horizonretail.com",
        "contact_person": "Amara Diallo",
        "phone": "+33 1 42 68 55 00",
        "tax_id": "FR493029104",
        "address": "22 Rue de Rivoli, Paris",
        "created_at": "2026-03-01"
    }
]

SEED_SUBSCRIPTIONS = [
    {
        "id": "sub_1",
        "subscription_number": "SUB-2026-001",
        "customer_id": "cust_1",
        "customer_name": "Apex Global Logistics",
        "customer_email": "billing@apexlogistics.com",
        "plan_id": "plan_annual",
        "plan_name": "Annual Enterprise Contract",
        "status": "Active",
        "start_date": "2026-01-15",
        "expiry_date": "2027-01-14",
        "next_billing_date": "2026-11-01",
        "billing_interval": "yearly",
        "payment_terms": "Net 30",
        "auto_renew": True,
        "discount_code": "GROWTH2026",
        "tax_id": "tax_1",
        "lines": [
            {
                "id": "line_1",
                "product_id": "prod_1",
                "product_name": "Brightloop ERP Core",
                "variant": "Odoo Brand Integration",
                "quantity": 1,
                "unit_price": 1760.0,
                "discount_rate": 15.0,
                "tax_rate": 18.0,
                "amount": 1764.52
            },
            {
                "id": "line_2",
                "product_id": "prod_4",
                "product_name": "24/7 Dedicated Support SLA",
                "variant": "24x7 Mission Critical",
                "quantity": 1,
                "unit_price": 600.0,
                "discount_rate": 15.0,
                "tax_rate": 18.0,
                "amount": 601.80
            }
        ],
        "subtotal": 2360.0,
        "discount_total": 354.0,
        "tax_total": 361.08,
        "total_amount": 2367.08
    },
    {
        "id": "sub_2",
        "subscription_number": "SUB-2026-002",
        "customer_id": "cust_2",
        "customer_name": "Kochi Tech Solvers",
        "customer_email": "accounts@kochitech.io",
        "plan_id": "plan_monthly",
        "plan_name": "Monthly Growth Tier",
        "status": "Active",
        "start_date": "2026-02-01",
        "expiry_date": "2026-12-31",
        "next_billing_date": "2026-11-01",
        "billing_interval": "monthly",
        "payment_terms": "Net 15",
        "auto_renew": True,
        "discount_code": "ODOOSWITCH",
        "tax_id": "tax_3",
        "lines": [
            {
                "id": "line_3",
                "product_id": "prod_1",
                "product_name": "Brightloop ERP Core",
                "variant": "Standard Edition",
                "quantity": 2,
                "unit_price": 1200.0,
                "discount_rate": 0.0,
                "tax_rate": 18.0,
                "amount": 2832.00
            },
            {
                "id": "line_4",
                "product_id": "prod_2",
                "product_name": "Automated Billing & Tax Engine",
                "variant": "Single Region",
                "quantity": 1,
                "unit_price": 350.0,
                "discount_rate": 0.0,
                "tax_rate": 18.0,
                "amount": 413.00
            }
        ],
        "subtotal": 2750.0,
        "discount_total": 560.0,
        "tax_total": 394.20,
        "total_amount": 2584.20
    },
    {
        "id": "sub_3",
        "subscription_number": "SUB-2026-003",
        "customer_id": "cust_3",
        "customer_name": "Boutique Artisans Ltd",
        "customer_email": "finance@boutiqueartisans.co.uk",
        "plan_id": "plan_monthly",
        "plan_name": "Monthly Growth Tier",
        "status": "Active",
        "start_date": "2026-02-15",
        "expiry_date": "2027-02-14",
        "next_billing_date": "2026-11-15",
        "billing_interval": "monthly",
        "payment_terms": "Due on Receipt",
        "auto_renew": True,
        "discount_code": None,
        "tax_id": "tax_1",
        "lines": [
            {
                "id": "line_5",
                "product_id": "prod_1",
                "product_name": "Brightloop ERP Core",
                "variant": "Standard Edition",
                "quantity": 1,
                "unit_price": 1200.0,
                "discount_rate": 0.0,
                "tax_rate": 18.0,
                "amount": 1416.00
            }
        ],
        "subtotal": 1200.0,
        "discount_total": 0.0,
        "tax_total": 216.0,
        "total_amount": 1416.00
    },
    {
        "id": "sub_4",
        "subscription_number": "SUB-2026-004",
        "customer_id": "cust_4",
        "customer_name": "Zenith FinTech Corp",
        "customer_email": "procurement@zenithfintech.com",
        "plan_id": "plan_annual",
        "plan_name": "Annual Enterprise Contract",
        "status": "Confirmed",
        "start_date": "2026-11-01",
        "expiry_date": "2027-10-31",
        "next_billing_date": "2026-11-01",
        "billing_interval": "yearly",
        "payment_terms": "Net 30",
        "auto_renew": True,
        "discount_code": "GROWTH2026",
        "tax_id": "tax_2",
        "lines": [
            {
                "id": "line_6",
                "product_id": "prod_1",
                "product_name": "Brightloop ERP Core",
                "variant": "Enterprise Multi-Tenant",
                "quantity": 1,
                "unit_price": 2300.0,
                "discount_rate": 15.0,
                "tax_rate": 8.25,
                "amount": 2116.29
            }
        ],
        "subtotal": 2300.0,
        "discount_total": 345.0,
        "tax_total": 161.29,
        "total_amount": 2116.29
    },
    {
        "id": "sub_5",
        "subscription_number": "SUB-2026-005",
        "customer_id": "cust_5",
        "customer_name": "Horizon Retailers",
        "customer_email": "contact@horizonretail.com",
        "plan_id": "plan_monthly",
        "plan_name": "Monthly Growth Tier",
        "status": "Quotation",
        "start_date": "2026-11-05",
        "expiry_date": "2027-11-04",
        "next_billing_date": "2026-11-05",
        "billing_interval": "monthly",
        "payment_terms": "Net 15",
        "auto_renew": True,
        "discount_code": None,
        "tax_id": "tax_1",
        "lines": [
            {
                "id": "line_7",
                "product_id": "prod_1",
                "product_name": "Brightloop ERP Core",
                "variant": "Standard Edition",
                "quantity": 1,
                "unit_price": 1200.0,
                "discount_rate": 0.0,
                "tax_rate": 18.0,
                "amount": 1416.0
            }
        ],
        "subtotal": 1200.0,
        "discount_total": 0.0,
        "tax_total": 216.0,
        "total_amount": 1416.00
    },
    {
        "id": "sub_6",
        "subscription_number": "SUB-2026-006",
        "customer_id": "cust_1",
        "customer_name": "Apex Global Logistics",
        "customer_email": "billing@apexlogistics.com",
        "plan_id": "plan_weekly",
        "plan_name": "Weekly Sprint Pilot",
        "status": "Paused",
        "start_date": "2026-08-01",
        "expiry_date": "2026-10-15",
        "next_billing_date": "2026-11-10",
        "billing_interval": "weekly",
        "payment_terms": "Net 15",
        "auto_renew": False,
        "discount_code": None,
        "tax_id": "tax_1",
        "lines": [
            {
                "id": "line_8",
                "product_id": "prod_5",
                "product_name": "Client Self-Service Portal Access",
                "variant": "Standard",
                "quantity": 2,
                "unit_price": 180.0,
                "discount_rate": 0.0,
                "tax_rate": 18.0,
                "amount": 424.80
            }
        ],
        "subtotal": 360.0,
        "discount_total": 0.0,
        "tax_total": 64.80,
        "total_amount": 424.80
    }
]

SEED_INVOICES = [
    {
        "id": "inv_101",
        "invoice_number": "INV-2026-0101",
        "subscription_id": "sub_1",
        "subscription_number": "SUB-2026-001",
        "customer_id": "cust_1",
        "customer_name": "Apex Global Logistics",
        "customer_email": "billing@apexlogistics.com",
        "issue_date": "2026-10-01",
        "due_date": "2026-10-31",
        "status": "Paid",
        "subtotal": 2360.0,
        "discount_amount": 354.0,
        "tax_amount": 361.08,
        "total_amount": 2367.08,
        "amount_paid": 2367.08,
        "amount_due": 0.0,
        "lines": [
            {"product_name": "Brightloop ERP Core (Odoo Brand)", "quantity": 1, "unit_price": 1760.0, "total": 1760.0},
            {"product_name": "24/7 Dedicated Support SLA", "quantity": 1, "unit_price": 600.0, "total": 600.0}
        ]
    },
    {
        "id": "inv_102",
        "invoice_number": "INV-2026-0102",
        "subscription_id": "sub_2",
        "subscription_number": "SUB-2026-002",
        "customer_id": "cust_2",
        "customer_name": "Kochi Tech Solvers",
        "customer_email": "accounts@kochitech.io",
        "issue_date": "2026-10-01",
        "due_date": "2026-10-16",
        "status": "Confirmed",  # Overdue (due Oct 16)
        "subtotal": 2750.0,
        "discount_amount": 560.0,
        "tax_amount": 394.20,
        "total_amount": 2584.20,
        "amount_paid": 0.0,
        "amount_due": 2584.20,
        "lines": [
            {"product_name": "Brightloop ERP Core (Standard)", "quantity": 2, "unit_price": 1200.0, "total": 2400.0},
            {"product_name": "Automated Billing & Tax Engine", "quantity": 1, "unit_price": 350.0, "total": 350.0}
        ]
    },
    {
        "id": "inv_103",
        "invoice_number": "INV-2026-0103",
        "subscription_id": "sub_3",
        "subscription_number": "SUB-2026-003",
        "customer_id": "cust_3",
        "customer_name": "Boutique Artisans Ltd",
        "customer_email": "finance@boutiqueartisans.co.uk",
        "issue_date": "2026-10-15",
        "due_date": "2026-10-15",
        "status": "Paid",
        "subtotal": 1200.0,
        "discount_amount": 0.0,
        "tax_amount": 216.0,
        "total_amount": 1416.00,
        "amount_paid": 1416.00,
        "amount_due": 0.0,
        "lines": [
            {"product_name": "Brightloop ERP Core", "quantity": 1, "unit_price": 1200.0, "total": 1200.0}
        ]
    },
    {
        "id": "inv_104",
        "invoice_number": "INV-2026-0104",
        "subscription_id": "sub_1",
        "subscription_number": "SUB-2026-001",
        "customer_id": "cust_1",
        "customer_name": "Apex Global Logistics",
        "customer_email": "billing@apexlogistics.com",
        "issue_date": "2026-10-31",
        "due_date": "2026-11-30",
        "status": "Draft",  # Billing Day candidate ready to confirm
        "subtotal": 2360.0,
        "discount_amount": 354.0,
        "tax_amount": 361.08,
        "total_amount": 2367.08,
        "amount_paid": 0.0,
        "amount_due": 2367.08,
        "lines": [
            {"product_name": "Brightloop ERP Core (Odoo Brand)", "quantity": 1, "unit_price": 1760.0, "total": 1760.0},
            {"product_name": "24/7 Dedicated Support SLA", "quantity": 1, "unit_price": 600.0, "total": 600.0}
        ]
    }
]

SEED_PAYMENTS = [
    {
        "id": "pay_501",
        "payment_number": "PAY-2026-00501",
        "invoice_id": "inv_101",
        "invoice_number": "INV-2026-0101",
        "customer_name": "Apex Global Logistics",
        "amount": 2367.08,
        "payment_method": "Bank Wire Transfer",
        "payment_date": "2026-10-20",
        "reference": "WIRE-REF-99218204",
        "status": "Success",
        "notes": "Matched automatically via Multi-Bank Reconciliation"
    },
    {
        "id": "pay_502",
        "payment_number": "PAY-2026-00502",
        "invoice_id": "inv_103",
        "invoice_number": "INV-2026-0103",
        "customer_name": "Boutique Artisans Ltd",
        "amount": 1416.00,
        "payment_method": "Credit Card (Stripe)",
        "payment_date": "2026-10-15",
        "reference": "ch_3M4829Xkla",
        "status": "Success",
        "notes": "Paid through Customer Portal directly"
    }
]

SEED_STAFF = [
    {
        "id": "stf_1",
        "name": "Eleanor Vance",
        "email": "eleanor.vance@brightloop.io",
        "role": "Operations & Admin Lead",
        "status": "Active",
        "joined_date": "2025-03-10"
    },
    {
        "id": "stf_2",
        "name": "Marcus Chen",
        "email": "marcus.chen@brightloop.io",
        "role": "Senior Sales Account Executive",
        "status": "Active",
        "joined_date": "2025-06-15"
    },
    {
        "id": "stf_3",
        "name": "Sarah Jenkins",
        "email": "sarah.j@brightloop.io",
        "role": "Billing & Invoicing Specialist",
        "status": "Active",
        "joined_date": "2025-08-01"
    },
    {
        "id": "stf_4",
        "name": "David Patel",
        "email": "david.patel@brightloop.io",
        "role": "Customer Success Representative",
        "status": "Active",
        "joined_date": "2026-01-10"
    }
]


class BrightloopDataStore:
    def __init__(self):
        self.products = copy.deepcopy(SEED_PRODUCTS)
        self.plans = copy.deepcopy(SEED_PLANS)
        self.discounts = copy.deepcopy(SEED_DISCOUNTS)
        self.taxes = copy.deepcopy(SEED_TAXES)
        self.templates = copy.deepcopy(SEED_TEMPLATES)
        self.customers = copy.deepcopy(SEED_CUSTOMERS)
        self.subscriptions = copy.deepcopy(SEED_SUBSCRIPTIONS)
        self.invoices = copy.deepcopy(SEED_INVOICES)
        self.payments = copy.deepcopy(SEED_PAYMENTS)
        self.staff = copy.deepcopy(SEED_STAFF)

    # ------------------ ADMIN METRICS & ACTIONS ------------------
    def get_admin_metrics(self) -> Dict[str, Any]:
        active_subs = [s for s in self.subscriptions if s["status"] == "Active"]
        total_revenue = sum(p["amount"] for p in self.payments if p["status"] == "Success")
        
        # Calculate Monthly Recurring Revenue (MRR)
        mrr = 0.0
        for s in active_subs:
            total_amt = s.get("total_amount", 0.0)
            interval = s.get("billing_interval", "monthly")
            if interval == "monthly":
                mrr += total_amt
            elif interval == "yearly":
                mrr += total_amt / 12.0
            elif interval == "weekly":
                mrr += total_amt * 4.33
            elif interval == "daily":
                mrr += total_amt * 30.0

        arr = mrr * 12.0

        # Outstanding & Overdue invoices
        outstanding_invoices = [inv for inv in self.invoices if inv["status"] in ["Draft", "Confirmed"]]
        overdue_invoices = [inv for inv in self.invoices if inv["status"] == "Confirmed" and inv["amount_due"] > 0]
        overdue_amount = sum(inv["amount_due"] for inv in overdue_invoices)
        total_taxes_collected = sum(inv["tax_amount"] for inv in self.invoices if inv["status"] == "Paid")

        return {
            "mrr": round(mrr, 2),
            "arr": round(arr, 2),
            "total_revenue": round(total_revenue, 2),
            "active_subscriptions_count": len(active_subs),
            "total_subscriptions_count": len(self.subscriptions),
            "overdue_invoices_count": len(overdue_invoices),
            "overdue_amount": round(overdue_amount, 2),
            "total_taxes_collected": round(total_taxes_collected, 2),
            "total_customers_count": len(self.customers),
            "total_staff_count": len(self.staff),
            "churn_rate_pct": 2.1,
            "mrr_growth_pct": 14.8,
            "monthly_revenue_history": [
                {"month": "May", "revenue": 12400, "mrr": 11200},
                {"month": "Jun", "revenue": 14100, "mrr": 12800},
                {"month": "Jul", "revenue": 15800, "mrr": 14200},
                {"month": "Aug", "revenue": 17200, "mrr": 15600},
                {"month": "Sep", "revenue": 19400, "mrr": 17500},
                {"month": "Oct", "revenue": 21850, "mrr": 19650}
            ]
        }

    # ------------------ STAFF METRICS & ACTIONS ------------------
    def get_staff_metrics(self) -> Dict[str, Any]:
        pending_quotes = [s for s in self.subscriptions if s["status"] in ["Draft", "Quotation"]]
        active_subs = [s for s in self.subscriptions if s["status"] == "Active"]
        overdue_invoices = [inv for inv in self.invoices if inv["status"] == "Confirmed" and inv["amount_due"] > 0]
        draft_invoices = [inv for inv in self.invoices if inv["status"] == "Draft"]
        
        return {
            "pending_quotes_count": len(pending_quotes),
            "active_subscriptions_count": len(active_subs),
            "overdue_invoices_count": len(overdue_invoices),
            "overdue_total_amount": round(sum(i["amount_due"] for i in overdue_invoices), 2),
            "draft_invoices_count": len(draft_invoices),
            "recent_payments_total": round(sum(p["amount"] for p in self.payments[-5:]), 2),
            "billing_day_due_count": 2
        }

    # ------------------ CUSTOMER PORTAL METRICS ------------------
    def get_customer_portal(self, customer_id: str = "cust_1") -> Dict[str, Any]:
        customer = next((c for c in self.customers if c["id"] == customer_id), self.customers[0])
        cust_subs = [s for s in self.subscriptions if s["customer_id"] == customer["id"]]
        cust_invoices = [inv for inv in self.invoices if inv["customer_id"] == customer["id"]]
        cust_payments = [p for p in self.payments if p.get("customer_name") == customer["name"]]
        
        total_spent = sum(p["amount"] for p in cust_payments if p["status"] == "Success")
        open_balance = sum(inv["amount_due"] for inv in cust_invoices if inv["status"] in ["Draft", "Confirmed"])

        return {
            "customer": customer,
            "subscriptions": cust_subs,
            "invoices": cust_invoices,
            "payments": cust_payments,
            "summary": {
                "active_plans_count": len([s for s in cust_subs if s["status"] == "Active"]),
                "open_balance": round(open_balance, 2),
                "total_lifetime_spent": round(total_spent, 2),
                "next_renewal_date": "2026-11-01"
            }
        }


# Global Singleton
store = BrightloopDataStore()
