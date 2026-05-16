-- =============================================================================
-- SEI Nexus Platform - PostgreSQL Schema Initialization
-- Version: 1.0.0
-- Description: Complete schema for the SEI Nexus enterprise operational
--              reasoning platform, including vector support via pgvector.
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- CORE DOMAIN & USER TABLES
-- =============================================================================

CREATE TABLE nexus_domain (
    domain_key          VARCHAR(64)     PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    owner_team          VARCHAR(255),
    owner_email         VARCHAR(255),
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE nexus_user_account (
    email               VARCHAR(255)    PRIMARY KEY,
    display_name        VARCHAR(255)    NOT NULL,
    password_hash       VARCHAR(255)    NOT NULL,
    role                VARCHAR(32)     NOT NULL DEFAULT 'ANALYST'
                            CHECK (role IN ('USER', 'DOMAIN_OWNER', 'ADMIN', 'ANALYST')),
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE nexus_user_session (
    session_key         VARCHAR(64)     PRIMARY KEY,
    user_email          VARCHAR(255)    NOT NULL REFERENCES nexus_user_account(email) ON DELETE CASCADE,
    session_token_hash  VARCHAR(255)    NOT NULL UNIQUE,
    expires_at          TIMESTAMP       NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_session_user    ON nexus_user_session(user_email);
CREATE INDEX idx_user_session_expires ON nexus_user_session(expires_at);

-- =============================================================================
-- DOCUMENT MANAGEMENT TABLES
-- =============================================================================

CREATE TABLE nexus_document (
    document_key        VARCHAR(64)     PRIMARY KEY,
    domain_key          VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    title               VARCHAR(512)    NOT NULL,
    file_path           VARCHAR(1024),
    file_name           VARCHAR(512),
    file_size_bytes     BIGINT,
    content_type        VARCHAR(128),
    tags                TEXT,
    status              VARCHAR(32)     NOT NULL DEFAULT 'UPLOADED'
                            CHECK (status IN ('UPLOADED', 'INDEXING', 'INDEXED', 'FAILED', 'ARCHIVED')),
    chunk_count         INT             NOT NULL DEFAULT 0,
    indexed_at          TIMESTAMP,
    created_by          VARCHAR(255)    REFERENCES nexus_user_account(email),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_domain     ON nexus_document(domain_key);
CREATE INDEX idx_document_status     ON nexus_document(status);
CREATE INDEX idx_document_created_by ON nexus_document(created_by);

CREATE TABLE nexus_document_chunk (
    chunk_key       VARCHAR(64)     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    document_key    VARCHAR(64)     NOT NULL REFERENCES nexus_document(document_key) ON DELETE CASCADE,
    chunk_no        INT             NOT NULL,
    chunk_text      TEXT            NOT NULL,
    embedding       vector(1536),
    token_count     INT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (document_key, chunk_no)
);

CREATE INDEX idx_document_chunk_embedding ON nexus_document_chunk
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_document_chunk_document ON nexus_document_chunk(document_key);

-- =============================================================================
-- CONNECTION MANAGEMENT
-- =============================================================================

CREATE TABLE nexus_connection (
    connection_key      VARCHAR(64)     PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    connection_type     VARCHAR(32)     NOT NULL
                            CHECK (connection_type IN ('POSTGRES', 'ORACLE', 'REST_API')),
    usage_description   TEXT,
    jdbc_url            VARCHAR(1024),
    instance_url        VARCHAR(1024),
    username            VARCHAR(255),
    encrypted_secret    TEXT,
    allowed_schemas     TEXT,
    allowed_tables      TEXT,
    read_only           BOOLEAN         NOT NULL DEFAULT TRUE,
    last_test_status    VARCHAR(32),
    last_test_message   TEXT,
    last_tested_at      TIMESTAMP,
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE', 'ERROR')),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- AGENT TABLES
-- =============================================================================

CREATE TABLE nexus_agent (
    agent_key           VARCHAR(64)     PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    purpose             TEXT            NOT NULL,
    domain_keys         TEXT,
    connection_keys     TEXT,
    rest_api_enabled    BOOLEAN         NOT NULL DEFAULT FALSE,
    action_scope        VARCHAR(32)     NOT NULL DEFAULT 'READ_ONLY'
                            CHECK (action_scope IN ('READ_ONLY', 'READ_WRITE', 'FULL')),
    version_no          INT             NOT NULL DEFAULT 1,
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    created_by          VARCHAR(255)    REFERENCES nexus_user_account(email),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE TABLE nexus_agent_version (
    version_key     VARCHAR(64)     PRIMARY KEY,
    agent_key       VARCHAR(64)     NOT NULL REFERENCES nexus_agent(agent_key) ON DELETE CASCADE,
    version_no      INT             NOT NULL,
    snapshot        JSONB           NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (agent_key, version_no)
);

CREATE INDEX idx_agent_version_agent ON nexus_agent_version(agent_key, version_no DESC);

CREATE TABLE nexus_agent_playbook (
    playbook_key                VARCHAR(64)     PRIMARY KEY,
    agent_key                   VARCHAR(64)     NOT NULL REFERENCES nexus_agent(agent_key) ON DELETE CASCADE,
    name                        VARCHAR(255)    NOT NULL,
    trigger_conditions          TEXT,
    investigation_steps         JSONB,
    escalation_rules            JSONB,
    confidence_threshold        DECIMAL(4,3)    NOT NULL DEFAULT 0.700,
    preferred_evidence_order    JSONB,
    max_investigation_steps     INT             NOT NULL DEFAULT 8,
    status                      VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                                    CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    created_at                  TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_playbook_agent ON nexus_agent_playbook(agent_key);

CREATE TABLE nexus_agent_kpi (
    kpi_key                 VARCHAR(64)     PRIMARY KEY,
    agent_key               VARCHAR(64)     NOT NULL REFERENCES nexus_agent(agent_key) ON DELETE CASCADE,
    domain_key              VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    kpi_name                VARCHAR(255)    NOT NULL,
    kpi_description         TEXT,
    measurement_object_key  VARCHAR(64),
    measurement_sql         TEXT,
    threshold_warning       DECIMAL(18,4),
    threshold_critical      DECIMAL(18,4),
    higher_is_better        BOOLEAN         NOT NULL DEFAULT TRUE,
    refresh_interval_hrs    INT             NOT NULL DEFAULT 24,
    status                  VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kpi_agent  ON nexus_agent_kpi(agent_key);
CREATE INDEX idx_kpi_domain ON nexus_agent_kpi(domain_key);

-- =============================================================================
-- RUN / CONVERSATION TABLES
-- =============================================================================

CREATE TABLE nexus_run (
    run_key         VARCHAR(64)     PRIMARY KEY,
    conversation_id VARCHAR(64)     NOT NULL,
    agent_key       VARCHAR(64),
    domain_key      VARCHAR(64),
    user_email      VARCHAR(255)    REFERENCES nexus_user_account(email),
    question        TEXT            NOT NULL,
    answer          TEXT,
    decision_type   VARCHAR(64),
    status          VARCHAR(32)     NOT NULL DEFAULT 'RUNNING'
                        CHECK (status IN ('RUNNING', 'COMPLETE', 'FAILED')),
    result_snapshot JSONB,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMP
);

CREATE INDEX idx_run_conversation ON nexus_run(conversation_id, created_at DESC);
CREATE INDEX idx_run_user         ON nexus_run(user_email, created_at DESC);
CREATE INDEX idx_run_agent        ON nexus_run(agent_key);

CREATE TABLE nexus_conversation_pin (
    pin_key         VARCHAR(64)     PRIMARY KEY,
    conversation_id VARCHAR(64)     NOT NULL,
    user_email      VARCHAR(255)    NOT NULL REFERENCES nexus_user_account(email) ON DELETE CASCADE,
    pinned_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (conversation_id, user_email)
);

CREATE INDEX idx_pin_user ON nexus_conversation_pin(user_email, pinned_at DESC);

CREATE TABLE nexus_evidence (
    evidence_key    VARCHAR(64)     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    run_key         VARCHAR(64)     NOT NULL REFERENCES nexus_run(run_key) ON DELETE CASCADE,
    evidence_type   VARCHAR(64)     NOT NULL
                        CHECK (evidence_type IN (
                            'ROUTING', 'MEMORY_RETRIEVAL', 'ENTERPRISE_MAP',
                            'SQL_GOVERNANCE', 'SQL_RESULT', 'FEEDBACK', 'ASYNC_EXECUTION'
                        )),
    payload_json    JSONB           NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_run ON nexus_evidence(run_key);

-- =============================================================================
-- DATA OBJECT (ENTERPRISE MAP) TABLES
-- =============================================================================

CREATE TABLE nexus_data_object (
    object_key              VARCHAR(64)     PRIMARY KEY,
    domain_key              VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    entity_name             VARCHAR(255),
    connection_key          VARCHAR(64)     REFERENCES nexus_connection(connection_key),
    schema_name             VARCHAR(128),
    table_name              VARCHAR(255)    NOT NULL,
    business_name           VARCHAR(512),
    purpose                 TEXT,
    identifier_columns      TEXT,
    status_columns          TEXT,
    exception_columns       TEXT,
    safe_filter_columns     TEXT,
    usage_guidance          TEXT,
    filter_guidance         TEXT,
    avoid_guidance          TEXT,
    row_limit               INT             NOT NULL DEFAULT 100,
    large_table             BOOLEAN         NOT NULL DEFAULT FALSE,
    scan_status             VARCHAR(32)     NOT NULL DEFAULT 'PENDING'
                                CHECK (scan_status IN ('PENDING', 'SCANNING', 'SCANNED', 'FAILED')),
    version_no              INT             NOT NULL DEFAULT 1,
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_object_domain     ON nexus_data_object(domain_key);
CREATE INDEX idx_data_object_connection ON nexus_data_object(connection_key);

CREATE TABLE nexus_data_object_version (
    version_key     VARCHAR(64)     PRIMARY KEY,
    object_key      VARCHAR(64)     NOT NULL REFERENCES nexus_data_object(object_key) ON DELETE CASCADE,
    version_no      INT             NOT NULL,
    snapshot        JSONB           NOT NULL,
    change_reason   VARCHAR(512),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (object_key, version_no)
);

CREATE INDEX idx_data_object_version_object ON nexus_data_object_version(object_key, version_no DESC);

CREATE TABLE nexus_data_column (
    column_key          VARCHAR(64)     PRIMARY KEY,
    object_key          VARCHAR(64)     NOT NULL REFERENCES nexus_data_object(object_key) ON DELETE CASCADE,
    column_name         VARCHAR(255)    NOT NULL,
    data_type           VARCHAR(128),
    is_nullable         BOOLEAN         NOT NULL DEFAULT TRUE,
    business_meaning    TEXT,
    is_identifier       BOOLEAN         NOT NULL DEFAULT FALSE,
    is_status           BOOLEAN         NOT NULL DEFAULT FALSE,
    is_error            BOOLEAN         NOT NULL DEFAULT FALSE,
    is_sensitive        BOOLEAN         NOT NULL DEFAULT FALSE,
    is_filterable       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (object_key, column_name)
);

CREATE INDEX idx_data_column_object ON nexus_data_column(object_key);

-- =============================================================================
-- KNOWLEDGE MANAGEMENT TABLES
-- =============================================================================

CREATE TABLE nexus_knowledge_note (
    note_key        VARCHAR(64)     PRIMARY KEY,
    domain_key      VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    entity_name     VARCHAR(255),
    object_key      VARCHAR(64),
    title           VARCHAR(512)    NOT NULL,
    note_text       TEXT            NOT NULL,
    tags            TEXT,
    embedding       vector(1536),
    status          VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'ARCHIVED', 'DRAFT')),
    created_by      VARCHAR(255)    REFERENCES nexus_user_account(email),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_note_domain    ON nexus_knowledge_note(domain_key, status);
CREATE INDEX idx_knowledge_note_embedding ON nexus_knowledge_note
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE nexus_knowledge_gap (
    gap_key             VARCHAR(64)     PRIMARY KEY,
    domain_key          VARCHAR(64),
    gap_type            VARCHAR(32)     NOT NULL
                            CHECK (gap_type IN ('MISSING_KNOWLEDGE', 'KNOWLEDGE_PROPOSAL', 'SOURCE_REQUEST')),
    run_key             VARCHAR(64)     REFERENCES nexus_run(run_key),
    question            TEXT,
    gap_description     TEXT            NOT NULL,
    proposal_text       TEXT,
    status              VARCHAR(32)     NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN ('OPEN', 'RESOLVED', 'DISMISSED')),
    resolved_by         VARCHAR(255)    REFERENCES nexus_user_account(email),
    resolved_note_key   VARCHAR(64)     REFERENCES nexus_knowledge_note(note_key),
    resolution_note     TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_knowledge_gap_domain ON nexus_knowledge_gap(domain_key, status);
CREATE INDEX idx_knowledge_gap_run    ON nexus_knowledge_gap(run_key);

-- =============================================================================
-- INVESTIGATION RECIPE TABLES
-- =============================================================================

CREATE TABLE nexus_investigation_recipe (
    recipe_key          VARCHAR(64)     PRIMARY KEY,
    domain_key          VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    name                VARCHAR(255)    NOT NULL,
    description         TEXT,
    trigger_patterns    TEXT,
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recipe_domain ON nexus_investigation_recipe(domain_key, status);

CREATE TABLE nexus_investigation_step (
    step_key            VARCHAR(64)     PRIMARY KEY,
    recipe_key          VARCHAR(64)     NOT NULL REFERENCES nexus_investigation_recipe(recipe_key) ON DELETE CASCADE,
    step_no             INT             NOT NULL,
    object_key          VARCHAR(64)     REFERENCES nexus_data_object(object_key),
    step_description    TEXT,
    step_sql_template   TEXT,
    expected_finding    TEXT,
    UNIQUE (recipe_key, step_no)
);

CREATE INDEX idx_investigation_step_recipe ON nexus_investigation_step(recipe_key, step_no);

-- =============================================================================
-- QUERY EXECUTION TABLE
-- =============================================================================

CREATE TABLE nexus_query_execution (
    execution_key   VARCHAR(64)     PRIMARY KEY,
    run_key         VARCHAR(64)     NOT NULL REFERENCES nexus_run(run_key),
    step_no         INT             NOT NULL DEFAULT 1,
    connection_key  VARCHAR(64)     REFERENCES nexus_connection(connection_key),
    object_keys     TEXT,
    classification  VARCHAR(64)
                        CHECK (classification IN (
                            'POINT_LOOKUP', 'BOUNDED_LIST', 'AGGREGATION',
                            'JOIN_INVESTIGATION', 'HIGH_RISK_SCAN', 'BLOCKED'
                        )),
    route           VARCHAR(32)
                        CHECK (route IN ('EXECUTE_SYNC', 'EXECUTE_ASYNC', 'ASK_FOR_FILTER', 'BLOCK')),
    risk_level      VARCHAR(16)
                        CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status          VARCHAR(32)     NOT NULL DEFAULT 'PLANNED'
                        CHECK (status IN ('PLANNED', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'BLOCKED')),
    estimated_rows  BIGINT,
    estimated_cost  BIGINT,
    timeout_seconds INT,
    row_limit       INT,
    original_sql    TEXT,
    approved_sql    TEXT,
    decision_reason TEXT,
    error_message   TEXT,
    result_json     JSONB,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMP,
    completed_at    TIMESTAMP
);

CREATE INDEX idx_query_execution_run    ON nexus_query_execution(run_key);
CREATE INDEX idx_query_execution_status ON nexus_query_execution(status, created_at DESC);

-- =============================================================================
-- PHASE 2 - SEMANTIC LAYER TABLES
-- =============================================================================

CREATE TABLE nexus_business_entity (
    entity_key              VARCHAR(64)     PRIMARY KEY,
    domain_key              VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    entity_name             VARCHAR(255)    NOT NULL,
    description             TEXT,
    primary_object_key      VARCHAR(64)     REFERENCES nexus_data_object(object_key),
    operational_meaning     TEXT,
    investigation_hints     TEXT,
    embedding               vector(1536),
    status                  VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
    created_by              VARCHAR(255)    REFERENCES nexus_user_account(email),
    created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_business_entity_domain    ON nexus_business_entity(domain_key, status);
CREATE INDEX idx_business_entity_embedding ON nexus_business_entity
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE nexus_entity_lifecycle_state (
    state_key       VARCHAR(64)     PRIMARY KEY,
    entity_key      VARCHAR(64)     NOT NULL REFERENCES nexus_business_entity(entity_key) ON DELETE CASCADE,
    state_name      VARCHAR(128)    NOT NULL,
    state_code      VARCHAR(128),
    meaning         TEXT,
    is_terminal     BOOLEAN         NOT NULL DEFAULT FALSE,
    is_exception    BOOLEAN         NOT NULL DEFAULT FALSE,
    normal_sequence INT,
    next_states     JSONB,
    detection_rule  TEXT,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lifecycle_entity ON nexus_entity_lifecycle_state(entity_key);

CREATE TABLE nexus_entity_relationship (
    relationship_key    VARCHAR(64)     PRIMARY KEY,
    source_entity_key   VARCHAR(64)     NOT NULL REFERENCES nexus_business_entity(entity_key),
    target_entity_key   VARCHAR(64)     NOT NULL REFERENCES nexus_business_entity(entity_key),
    relationship_type   VARCHAR(64)     NOT NULL
                            CHECK (relationship_type IN ('HAS_MANY', 'BELONGS_TO', 'REFERENCES', 'LINKED_VIA')),
    source_column       VARCHAR(255),
    target_column       VARCHAR(255),
    join_guidance       TEXT,
    cross_system        BOOLEAN         NOT NULL DEFAULT FALSE,
    identity_resolution TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entity_relationship_source ON nexus_entity_relationship(source_entity_key);
CREATE INDEX idx_entity_relationship_target ON nexus_entity_relationship(target_entity_key);

CREATE TABLE nexus_operational_vocabulary (
    term_key        VARCHAR(64)     PRIMARY KEY,
    domain_key      VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    entity_key      VARCHAR(64)     REFERENCES nexus_business_entity(entity_key),
    term            VARCHAR(255)    NOT NULL,
    definition      TEXT            NOT NULL,
    sql_equivalent  TEXT,
    examples        TEXT,
    embedding       vector(1536),
    status          VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vocabulary_domain     ON nexus_operational_vocabulary(domain_key, status);
CREATE INDEX idx_vocabulary_embedding  ON nexus_operational_vocabulary
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE TABLE nexus_entity_data_mapping (
    mapping_key         VARCHAR(64)     PRIMARY KEY,
    entity_key          VARCHAR(64)     NOT NULL REFERENCES nexus_business_entity(entity_key) ON DELETE CASCADE,
    object_key          VARCHAR(64)     NOT NULL REFERENCES nexus_data_object(object_key),
    field_mappings      JSONB,
    identity_columns    JSONB,
    is_primary          BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (entity_key, object_key)
);

CREATE INDEX idx_entity_data_mapping_entity ON nexus_entity_data_mapping(entity_key);
CREATE INDEX idx_entity_data_mapping_object ON nexus_entity_data_mapping(object_key);

-- =============================================================================
-- PHASE 5 - REASONING SESSION TABLES
-- =============================================================================

CREATE TABLE nexus_reasoning_session (
    session_key         VARCHAR(64)     PRIMARY KEY,
    run_key             VARCHAR(64)     NOT NULL REFERENCES nexus_run(run_key),
    conversation_id     VARCHAR(64)     NOT NULL,
    agent_key           VARCHAR(64)     REFERENCES nexus_agent(agent_key),
    domain_key          VARCHAR(64),
    initial_question    TEXT            NOT NULL,
    investigation_plan  JSONB,
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'CONCLUDED', 'INCONCLUSIVE', 'ABANDONED')),
    conclusion          TEXT,
    confidence_score    DECIMAL(4,3),
    started_at          TIMESTAMP       NOT NULL DEFAULT NOW(),
    concluded_at        TIMESTAMP
);

CREATE INDEX idx_reasoning_conversation ON nexus_reasoning_session(conversation_id, started_at DESC);
CREATE INDEX idx_reasoning_run          ON nexus_reasoning_session(run_key);

CREATE TABLE nexus_reasoning_step (
    step_key            VARCHAR(64)     PRIMARY KEY,
    session_key         VARCHAR(64)     NOT NULL REFERENCES nexus_reasoning_session(session_key) ON DELETE CASCADE,
    step_no             INT             NOT NULL,
    step_type           VARCHAR(64)     NOT NULL
                            CHECK (step_type IN (
                                'HYPOTHESIS_FORM', 'DATA_CHECK', 'MEMORY_RETRIEVAL',
                                'COMPARISON', 'ENTITY_LOOKUP', 'CONCLUSION'
                            )),
    instruction         TEXT,
    evidence_used       JSONB,
    outcome             TEXT,
    confidence_delta    DECIMAL(4,3),
    execution_key       VARCHAR(64)     REFERENCES nexus_query_execution(execution_key),
    executed_at         TIMESTAMP       NOT NULL DEFAULT NOW(),
    UNIQUE (session_key, step_no)
);

CREATE INDEX idx_reasoning_step_session ON nexus_reasoning_step(session_key, step_no);

CREATE TABLE nexus_hypothesis (
    hypothesis_key          VARCHAR(64)     PRIMARY KEY,
    session_key             VARCHAR(64)     NOT NULL REFERENCES nexus_reasoning_session(session_key) ON DELETE CASCADE,
    hypothesis_text         TEXT            NOT NULL,
    confidence              DECIMAL(4,3)    NOT NULL DEFAULT 0.500,
    supporting_evidence     JSONB,
    contradicting_evidence  JSONB,
    status                  VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE', 'CONFIRMED', 'REJECTED', 'INCONCLUSIVE')),
    formed_at               TIMESTAMP       NOT NULL DEFAULT NOW(),
    resolved_at             TIMESTAMP
);

CREATE INDEX idx_hypothesis_session ON nexus_hypothesis(session_key, status);

-- =============================================================================
-- OPERATIONAL FINDINGS
-- =============================================================================

CREATE TABLE nexus_operational_finding (
    finding_key             VARCHAR(64)     PRIMARY KEY,
    domain_key              VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    agent_key               VARCHAR(64)     REFERENCES nexus_agent(agent_key),
    finding_type            VARCHAR(64)     NOT NULL
                                CHECK (finding_type IN (
                                    'ANOMALY', 'PATTERN', 'ROOT_CAUSE',
                                    'CORRELATION', 'TREND', 'THRESHOLD_BREACH'
                                )),
    title                   VARCHAR(512)    NOT NULL,
    description             TEXT,
    evidence_summary        JSONB,
    related_entity_keys     JSONB,
    confidence              DECIMAL(4,3),
    status                  VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE', 'RESOLVED', 'MONITORING', 'DISMISSED')),
    first_observed_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    last_confirmed_at       TIMESTAMP       NOT NULL DEFAULT NOW(),
    resolved_at             TIMESTAMP,
    embedding               vector(1536)
);

CREATE INDEX idx_finding_domain    ON nexus_operational_finding(domain_key, status);
CREATE INDEX idx_finding_agent     ON nexus_operational_finding(agent_key, status);
CREATE INDEX idx_finding_embedding ON nexus_operational_finding
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- =============================================================================
-- PHASE 8 - OPERATIONAL BASELINE & ANOMALY DETECTION
-- =============================================================================

CREATE TABLE nexus_operational_baseline (
    baseline_key        VARCHAR(64)     PRIMARY KEY,
    domain_key          VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    agent_key           VARCHAR(64)     REFERENCES nexus_agent(agent_key),
    kpi_key             VARCHAR(64)     REFERENCES nexus_agent_kpi(kpi_key),
    metric_name         VARCHAR(255)    NOT NULL,
    measurement_sql     TEXT            NOT NULL,
    connection_key      VARCHAR(64)     REFERENCES nexus_connection(connection_key),
    current_value       DECIMAL(18,4),
    baseline_avg        DECIMAL(18,4),
    baseline_stddev     DECIMAL(18,4),
    measurement_window  VARCHAR(32)     NOT NULL DEFAULT 'DAILY'
                            CHECK (measurement_window IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    trend_data          JSONB           NOT NULL DEFAULT '[]',
    last_computed_at    TIMESTAMP,
    next_due_at         TIMESTAMP,
    status              VARCHAR(32)     NOT NULL DEFAULT 'ACTIVE'
                            CHECK (status IN ('ACTIVE', 'INACTIVE', 'PAUSED')),
    created_at          TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_baseline_domain   ON nexus_operational_baseline(domain_key, status);
CREATE INDEX idx_baseline_next_due ON nexus_operational_baseline(next_due_at) WHERE status = 'ACTIVE';

CREATE TABLE nexus_anomaly_event (
    anomaly_key         VARCHAR(64)     PRIMARY KEY,
    baseline_key        VARCHAR(64)     NOT NULL REFERENCES nexus_operational_baseline(baseline_key),
    domain_key          VARCHAR(64)     NOT NULL REFERENCES nexus_domain(domain_key),
    entity_key          VARCHAR(64)     REFERENCES nexus_business_entity(entity_key),
    detected_at         TIMESTAMP       NOT NULL DEFAULT NOW(),
    metric_name         VARCHAR(255),
    baseline_value      DECIMAL(18,4),
    observed_value      DECIMAL(18,4),
    deviation_pct       DECIMAL(8,2),
    deviation_stddev    DECIMAL(8,2),
    severity            VARCHAR(16)     NOT NULL
                            CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status              VARCHAR(32)     NOT NULL DEFAULT 'OPEN'
                            CHECK (status IN ('OPEN', 'INVESTIGATING', 'RESOLVED')),
    finding_key         VARCHAR(64)     REFERENCES nexus_operational_finding(finding_key)
);

CREATE INDEX idx_anomaly_domain   ON nexus_anomaly_event(domain_key, status, detected_at DESC);
CREATE INDEX idx_anomaly_baseline ON nexus_anomaly_event(baseline_key, detected_at DESC);

-- =============================================================================
-- PHASE 9 - AUDIT EVENT TABLE
-- =============================================================================

CREATE TABLE nexus_audit_event (
    event_key       VARCHAR(64)     PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_type      VARCHAR(64)     NOT NULL,
    user_email      VARCHAR(255),
    domain_key      VARCHAR(64),
    resource_type   VARCHAR(64),
    resource_key    VARCHAR(64),
    metadata        JSONB,
    ip_address      VARCHAR(64),
    occurred_at     TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user     ON nexus_audit_event(user_email, occurred_at DESC);
CREATE INDEX idx_audit_type     ON nexus_audit_event(event_type, occurred_at DESC);
CREATE INDEX idx_audit_resource ON nexus_audit_event(resource_type, resource_key, occurred_at DESC);

-- =============================================================================
-- SEED DATA
-- Default admin account: admin@nexus.local / NexusAdmin1!
-- IMPORTANT: Change this password immediately after first login.
-- Hash generated with: SELECT crypt('NexusAdmin1!', gen_salt('bf', 12));
-- =============================================================================

INSERT INTO nexus_domain (domain_key, name, description, owner_team, status)
VALUES (
    'PLATFORM',
    'SEI Nexus Platform',
    'Platform-level domain for administrative agents and global configuration.',
    'Platform Engineering',
    'ACTIVE'
);

INSERT INTO nexus_user_account (email, display_name, password_hash, role, status)
VALUES (
    'admin@nexus.local',
    'Nexus Administrator',
    '$2a$12$Hf8dVfcnwgFpRzCm3KX5GOjueMSCtHe.lH3TfUbXLk8N9X4iuVo9y',
    'ADMIN',
    'ACTIVE'
);
