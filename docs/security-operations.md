# Mandatory MFA and security operations

Implemented 7 October 2026; verified and configured locally 9 October 2026. These application controls do not configure an external host, reverse proxy, mail domain or monitoring account automatically.

## Rollout

1. Back up both databases. Apply `pnpm customer:migrate` (0028–0029) and `pnpm payload migrate` (20261007 staff MFA/revocation migrations) before starting the new code. The staff tables use the Payload database; customer tables use `CUSTOMER_DATABASE_URL` when present. Keep these ledgers separate. Raw `public.staff_*` tables are migration-owned, not Payload collections; do not let a future generated migration remove them.
2. Choose and configure password screening below. Without a configured service/corpus, signup and password create/change/reset fail closed with a temporary-unavailable message. Existing password login continues. No passwords were bulk reset or sent to an external checker during implementation.
3. Staff sign in again at `/admin/login`, enroll an authenticator and save the ten recovery codes. Existing password-only cookies no longer grant staff access. Arrange enrollment and recovery-code storage before rollout to the staff team.
4. Start `pnpm security:worker` as a supervised service beside the application. `pnpm dev` includes it. Multiple workers may run; database leases coordinate delivery. Configure SMTP and monitoring below.
5. Verify the ingress contract in staging, connect external alerting, test SMTP outages and worker stoppage, and enroll real staff before production activation. Do not run synthetic fixtures against production.

## What requires MFA

All Payload staff roles require their password plus a TOTP authenticator or a single-use recovery code. The normal JWT strategy is replaced with one that also checks a database-backed, HttpOnly, SameSite=Strict proof cookie bound to that exact Payload session and staff account. HTTPS uses Secure cookies. Proof expires after eight hours or the underlying login expires, whichever comes first. Staff verification requires a login less than five minutes old. Failed code attempts lock verification for 15 minutes after ten failures. Used TOTP time steps cannot be replayed; recovery-code consumption is transactional. Password changes/reset invalidate proofs and pre-change sessions even if Payload rewrites its session array. Logout invalidates the underlying session. Secrets are encrypted with AES-GCM under a key derived from `PAYLOAD_SECRET`, bound to the staff ID; recovery codes are keyed hashes. Back up the secret securely and plan key rotation rather than replacing it casually.

Customer owners, administrators and reviewers need an enrolled authenticator and a session that completed TOTP, a recovery code or a user-verified passkey to approve invoices, generate exports, mark incoming invoices reviewed or queue invoice email. Downloads of generated exports also require that proof. Uploading and saving drafts remain available with normal authenticated permissions. Current organization membership, account suspension, session expiry and factor verification are checked at the sensitive operation. MFA does not grant additional roles. Disabling it immediately prevents further sensitive operations. The existing five-minute proof requirement for changing security settings remains.

Staff recovery codes are shown once during enrollment. There is no unauthenticated reset/bypass endpoint. If all factors and codes are lost, a separately verified, audited administrator recovery procedure is required; do not disable the gate or delete a factor based only on an email request. Customer self-service recovery retains its existing passkey/recovery-code options. Staff passkeys and company-wide MFA for ordinary browsing are not part of this change.

## Breached passwords

Both customer and staff signup/create, password change and password reset screen new passwords. Staff checks include Payload's separate reset operation. Minimum length is 15, maximum 128. This does not test existing passwords during login and never stores/logs their plaintext or lookup hashes.

