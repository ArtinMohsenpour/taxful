# Customer authentication

Customer login uses Better Auth with PostgreSQL database sessions. Payload Admin users, roles, and authentication remain separate. Customer cookies use the `taxful-customer` prefix, HttpOnly, SameSite=Lax, and Secure when the configured application URL uses HTTPS. Session tokens are not stored in browser localStorage.

## Local setup

Run from the project directory:

```sh
pnpm customer:setup
pnpm customer:migrate
pnpm customer:mail
pnpm dev
```

The setup script adds missing settings and a random authentication secret to ignored `.env.local`. The application uses `CUSTOMER_DATABASE_URL` when configured, otherwise `DATABASE_URL`. Customer tables live in the separate `customer_auth` PostgreSQL schema. Reviewed SQL migrations and their checksums are tracked independently from Payload migrations; application startup does not synchronize the schema automatically.

Mailpit receives local verification, reset, and invitation emails. Open http://localhost:8026 to read them; local messages are not delivered to a real personal inbox. SMTP listens on loopback port 1026. The container is defined in `docker-compose.email.yml`.

## Pages and data

Both `/de` and `/en` offer `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invitation`, `/portal`, and `/portal/security`. The portal supports profile display-name changes, company creation and switching, invitations, logout, password changes, and revoking other sessions. Email remains read-only in the profile. Verification requires an explicit confirmation button to avoid consuming links merely when an email scanner visits a URL.

The customer schema contains users, accounts, sessions, verifications, organizations, organization memberships, organization invitations, rate limits, and its migration ledger. A company is an organization; an individual customer can belong to multiple companies. Membership permissions are checked through Better Auth on the server. Owners and administrators manage invitations; reviewer currently has ordinary member permissions. Future document operations must enforce organization access independently of visible UI controls.

Better Auth's `name` is a full display name, not a structured legal name. First and last names can be introduced separately if product requirements need them, while retaining a derived display name for authentication UI.

## Authentication settings

Passwords accept 15–128 characters. Sessions last 24 hours and refresh after 30 minutes of activity. Verification links expire after one hour, password reset tokens after 30 minutes, and invitations after seven days. Password reset revokes existing sessions. The password-change form revokes other sessions. Rate limits use PostgreSQL: five login/signup requests per minute and three reset/resend requests per minute, within a general 60-per-minute limit.

For production, configure the HTTPS application origin, a strong independent secret, real SMTP credentials and sender, and preferably a database role restricted to the customer schema. Do not use the local Mailpit transport for production. Provision the schema with an appropriate migration role. Schedule maintenance for expired authentication records as part of deployment operations.

MFA, social login, billing/subscriptions, and document conversion are outside this initial authentication implementation. No deployment or production readiness certification is implied.
