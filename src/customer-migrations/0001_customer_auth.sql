create table "customer_users" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null, "locale" text);

create table "customer_sessions" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "customer_users" ("id") on delete cascade, "activeOrganizationId" text);

create table "customer_accounts" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "customer_users" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "customer_verifications" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create table "organizations" ("id" text not null primary key, "name" text not null, "slug" text not null unique, "logo" text, "createdAt" timestamptz not null, "metadata" text);

create table "organization_memberships" ("id" text not null primary key, "organizationId" text not null references "organizations" ("id") on delete cascade, "userId" text not null references "customer_users" ("id") on delete cascade, "role" text not null, "createdAt" timestamptz not null);

create table "organization_invitations" ("id" text not null primary key, "organizationId" text not null references "organizations" ("id") on delete cascade, "email" text not null, "role" text, "status" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "inviterId" text not null references "customer_users" ("id") on delete cascade);

create table "customer_rate_limits" ("id" text not null primary key, "key" text not null unique, "count" integer not null, "lastRequest" bigint not null);

create index "customer_sessions_userId_idx" on "customer_sessions" ("userId");

create index "customer_accounts_userId_idx" on "customer_accounts" ("userId");

create index "customer_verifications_identifier_idx" on "customer_verifications" ("identifier");

create index "organization_memberships_organizationId_idx" on "organization_memberships" ("organizationId");

create index "organization_memberships_userId_idx" on "organization_memberships" ("userId");

create index "organization_invitations_organizationId_idx" on "organization_invitations" ("organizationId");

create index "organization_invitations_email_idx" on "organization_invitations" ("email");