"""Persistent subscription domain API with role and object scoping."""
from calendar import monthrange
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from functools import wraps
from flask import Blueprint, g, jsonify, request
from sqlalchemy import or_
from data_store import seed_domain
from models import (db, UserRole, Product, Plan, Tax, Discount, Template,
                    Customer, Subscription, Invoice, Payment)
from security import roles_required

domain_bp = Blueprint("domain", __name__, url_prefix="/api/v1")
STAFF_ROLES = (UserRole.ADMIN, UserRole.INTERNAL, UserRole.PRODUCT_OWNER)
CATALOG = {"products": Product, "plans": Plan, "taxes": Tax,
           "discounts": Discount, "templates": Template}
ADMIN_CATALOG = {"products": Product, "plans": Plan, "taxes": Tax,
                 "discounts": Discount, "templates": Template}


def _role():
    value = g.current_user.role
    return value.value if isinstance(value, UserRole) else value


def _customer_id():
    customer = Customer.query.filter(
        db.func.lower(Customer.payload["email"].as_string()) ==
        g.current_user.email.lower()
    ).first()
    return customer.id if customer else None


def _json_error(message, status=400):
    return jsonify({"error": message}), status


def _scoped(query, customer_field="customer_id"):
    if _role() in {"ADMIN", "INTERNAL", "PRODUCT_OWNER"}:
        return query
    return query.filter(getattr(query.column_descriptions[0]["entity"], customer_field) == _customer_id())


def _paginate(query):
    try:
        page = max(1, int(request.args.get("page", 1)))
        size = min(100, max(1, int(request.args.get("page_size", 25))))
    except (TypeError, ValueError):
        return None, _json_error("page and page_size must be valid integers.")
    total = query.count()
    rows = query.offset((page - 1) * size).limit(size).all()
    return {"items": [row.as_dict() for row in rows], "page": page,
            "page_size": size, "total": total}, None


def _staff_or_customer(fn):
    @wraps(fn)
    @roles_required(*STAFF_ROLES, UserRole.CUSTOMER)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)
    return wrapper


@domain_bp.get("/catalog/<resource>")
@roles_required(*STAFF_ROLES, UserRole.CUSTOMER)
def catalog(resource):
    model = CATALOG.get(resource)
    if not model or (resource == "discounts" and _role() == "CUSTOMER"):
        return _json_error("Resource not found.", 404)
    result, error = _paginate(model.query.order_by(model.id))
    return error or jsonify(result)


@domain_bp.post("/catalog/<resource>")
@roles_required(UserRole.ADMIN)
def create_catalog_record(resource):
    model = ADMIN_CATALOG.get(resource)
    if not model:
        return _json_error("Resource not found.", 404)
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not payload:
        return _json_error("A JSON object is required.")
    allowed = {
        "products": {"name", "type", "sales_price", "cost_price", "notes",
                     "active", "variants"},
        "plans": {"name", "cost", "billing_interval", "min_quantity",
                  "available_start_date", "available_end_date",
                  "auto_close_on_expiry", "allow_early_close",
                  "allow_pause", "allow_renew", "description"},
        "taxes": {"name", "rate", "region", "is_default", "active"},
        "discounts": {"code", "name", "type", "value", "min_purchase_amount",
                      "min_quantity", "start_date", "end_date", "usage_limit",
                      "used_count", "target", "product_id", "is_active"},
        "templates": {"title", "name", "description", "validity_days",
                      "plan_id", "lines"},
    }[resource]
    unknown = set(payload) - allowed
    if unknown:
        return _json_error("Unknown fields: " + ", ".join(sorted(unknown)))
    record_id = str(payload.get("id") or f"{resource[:-1]}_{model.query.count() + 1}")
    if db.session.get(model, record_id):
        return _json_error("A record with that id already exists.", 409)
    amount = payload.get("total_amount", payload.get("sales_price",
                      payload.get("cost", payload.get("value", 0))))
    try:
        amount_minor = int((Decimal(str(amount)) * 100).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP))
    except (TypeError, ValueError):
        return _json_error("Amount fields must be valid numbers.")
    status = str(payload.get("status", "Active" if resource != "templates" else "Draft"))
    record = model(id=record_id, payload={**payload, "id": record_id},
                   status=status, amount_minor=amount_minor)
    db.session.add(record)
    db.session.commit()
    return jsonify(record.as_dict()), 201


@domain_bp.get("/payments")
@_staff_or_customer
def payments():
    result, error = _domain_list(Payment)
    return error or jsonify(result)


@domain_bp.get("/customers")
@roles_required(*STAFF_ROLES)
def customers():
    result, error = _paginate(Customer.query.order_by(Customer.id))
    return error or jsonify(result)


