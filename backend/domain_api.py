"""Versioned subscription-management API.

The project currently uses a small seed store while the SQLAlchemy domain
migration is being rolled out.  This module keeps all authorization and
business invariants at the API boundary so the eventual persistent store can
reuse the same service contract.
"""

from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from functools import wraps

from flask import Blueprint, g, jsonify, request

from data_store import store
from models import UserRole
from security import roles_required


domain_bp = Blueprint("domain", __name__, url_prefix="/api/v1")
STAFF_ROLES = (UserRole.ADMIN, UserRole.INTERNAL, UserRole.PRODUCT_OWNER)


def _role_value():
    role = g.current_user.role
    return role.value if isinstance(role, UserRole) else role


def _customer_id():
    email = g.current_user.email.lower()
    customer = next(
        (item for item in store.customers if item.get("email", "").lower() == email),
        None,
    )
    return customer["id"] if customer else None


def _visible(items, customer_key="customer_id"):
    if _role_value() in {"ADMIN", "INTERNAL", "PRODUCT_OWNER"}:
        return items
    customer_id = _customer_id()
    return [item for item in items if item.get(customer_key) == customer_id]


def _get_visible(items, item_id, customer_key="customer_id"):
    item = next((candidate for candidate in items if candidate.get("id") == item_id), None)
    if not item or item not in _visible([item], customer_key):
        return None
    return item


def _json_error(message, status=400):
    return jsonify({"error": message}), status


def _paginate(items):
    try:
        page = max(1, int(request.args.get("page", 1)))
        page_size = min(100, max(1, int(request.args.get("page_size", 25))))
    except (TypeError, ValueError):
        return None, _json_error("page and page_size must be valid integers.")
    start = (page - 1) * page_size
    return {
        "items": items[start : start + page_size],
        "page": page,
        "page_size": page_size,
        "total": len(items),
    }, None


def _staff_or_customer(fn):
    @wraps(fn)
    @roles_required(UserRole.ADMIN, UserRole.INTERNAL, UserRole.PRODUCT_OWNER, UserRole.CUSTOMER)
    def wrapper(*args, **kwargs):
        return fn(*args, **kwargs)

    return wrapper


@domain_bp.get("/catalog/<resource>")
@roles_required(UserRole.ADMIN, UserRole.INTERNAL, UserRole.PRODUCT_OWNER, UserRole.CUSTOMER)
def catalog(resource):
    sources = {
        "products": store.products,
        "plans": store.plans,
        "taxes": store.taxes,
        "discounts": store.discounts,
        "templates": store.templates,
    }
    if resource not in sources:
        return _json_error("Resource not found.", 404)
    items = sources[resource]
    if resource == "discounts" and _role_value() == "CUSTOMER":
        return _json_error("Resource not found.", 404)
    result, error = _paginate(items)
    return error or jsonify(result)


@domain_bp.get("/customers")
@roles_required(*STAFF_ROLES)
def customers():
    result, error = _paginate(store.customers)
    return error or jsonify(result)


@domain_bp.get("/subscriptions")
@_staff_or_customer
def subscriptions():
    items = _visible(store.subscriptions)
    status = request.args.get("status")
    if status:
        items = [item for item in items if item.get("status", "").lower() == status.lower()]
    result, error = _paginate(items)
    return error or jsonify(result)


@domain_bp.get("/subscriptions/<subscription_id>")
@_staff_or_customer
def subscription(subscription_id):
    item = _get_visible(store.subscriptions, subscription_id)
    return jsonify(item) if item else _json_error("Subscription not found.", 404)


@domain_bp.post("/subscriptions/<subscription_id>/actions/<action>")
@_staff_or_customer
def subscription_action(subscription_id, action):
    item = _get_visible(store.subscriptions, subscription_id)
    if not item:
        return _json_error("Subscription not found.", 404)
    allowed = {
        "confirm": {"Quotation": "Confirmed"},
        "activate": {"Confirmed": "Active"},
        "pause": {"Active": "Paused"},
        "close": {"Active": "Closed", "Paused": "Closed"},
        "renew": {"Active": "Active", "Closed": "Active"},
    }
    transitions = allowed.get(action)
    if not transitions or item["status"] not in transitions:
        return _json_error("This subscription action is not allowed.", 409)
    if _role_value() == "CUSTOMER" and action in {"confirm", "activate"}:
        return _json_error("This subscription action is not allowed.", 403)
    item["status"] = transitions[item["status"]]
    return jsonify({"subscription": item})


@domain_bp.get("/invoices")
@_staff_or_customer
def invoices():
    items = _visible(store.invoices)
    status = request.args.get("status")
    if status:
        items = [
            item for item in items
            if item.get("status", "").lower() == status.lower()
        ]
    result, error = _paginate(items)
    return error or jsonify(result)


@domain_bp.get("/invoices/<invoice_id>")
@_staff_or_customer
def invoice(invoice_id):
    item = _get_visible(store.invoices, invoice_id)
    return jsonify(item) if item else _json_error("Invoice not found.", 404)


