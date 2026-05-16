-- =============================================================================
-- SEI Nexus Platform — Tenant Registry
-- File: 003_tenant_registry.sql
-- Schema: PUBLIC (shared across all tenants)
--
-- These tables live in the public schema and are the only tables shared
-- between tenants. Every other Nexus table lives in a per-tenant schema
-- (e.g. tenant_acme_corp) provisioned by TenantProvisioningService.
-- =============================================================================

-- ── Tenant registry ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nexus_tenant (
    tenant_id      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    slug           VARCHAR(64)   NOT NULL UNIQUE,   -- URL-safe, e.g. 'acme-corp'
    name           VARCHAR(255)  NOT NULL,
    schema_name    VARCHAR(64)   NOT NULL UNIQUE,   -- PostgreSQL schema, e.g. 'tenant_acme_corp'
    plan           VARCHAR(32)   NOT NULL DEFAULT 'STANDARD'
                       CHECK (plan IN ('TRIAL', 'STANDARD', 'PROFESSIONAL', 'ENTERPRISE')),
    status         VARCHAR(32)   NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DEPROVISIONED')),
    contact_email  VARCHAR(255),
    max_users      INT           NOT NULL DEFAULT 50,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_slug   ON nexus_tenant(slug)   WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_tenant_schema ON nexus_tenant(schema_name);

-- ── Session index ─────────────────────────────────────────────────────────────
-- Maps a token hash → tenant schema so the auth filter can route any request
-- to the correct tenant schema without scanning all tenant schemas.
-- Written on every login; deleted on logout and by the expiry cleanup job.
CREATE TABLE IF NOT EXISTS nexus_session_index (
    token_hash     VARCHAR(255)  PRIMARY KEY,
    tenant_schema  VARCHAR(64)   NOT NULL REFERENCES nexus_tenant(schema_name) ON DELETE CASCADE,
    user_email     VARCHAR(255)  NOT NULL,
    expires_at     TIMESTAMPTZ   NOT NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_index_expires ON nexus_session_index(expires_at);
CREATE INDEX IF NOT EXISTS idx_session_index_schema  ON nexus_session_index(tenant_schema);

-- ── Default tenant ────────────────────────────────────────────────────────────
-- Wraps the existing 'public' schema data for backward compatibility during
-- development. Production tenants each get their own schema.
INSERT INTO nexus_tenant (tenant_id, slug, name, schema_name, plan, status, max_users)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'default',
    'SEI Nexus Platform',
    'public',
    'ENTERPRISE',
    'ACTIVE',
    9999
) ON CONFLICT (slug) DO NOTHING;
