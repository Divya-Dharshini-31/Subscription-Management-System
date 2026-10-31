"""Create privileged Brightloop accounts. Credentials are never hardcoded.

Examples:
  python create_admin.py
  python create_admin.py --name "Ada Admin" --email ada@brightloop.local
  python create_admin.py --role INTERNAL --name "Sam Staff" --email sam@brightloop.local
  python create_admin.py --role PRODUCT_OWNER --name "Pat Owner" --email pat@brightloop.local
  python create_admin.py --reset --email admin@brightloop.local
"""

import argparse
import getpass
import sys

from app import create_app
from models import User, UserRole, db
from security import hash_password, normalize_email, validate_password

PRIVILEGED_ROLES = (UserRole.ADMIN, UserRole.PRODUCT_OWNER, UserRole.INTERNAL)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Create or manage a privileged Brightloop account (ADMIN, INTERNAL, or PRODUCT_OWNER)."
    )
    parser.add_argument("--name", help="Full name")
    parser.add_argument("--email", help="Account email")
    parser.add_argument("--password", help="Account password (prefer a prompt instead)")
    parser.add_argument(
        "--role",
        default=UserRole.ADMIN.value,
        choices=[role.value for role in PRIVILEGED_ROLES],
        help="Privileged role to create (default: ADMIN)",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset password for an existing account identified by --email",
    )
    return parser.parse_args()


def prompt(label, current):
    if current:
        return current
    value = input(f"{label}: ").strip()
    if not value:
        raise SystemExit(f"{label} is required.")
    return value


def prompt_password(current):
    if current:
        return current
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")
    if password != confirm:
        raise SystemExit("Password and confirm password do not match.")
    return password


def main():
    args = parse_args()
    app = create_app()

    with app.app_context():
        if args.reset:
            email = normalize_email(prompt("Email", args.email))
            user = User.query.filter_by(email=email).first()
            if not user:
                print(f"No account found with email {email}.")
                sys.exit(1)
            password = prompt_password(args.password)
            valid, hint = validate_password(password)
            if not valid:
                print(hint)
                sys.exit(1)
            user.password_hash = hash_password(password)
            db.session.commit()
            role_val = user.role.value if isinstance(user.role, UserRole) else user.role
            print(f"Password updated for {user.email} ({role_val}).")
            return

        role = UserRole(args.role)
        if role is UserRole.ADMIN:
            existing = User.query.filter_by(role=UserRole.ADMIN).first()
            if existing:
                print(
                    f"An ADMIN account already exists ({existing.email}). "
                    "Use --reset with --email to update its password, or --role INTERNAL / --role PRODUCT_OWNER to create staff."
                )
                sys.exit(1)

        full_name = prompt("Full name", args.name)
        email = normalize_email(prompt("Email", args.email))
        password = prompt_password(args.password)

        if User.query.filter_by(email=email).first():
            print("An account with this email already exists.")
            sys.exit(1)

        valid, hint = validate_password(password)
        if not valid:
            print(hint)
            sys.exit(1)

        user = User(
            full_name=full_name,
            email=email,
            password_hash=hash_password(password),
            role=role,
        )
        db.session.add(user)
        db.session.commit()
        print(f"{role.value} account created for {user.email}.")


if __name__ == "__main__":
    main()