@domain_bp.post("/invoices/<invoice_id>/actions/<action>")
@roles_required(*STAFF_ROLES)
def invoice_action(invoice_id, action):
    item = next((candidate for candidate in store.invoices if candidate["id"] == invoice_id), None)
    if not item:
        return _json_error("Invoice not found.", 404)
    transitions = {"confirm": {"Draft": "Confirmed"}, "cancel": {"Draft": "Cancelled", "Confirmed": "Cancelled"}}
    next_states = transitions.get(action)
    if not next_states or item["status"] not in next_states:
        return _json_error("This invoice action is not allowed.", 409)
    item["status"] = next_states[item["status"]]
    return jsonify({"invoice": item})


@domain_bp.post("/invoices/<invoice_id>/payments")
@roles_required(*STAFF_ROLES)
def payment(invoice_id):
    item = next((candidate for candidate in store.invoices if candidate["id"] == invoice_id), None)
    if not item:
        return _json_error("Invoice not found.", 404)
    if item["status"] != "Confirmed":
        return _json_error("Payments can only be recorded for confirmed invoices.", 409)
    payload = request.get_json(silent=True) or {}
    key = str(request.headers.get("Idempotency-Key", "")).strip()
    if not key or len(key) > 128:
        return _json_error("A valid Idempotency-Key header is required.")
    existing = next(
        (entry for entry in store.payments if entry.get("idempotency_key") == key),
        None,
    )
    if existing:
        return jsonify({"payment": existing, "invoice": item})
    try:
        amount = Decimal(str(payload["amount"])).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (KeyError, TypeError, ValueError):
        return _json_error("amount must be a valid number.")
    if amount <= 0 or amount > Decimal(str(item["amount_due"])).quantize(Decimal("0.01")):
        return _json_error("Payment amount must be positive and no greater than the amount due.")
    method = str(payload.get("payment_method", "")).strip()
    if not method or len(method) > 40:
        return _json_error("payment_method is required.")
    payment_record = {
        "id": f"pay_{len(store.payments) + 1}",
        "invoice_id": invoice_id,
        "invoice_number": item["invoice_number"],
        "customer_id": item["customer_id"],
        "amount": float(amount),
        "payment_method": method,
        "payment_date": date.today().isoformat(),
        "reference": str(payload.get("reference", "")).strip()[:120],
        "status": "Success",
        "idempotency_key": key,
    }
    store.payments.append(payment_record)
    item["amount_paid"] = round(float(item["amount_paid"]) + float(amount), 2)
    item["amount_due"] = round(float(item["total_amount"]) - item["amount_paid"], 2)
    if item["amount_due"] == 0:
        item["status"] = "Paid"
    return jsonify({"payment": payment_record, "invoice": item}), 201


@domain_bp.post("/billing-runs")
@roles_required(*STAFF_ROLES)
def billing_run():
    billing_date = request.args.get("date", date.today().isoformat())
    try:
        due_date = date.fromisoformat(billing_date)
    except ValueError:
        return _json_error("date must use YYYY-MM-DD format.")
    created = []
    for subscription in store.subscriptions:
        if subscription["status"] != "Active" or subscription.get("next_billing_date", "") > due_date.isoformat():
            continue
        period_start = subscription["next_billing_date"]
        period_end = due_date.isoformat()
        duplicate = any(
            invoice["subscription_id"] == subscription["id"]
            and invoice.get("period_start") == period_start
            for invoice in store.invoices
        )
        if duplicate:
            continue
        invoice_id = f"inv_{len(store.invoices) + 1}"
        total = round(float(subscription["total_amount"]), 2)
        record = {
            "id": invoice_id,
            "invoice_number": f"INV-{due_date.year}-{len(store.invoices) + 1:04d}",
            "subscription_id": subscription["id"],
            "subscription_number": subscription["subscription_number"],
            "customer_id": subscription["customer_id"],
            "customer_name": subscription["customer_name"],
            "issue_date": due_date.isoformat(),
            "due_date": (due_date + timedelta(days=30)).isoformat(),
            "period_start": period_start,
            "period_end": period_end,
            "status": "Draft",
            "subtotal": subscription["subtotal"],
            "discount_amount": subscription["discount_total"],
            "tax_amount": subscription["tax_total"],
            "total_amount": total,
            "amount_paid": 0.0,
            "amount_due": total,
            "lines": subscription["lines"],
        }
        store.invoices.append(record)
        subscription["next_billing_date"] = (due_date + timedelta(days=30)).isoformat()
        created.append(record)
    return jsonify({"created": len(created), "invoices": created}), 201


@domain_bp.get("/reports/summary")
@roles_required(*STAFF_ROLES)
def report_summary():
    paid = [item for item in store.invoices if item["status"] == "Paid"]
    outstanding = [item for item in store.invoices if item["status"] in {"Draft", "Confirmed"}]
    active = [item for item in store.subscriptions if item["status"] == "Active"]
    return jsonify({
        "active_subscriptions": len(active),
        "revenue_collected": round(sum(item["amount_paid"] for item in paid), 2),
        "outstanding_amount": round(sum(item["amount_due"] for item in outstanding), 2),
        "overdue_invoices": sum(
            item["status"] == "Confirmed" and item["due_date"] < date.today().isoformat()
            for item in store.invoices
        ),
    })