def _domain_list(model):
    query = _scoped(model.query)
    status = request.args.get("status")
    if status:
        query = query.filter(db.func.lower(model.status) == status.lower())
    return _paginate(query.order_by(model.id))


@domain_bp.get("/subscriptions")
@_staff_or_customer
def subscriptions():
    result, error = _domain_list(Subscription)
    return error or jsonify(result)


@domain_bp.get("/subscriptions/<subscription_id>")
@_staff_or_customer
def subscription(subscription_id):
    item = _scoped(Subscription.query).filter_by(id=subscription_id).first()
    return jsonify(item.as_dict()) if item else _json_error("Subscription not found.", 404)


@domain_bp.post("/subscriptions/<subscription_id>/actions/<action>")
@_staff_or_customer
def subscription_action(subscription_id, action):
    item = _scoped(Subscription.query).filter_by(id=subscription_id).first()
    if not item:
        return _json_error("Subscription not found.", 404)
    transitions = {"confirm": {"Quotation": "Confirmed"}, "activate": {"Confirmed": "Active"},
                   "pause": {"Active": "Paused"}, "close": {"Active": "Closed", "Paused": "Closed"},
                   "renew": {"Active": "Active", "Closed": "Active"}}
    if action not in transitions or item.status not in transitions[action]:
        return _json_error("This subscription action is not allowed.", 409)
    if _role() == "CUSTOMER" and action in {"confirm", "activate"}:
        return _json_error("This subscription action is not allowed.", 403)
    item.status = transitions[action][item.status]
    item.payload = {**item.payload, "status": item.status}
    db.session.commit()
    return jsonify({"subscription": item.as_dict()})


@domain_bp.get("/invoices")
@_staff_or_customer
def invoices():
    result, error = _domain_list(Invoice)
    return error or jsonify(result)


@domain_bp.get("/invoices/<invoice_id>")
@_staff_or_customer
def invoice(invoice_id):
    item = _scoped(Invoice.query).filter_by(id=invoice_id).first()
    return jsonify(item.as_dict()) if item else _json_error("Invoice not found.", 404)


@domain_bp.post("/invoices/<invoice_id>/actions/<action>")
@roles_required(*STAFF_ROLES)
def invoice_action(invoice_id, action):
    item = Invoice.query.filter_by(id=invoice_id).first()
    if not item:
        return _json_error("Invoice not found.", 404)
    transitions = {"confirm": {"Draft": "Confirmed"},
                   "cancel": {"Draft": "Cancelled", "Confirmed": "Cancelled"}}
    if action not in transitions or item.status not in transitions[action]:
        return _json_error("This invoice action is not allowed.", 409)
    item.status = transitions[action][item.status]
    item.payload = {**item.payload, "status": item.status}
    db.session.commit()
    return jsonify({"invoice": item.as_dict()})


