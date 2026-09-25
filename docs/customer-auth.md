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

Both `/de` and `/en` offer `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invitation`, `/portal`, and `/portal/security`. The portal supports profile changes, company creation and switching, complete team management, logout, password changes, and revoking other sessions. Email remains read-only in the profile. Verification requires an explicit confirmation button to avoid consuming links merely when an email scanner visits a URL.

The customer schema contains users, accounts, sessions, verifications, organizations, organization memberships, organization invitations, team audit events, rate limits, and its migration ledger. A company is an organization; an individual customer can belong to multiple companies. Every private operation re-reads the current organization membership from PostgreSQL. UI visibility never grants access.

## Team permissions

| Capability                                           | Owner | Administrator | Accountant / reviewer | Member |
| ---------------------------------------------------- | ----- | ------------- | --------------------- | ------ |
| Files and invoice drafts                             | Yes   | Yes           | Yes                   | Yes    |
| Approve/export and review incoming invoices          | Yes   | Yes           | Yes                   | No     |
| Change saved customers/services and company settings | Yes   | Yes           | No                    | No     |
| Invite/remove members and reviewers                  | Yes   | Yes           | No                    | No     |
| Manage administrators                                | Yes   | No            | No                    | No     |
| Subscription and payments                            | Yes   | No            | No                    | No     |
| Team activity                                        | Yes   | Yes           | No                    | No     |

An owner cannot be removed, demoted, or edited by an administrator. Users cannot change their own role. Member removal immediately clears that company's active-workspace selection and cancels pending invitations for the same address. Invitation acceptance requires the exact verified email, a current pending invitation, and a free subscription seat. Members plus unexpired pending invitations consume seats; PostgreSQL locks and triggers prevent concurrent requests from exceeding the plan.

Team mutations use `/api/team`, enforce same-origin requests, validate bounded inputs, and rate-limit each account. The equivalent Better Auth mutation endpoints are blocked to prevent bypassing the hierarchy and audit trail. Invitations record delivery state and can be resent after a one-minute cooldown. Audit entries record the actor, action, target label, role transition, and time; they do not store tokens or email contents.

An invitation does not create an account or password. Its bearer link may reveal only a masked address and whether that address already has a Taxful account. Existing users are sent to sign in; new users are sent to registration, email verification, and then back to the invitation. Acceptance still requires an authenticated, verified account whose complete email exactly matches the invitation.

## Login and device protection

Better Auth applies PostgreSQL-backed endpoint throttling. Password sign-in also uses an account-specific failure record keyed by an HMAC of the normalized email address, so the table does not contain another copy of the address. Five failures trigger a five-minute lock, eight failures within 24 hours trigger 15 minutes, and ten or more trigger 60 minutes. A successful sign-in clears the account counter. Updates are serialized with a PostgreSQL advisory lock so concurrent attempts cannot lose increments. Responses remain generic to avoid revealing whether an account exists.

The Account security page requires a fresh session before listing or revoking sessions. It displays a parsed browser and operating system, masked network address, sign-in time, and last activity. A customer can revoke one other session or every other session; the current session cannot be removed through the individual-device action. Password changes continue to revoke other sessions.

Signup and profile use separate first and last names, required and limited to 75 characters each. The server derives Better Auth's display name. Migration 0003 adds nullable columns for existing customers without guessing how to split their names; those customers enter both parts when they next save their profile. New registrations require both fields.

The portal has a responsive sidebar with Overview, File converter, Files, Team, Profile, Account security, and Sign out. Company creation stays on the overview, and the company switcher persists across portal pages. Invitations live on Team. Converter and Files implement the workflow described in `docs/document-converter.md`. Each workspace icon is an individual SVG in `public/icons/`.

## Authentication settings

Passwords accept 15–128 characters. Sessions last 24 hours and refresh after 30 minutes of activity. Portal users are signed out after 30 minutes without activity, following a 30-second warning; activity and sign-outs apply to every open tab, and the login page explains the sign-out. Active browsers confirm the session at most once a minute, and the server deletes sessions without requests for 35 minutes, which also covers closed or sleeping browsers. Account security lists signed-in devices only within 30 minutes of signing in (Better Auth `freshAge`); after that the user confirms their password, which starts a new session and removes the previous one. Verification links expire after one hour, password reset tokens after 30 minutes, and invitations after seven days. Password reset revokes existing sessions. The password-change form revokes other sessions. Rate limits use PostgreSQL: five login/signup requests per minute and three reset/resend requests per minute, within a general 60-per-minute limit.

For production, configure the HTTPS application origin, a strong independent secret, real SMTP credentials and sender, and preferably a database role restricted to the customer schema. Do not use the local Mailpit transport for production. Provision the schema with an appropriate migration role. Schedule maintenance for expired authentication records as part of deployment operations.

MFA and social login remain future work. No deployment or production readiness certification is implied.
