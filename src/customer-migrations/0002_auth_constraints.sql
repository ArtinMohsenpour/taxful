CREATE UNIQUE INDEX organization_memberships_user_organization_unique
  ON organization_memberships ("organizationId", "userId");
CREATE UNIQUE INDEX customer_accounts_provider_account_unique
  ON customer_accounts ("providerId", "accountId");
CREATE INDEX customer_sessions_expiration_idx ON customer_sessions ("expiresAt");
CREATE INDEX customer_verifications_expiration_idx ON customer_verifications ("expiresAt");