@domain_bp.post("/invoices/<invoice_id>/payments")
@roles_required(*STAFF_ROLES)
def payment(invoice_id):
    item = Invoice.query.filter_by(id=invoice_id).first()
    if not item:
        return _json_error("Invoice not found.", 404)
    if item.status != "Confirmed":
        return _json_error("Payments can only be recorded for confirmed invoices.", 409)
    key = request.headers.get("Idempotency-Key", "").strip()
    if not key or len(key) > 128:
        return _json_error("A valid Idempotency-Key header is required.")
    existing = Payment.query.filter_by(idempotency_key=key).first()
    if existing:
        return jsonify({"payment": existing.as_dict(), "invoice": item.as_dict()})
    payload = request.get_json(silent=True) or {}
    try:
        amount = (Decimal(str(payload["amount"]))*100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    except (KeyError, TypeError, ValueError):
        return _json_error("amount must be a valid number.")
    due = int(item.payload.get("amount_due", item.amount_minor))
    if amount <= 0 or int(amount) > int(round(due * 100)):
        return _json_error("Payment amount must be positive and no greater than the amount due.")
    payment_data = {"id": "pay_" + str(Payment.query.count() + 1), "invoice_id": invoice_id,
                    "invoice_number": item.payload.get("invoice_number"), "customer_id": item.customer_id,
                    "amount": float(amount) / 100, "payment_method": str(payload.get("payment_method", "")).strip(),
                    "payment_date": date.today().isoformat(), "reference": str(payload.get("reference", "")).strip()[:120],
                    "status": "Success", "idempotency_key": key}
    if not payment_data["payment_method"] or len(payment_data["payment_method"]) > 40:
        return _json_error("payment_method is required.")
    record = Payment(id=payment_data["id"], payload=payment_data, customer_id=item.customer_id,
                     status="Success", amount_minor=int(amount), invoice_id=invoice_id,
                     idempotency_key=key)
    amount_paid = (Decimal(str(item.payload.get("amount_paid", 0))) +
                   amount / Decimal("100")).quantize(Decimal("0.01"))
    total_amount = Decimal(str(item.payload.get("total_amount", due / 100)))
    amount_due = (total_amount - amount_paid).quantize(Decimal("0.01"))
    item.payload = {**item.payload, "amount_paid": float(amount_paid),
                    "amount_due": float(max(amount_due, Decimal("0")))}
    if amount_due <= 0:
        item.payload["status"] = item.status = "Paid"
    db.session.add(record)
    db.session.commit()
    return jsonify({"payment": record.as_dict(), "invoice": item.as_dict()}), 201


@domain_bp.post("/billing-runs")
@roles_required(*STAFF_ROLES)
def billing_run():
    try:
        due_date = date.fromisoformat(request.args.get("date", date.today().isoformat()))
    except ValueError:
        return _json_error("date must use YYYY-MM-DD format.")
    created = []
    for sub in Subscription.query.filter_by(status="Active"):
        next_date = sub.payload.get("next_billing_date", "")
        if not next_date or next_date > due_date.isoformat():
            continue
        period_start = date.fromisoformat(next_date)
        billing_interval = str(sub.payload.get("billing_interval", "monthly")).lower()
        if billing_interval == "daily":
            period_end = period_start
        elif billing_interval == "weekly":
            period_end = period_start + timedelta(days=6)
        elif billing_interval == "yearly":
            next_year_day = min(period_start.day, monthrange(
                period_start.year + 1, period_start.month)[1])
            next_billing = period_start.replace(
                year=period_start.year + 1, day=next_year_day)
            period_end = next_billing - timedelta(days=1)
        else:
            day = min(period_start.day, monthrange(period_start.year,
                                                   period_start.month)[1])
            next_month = (period_start.replace(day=1) + timedelta(days=32)).replace(day=1)
            period_end = next_month.replace(day=min(day, monthrange(
                next_month.year, next_month.month)[1])) - timedelta(days=1)
        if Invoice.query.filter(
            Invoice.payload["subscription_id"].as_string() == sub.id,
            Invoice.payload["period_start"].as_string() == next_date,
            Invoice.payload["period_end"].as_string() == period_end.isoformat(),
        ).first():
            continue
        number = Invoice.query.count() + 1
        data = {"id": f"inv_{number}", "invoice_number": f"INV-{due_date.year}-{number:04d}",
                "subscription_id": sub.id, "subscription_number": sub.payload.get("subscription_number"),
                "customer_id": sub.customer_id, "customer_name": sub.payload.get("customer_name"),
                "issue_date": due_date.isoformat(), "due_date": (due_date + timedelta(days=30)).isoformat(),
                "period_start": next_date, "period_end": period_end.isoformat(), "status": "Draft",
                "subtotal": sub.payload.get("subtotal", 0), "discount_amount": sub.payload.get("discount_total", 0),
                "tax_amount": sub.payload.get("tax_total", 0), "total_amount": sub.payload.get("total_amount", 0),
                "amount_paid": 0, "amount_due": sub.payload.get("total_amount", 0), "lines": sub.payload.get("lines", [])}
        created.append(data)
        db.session.add(Invoice(id=data["id"], payload=data, customer_id=sub.customer_id,
                               status="Draft", amount_minor=int(
                                   (Decimal(str(data["total_amount"])) * 100).quantize(
                                       Decimal("1"), rounding=ROUND_HALF_UP))))
        sub.payload = {**sub.payload, "next_billing_date": (period_end + timedelta(days=1)).isoformat()}
    db.session.commit()
    return jsonify({"created": len(created), "invoices": created}), 201


@domain_bp.get("/reports/summary")
@roles_required(*STAFF_ROLES)
def report_summary():
    invoices = Invoice.query.all()
    return jsonify({"active_subscriptions": Subscription.query.filter_by(status="Active").count(),
                    "total_customers": Customer.query.count(),
                    "pending_quotes": Subscription.query.filter(
                        Subscription.status.in_(["Draft", "Quotation"])).count(),
                    "revenue_collected": round(sum(float(i.payload.get("amount_paid", 0)) for i in invoices if i.status == "Paid"), 2),
                    "outstanding_amount": round(sum(float(i.payload.get("amount_due", 0)) for i in invoices if i.status in {"Draft", "Confirmed"}), 2),
                    "overdue_invoices": sum(i.status == "Confirmed" and i.payload.get("due_date", "") < date.today().isoformat() for i in invoices)})