- `PASSWORD_SCREENING_MODE=local`: no external requests. Download an authentic SHA-1-ordered Pwned Passwords corpus through the operator's approved process. Import it with `pnpm security:corpus SOURCE DESTINATION`, then set `PASSWORD_BLOCKLIST_PATH` to the destination. The importer validates ordering and records, strips counts, writes with restricted permissions and publishes atomically. Format is uppercase 40-character SHA-1 plus LF, exactly 41 bytes/record. Binary search avoids loading the corpus into RAM. Do not use a prevalence-ordered source or a test fixture. Refresh atomically at least monthly; readiness reports corpora older than 30 days as unhealthy. Password checking still uses the last available valid corpus if a refresh is late.
- `PASSWORD_SCREENING_MODE=hibp`: explicitly enables the [Pwned Passwords range API](https://haveibeenpwned.com/API/v3#PwnedPasswords). Only five hexadecimal SHA-1 prefix characters go to that fixed HTTPS origin. Neither plaintext, the complete hash, the suffix, the email nor the account ID is sent. Responses are padded; the matching suffix is checked locally. Redirects, malformed/oversized responses, non-200 responses and five-second timeouts fail closed. SHA-1 is used only for corpus lookup, not password storage. This provider choice and data flow need to be recorded before enabling it.

No fallback silently accepts unchecked passwords. The user selected HIBP on 9 October 2026. Local configuration now explicitly sets `PASSWORD_SCREENING_MODE=hibp`; set the same value in the deployment secret/configuration manager. The repository does not bundle a production breach corpus. Test fixtures deliberately provide a tiny synthetic local corpus only inside tests.

## Rate limiting and ingress

PostgreSQL atomic counters work across application instances. Keys are HMACs, not raw IP addresses. IPv6 addresses share a /64 budget; IPv4-mapped IPv6 is normalized. Missing, invalid or multiple IP values share an unattributed bucket rather than bypassing enforcement. Database failure produces 503; exceeding a limit produces 429 with Retry-After on perimeter/auth responses.

- Interactive API traffic: 600/minute per IP; signed `/api/billing/webhook` and bearer-protected `/api/security/health` are excluded from this interactive budget.
- Staff password/recovery endpoints: 10/minute per IP, with Payload's separate five-failure/15-minute account lockout. GraphQL: 30/minute per IP. Staff MFA: 30/minute per IP plus the database account limit.
- Customer sign-in, signup, reset request and reset completion: 10/minute per IP per operation; other auth POSTs: 120/minute. Existing Better Auth, account, recipient-mail, tenant and upload limits remain.
- Budgets are fixed windows, so traffic can straddle a window boundary. They supplement ingress connection/body/time limits and DDoS protection; they cannot stop a distributed volumetric attack before it reaches the application.

On a non-loopback `BETTER_AUTH_URL`, `SECURITY_PROXY_CONTRACT=overwrite-single-ip` is required. Set this only after the real ingress overwrites `CUSTOMER_IP_HEADER` with exactly one canonical client IP and direct origin access is blocked. Never append an untrusted client header. Verify spoofed-header and direct-origin tests in staging. `CUSTOMER_TRUSTED_PROXIES` retains its existing Better Auth meaning and is not proof that the sender is trusted. Missing deployment contract fails API rate enforcement closed. Choose an ingress-specific configuration once the hosting provider is known.

## Durable mail and alerting

Security changes create outbox records in the same database transaction as the audited change, including password changes, MFA changes, passkey changes and recovery material changes. Customer recovery after-hooks retain more detailed audit events without duplicating notices. Staff password, enrollment and recovery use create staff notices. No tokens, passwords, QR secrets, codes or email bodies are stored in the notification queue. Recipient addresses are private operational data.

The worker claims one job with `FOR UPDATE SKIP LOCKED`, uses a two-minute lease, retries with exponential backoff and stops after eight attempts. Expired leases recover from crashes. SMTP is at-least-once: a crash after provider acceptance may repeat a notice; the stable Message-ID can aid deduplication but does not guarantee it. This is deliberately separate from invoice delivery, whose uncertain outcomes must not be retried automatically. Sent security queue rows are removed after 30 days; failed rows remain for investigation. Audit events retain their existing retention policy.

Use the existing `CUSTOMER_SMTP_*` and `CUSTOMER_EMAIL_FROM` settings. Production remote SMTP requires TLS. Payload password-reset mail uses this SMTP adapter instead of printing reset links to the console. Reset/verification requests retain recipient limits and are not queued with long-lived reset links. Confirm a verified sender domain, SPF/DKIM/DMARC, provider bounce/complaint handling and a monitored support address with the selected production provider. SMTP acceptance is not proof of inbox delivery.

Configure a separate random `SECURITY_MONITOR_TOKEN` of at least 32 characters. An external monitor should GET `/api/security/health` every minute with `Authorization: Bearer <secret>`. Missing/wrong credentials return 404; unavailable dependencies/configuration return 503. The response exposes no account data and reports:

- Worker heartbeat (unhealthy after 90 seconds), failed mail and pending/sending mail older than ten minutes, separately for customer and staff.
- Screening, SMTP and ingress configuration readiness.
- Aggregate rate-limit denials, rate-storage outages and screening outages for the current/previous hour; staff MFA rejections over 15 minutes.

Page the operator on two consecutive health failures, any failed/delayed notices, any rate-storage or screening outage, or a sudden authentication-rejection spike. Select traffic-appropriate thresholds after staging observations. Forward structured `security_worker_failure`, `security_notification_retry`, `security_signal_storage_unavailable`, `rate_limited`, `rate_limit_unavailable` and `password_screening_unavailable` events to the chosen logging service. Monitor the external check itself; an application process cannot report its own total outage. Never ship request bodies, auth headers, reset URLs, recipient addresses or provider exception objects to those logs.

After fixing a mail outage, inspect affected queue rows privately and requeue only reviewed failed IDs by setting status=pending, attempts=0, available_at=now(), lease_token=NULL and lease_until=NULL in the appropriate database. Record the intervention in the operational incident log; expect possible duplicate notices. Do not bulk-replay unknown invoice delivery outcomes.

Amazon SES is the tentative production email choice (9 October 2026); local delivery remains Mailpit. Production still needs the selected host/proxy configuration, SES region/SMTP credentials and verified sender/domain setup, monitoring destination/on-call owner, deployment configuration for the selected HIBP source, real staff enrollment and a staging outage/recovery rehearsal. Local migrations/tests alone do not complete those external steps.

## Local verification — 9 October 2026

The production build, TypeScript check, 12 integration tests and 14 browser tests passed. Lint has no errors and retains two pre-existing unused-variable warnings in `src/app/my-route/route.ts`. Browser coverage includes staff authenticator enrollment and denial of REST, GraphQL and chained login/update mutations without MFA proof.

Targeted security and document checks cover concurrent rate limits, required customer MFA, password screening, transactional notifications, delivery retries and invoice permissions. An invoice-email fixture encountered the single-slot ZUGFeRD service's capacity limit during concurrent checks; all four invoice-email cases passed when rerun in isolation. Serialize checks sharing that service. A live HIBP check blocked a known breached synthetic password and accepted a unique synthetic password; no real account password was used.
