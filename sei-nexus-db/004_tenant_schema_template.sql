-- =============================================================================
-- SEI Nexus Platform — Tenant Schema Template
-- File: 004_tenant_schema_template.sql
--
-- This file documents the canonical DDL applied to every tenant schema when
-- a new tenant is provisioned. TenantProvisioningService runs the Flyway
-- migrations (V001–V008) programmatically against the new schema, which
-- executes this DDL automatically.
--
-- To provision manually (DBA use only):
--   CREATE SCHEMA tenant_acme_corp;
--   SET search_path = tenant_acme_corp;
--   -- then run V001__init.sql through V007__knowledge_graph.sql
--
-- This file is the single source of truth for what a fresh tenant schema
-- contains. Keep it in sync with the Flyway migration files in sei-nexus-ai.
-- =============================================================================

-- Included from V001__init.sql:
--   nexus_domain, nexus_user_account, nexus_user_session,
--   nexus_document, nexus_document_chunk, nexus_connection,
--   nexus_agent, nexus_agent_version, nexus_agent_playbook, nexus_agent_kpi,
--   nexus_run, nexus_conversation_pin, nexus_evidence,
--   nexus_data_object, nexus_data_object_version, nexus_data_column,
--   nexus_knowledge_note, nexus_knowledge_gap,
--   nexus_investigation_recipe, nexus_investigation_step,
--   nexus_query_execution,
--   nexus_business_entity, nexus_entity_lifecycle_state,
--   nexus_entity_relationship, nexus_operational_vocabulary,
--   nexus_entity_data_mapping,
--   nexus_reasoning_session, nexus_reasoning_step, nexus_hypothesis,
--   nexus_operational_finding,
--   nexus_operational_baseline, nexus_anomaly_event,
--   nexus_audit_event

-- Included from V002__fix_user_account_and_evidence.sql:
--   ALTER nexus_user_account (updated_at, role constraint)
--   RENAME nexus_evidence.payload → payload_json

-- Included from V003__add_missing_document_chunk.sql:
--   CREATE EXTENSION vector (safe to run per-schema; extension is cluster-wide)
--   CREATE TABLE nexus_document_chunk (re-created with correct schema)

-- Included from V004__add_operational_note.sql:
--   CREATE TABLE nexus_operational_note

-- Included from V005__fix_reasoning_temporal_tables.sql:
--   DROP + RECREATE nexus_reasoning_session, nexus_reasoning_step,
--   nexus_hypothesis, nexus_operational_finding,
--   nexus_operational_baseline, nexus_anomaly_event

-- Included from V006__rebuild_all_mismatched_tables.sql:
--   DROP + RECREATE nexus_agent, nexus_agent_version, nexus_agent_playbook,
--   nexus_agent_kpi, nexus_data_object, nexus_data_object_version,
--   nexus_data_column, nexus_business_entity, nexus_entity_lifecycle_state,
--   nexus_entity_relationship, nexus_operational_vocabulary,
--   nexus_entity_data_mapping, nexus_query_execution

-- Included from V007__knowledge_graph.sql:
--   ALTER nexus_business_entity ADD node_type, color, group_label
--   ALTER nexus_entity_relationship ADD cardinality, bidirectional, join_sql, edge_color
--   INSERT demo logistics entities and edges

-- =============================================================================
-- Default seed data applied to every new tenant schema
-- =============================================================================

-- Every tenant starts with a PLATFORM domain as the root organizational unit.
-- Tenant admins can add further domains (business units, regions, etc.).
-- The domain_key is intentionally generic; rename it via the Domains admin page.
-- INSERT INTO nexus_domain (domain_key, name, description, owner_team, status)
-- VALUES ('PLATFORM', 'Platform', 'Default platform domain', 'Platform Team', 'ACTIVE')
-- ON CONFLICT (domain_key) DO NOTHING;

-- Note: The admin user for the tenant is created by TenantProvisioningService
-- during provisioning (not here) using the email/password supplied at signup.
