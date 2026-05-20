# Zevra — Advanced Capabilities Implementation Plan

> **Status:** Planning  
> **Created:** 2026-05-20  
> **Author:** Engineering (via Claude Sonnet 4.6)  
> **Scope:** Four major capability areas that establish genuine competitive differentiation

---

## Table of Contents

1. [Overview](#overview)
2. [Phase 1 — Governance Core](#phase-1--governance-core-weeks-14)
3. [Phase 2 — Multi-step Reasoning Engine](#phase-2--multi-step-reasoning-engine-weeks-36)
4. [Phase 3 — Semantic Learning](#phase-3--semantic-learning-weeks-58)
5. [Phase 4 — Industry Context Packs](#phase-4--industry-context-packs-weeks-710)
6. [Phase 5 — UI Polish & Integration](#phase-5--ui-polish--integration-weeks-912)
7. [Migration Plan](#migration-plan-summary)
8. [New Java Classes](#new-java-classes-summary)
9. [Recommended Build Order](#recommended-build-order)

---

## Overview

| Capability | Complexity | New DB Tables | New Java Services | Phase |
|---|---|---|---|---|
| Advanced Governance (column masking, RLS, contracts) | High | 4 | 4 | 1 |
| Multi-step Reasoning | High | 2 (extend existing) | 5 | 2 |
| Semantic Learning | Medium | 3 | 4 | 3 |
| Industry Context Packs | Medium | 2 | 3 | 4 |

**Next Flyway migration version:** V019 (V018 = chat_attachments is the current latest)

**Guiding principle:** Each phase delivers independently shippable value. No phase requires a subsequent phase to be useful.

---

## Phase 1 — Governance Core (Weeks 1–4)

**Goal:** Column masking and row-level security working end-to-end. These are blockers for enterprise procurement and have no dependencies on other phases.

### Why this first

Enterprise security reviews ask three questions before approving any data tool:
1. Can it write to our database? (Already answered: no — read-only)
2. Can it expose PII columns to unauthorised users? (Not yet answered — this phase fixes it)
3. Can we audit every query it runs? (Not yet answered — this phase fixes it)

### 1.1 Database Migrations

#### V019 — Governance Policies

```sql
-- Column-level masking policies
CREATE TABLE nexus_column_policy (
    id              BIGSERIAL PRIMARY KEY,
    tenant_schema   VARCHAR(100) NOT NULL,
    object_key      VARCHAR(255) NOT NULL,
    column_name     VARCHAR(255) NOT NULL,
    mask_type       VARCHAR(50)  NOT NULL,
    -- EXCLUDE   → column removed from SELECT entirely
    -- HASH      → MD5(CAST(col AS TEXT)) AS col
    -- PARTIAL   → LEFT(CAST(col AS TEXT), N) || '****' AS col
    -- CONSTANT  → 'REDACTED' AS col
    constant_value  VARCHAR(255),          -- used when mask_type = CONSTANT
    partial_chars   INT DEFAULT 3,         -- chars visible when mask_type = PARTIAL
    exempt_roles    TEXT[],                -- roles that see the real value (NULL = no exemptions)
    applies_to_all  BOOLEAN DEFAULT TRUE,
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row-level security policies
CREATE TABLE nexus_rls_policy (
    id              BIGSERIAL PRIMARY KEY,
    tenant_schema   VARCHAR(100) NOT NULL,
    policy_name     VARCHAR(255) NOT NULL,
    object_key      VARCHAR(255) NOT NULL,
    filter_template TEXT NOT NULL,
    -- Template placeholders resolved at query time:
    -- {user.region}     → user's attributes.region
    -- {user.department} → user's attributes.department
    -- {user.email}      → user's email address
    -- Example: "region = '{user.region}' AND department = '{user.department}'"
    applies_to_roles TEXT[],               -- NULL = applies to all roles
    is_active        BOOLEAN DEFAULT TRUE,
    created_by       VARCHAR(255),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Data contracts — rules every query against a table must satisfy
CREATE TABLE nexus_data_contract (
    id              BIGSERIAL PRIMARY KEY,
    tenant_schema   VARCHAR(100) NOT NULL,
    contract_name   VARCHAR(255) NOT NULL,
    object_key      VARCHAR(255) NOT NULL,
    rule_type       VARCHAR(100) NOT NULL,
    -- REQUIRE_DATE_FILTER  → query must have WHERE on a date column
    -- REQUIRE_COLUMN_FILTER → query must have WHERE on a specified column
    -- REQUIRE_LIMIT        → query must have a LIMIT clause
    -- BLOCK_FULL_SCAN      → reject any SELECT without a WHERE clause
    rule_config     JSONB NOT NULL,
    -- REQUIRE_DATE_FILTER: {"columns": ["created_at", "order_date"], "max_range_days": 90}
    -- REQUIRE_COLUMN_FILTER: {"column": "tenant_id"}
    -- REQUIRE_LIMIT: {"max_rows": 10000}
    enforcement     VARCHAR(50) DEFAULT 'BLOCK',
    -- BLOCK          → reject query, return explanation to user
    -- WARN           → log violation, allow execution
    -- AUTO_REMEDIATE → rewrite SQL to add the missing constraint
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- User attribute store for RLS template resolution
ALTER TABLE nexus_user_account
    ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}';
    -- Example: {"region": "NORTH", "department": "Finance", "entity": "HQ"}
```

#### V020 — Compliance Audit Log

```sql
CREATE TABLE nexus_audit_event (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_schema           VARCHAR(100) NOT NULL,
    event_type              VARCHAR(100) NOT NULL,
    -- QUERY_EXECUTED | COLUMN_MASKED | RLS_APPLIED
    -- CONTRACT_VIOLATED | ACCESS_DENIED | DATA_EXPORTED
    user_email              VARCHAR(255),
    user_roles              TEXT[],
    run_key                 VARCHAR(255),
    connection_key          VARCHAR(255),
    object_keys             TEXT[],           -- tables accessed
    columns_accessed        TEXT[],
    columns_masked          TEXT[],
    rls_policies_applied    TEXT[],
    contracts_checked       TEXT[],
    contracts_violated      TEXT[],
    original_sql            TEXT,             -- what the AI generated
    executed_sql            TEXT,             -- what actually ran (post-masking + RLS)
    row_count_returned      INT,
    rows_filtered_by_rls    INT,
    execution_ms            INT,
    ip_address              VARCHAR(100),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_user  ON nexus_audit_event(tenant_schema, user_email, created_at DESC);
CREATE INDEX idx_audit_event_type   ON nexus_audit_event(tenant_schema, event_type, created_at DESC);
CREATE INDEX idx_audit_run_key      ON nexus_audit_event(run_key);
```

### 1.2 New Backend Services

#### `ColumnMaskingService.java` — package `governance`

Intercepts the `approvedSql` returned by `QueryGovernanceService.govern()` and rewrites `SELECT` column references that have an active policy for the current user.

**Key method:**
```java
MaskResult apply(String sql, String userEmail, List<String> objectKeys, String tenantSchema)
```

**Logic:**
```
Parse SELECT clause columns
For each column:
  → Check nexus_column_policy for (tenantSchema, objectKey, columnName)
  → If policy exists AND user's roles NOT in exempt_roles:
      EXCLUDE  → remove column from SELECT
      HASH     → replace col with MD5(CAST(col AS TEXT)) AS col
      PARTIAL  → replace col with LEFT(CAST(col AS TEXT), N) || '****' AS col
      CONSTANT → replace col with 'REDACTED' AS col
Return MaskResult(rewrittenSql, List<maskedColumns>)
```

**`MaskResult` record:**
```java
record MaskResult(String sql, List<String> maskedColumns) {}
```

---

#### `RowLevelSecurityService.java` — package `governance`

Appends `WHERE` conditions to SQL based on active RLS policies for the tables involved.

**Key method:**
```java
RlsResult apply(String sql, UserAccount user, List<String> objectKeys, String tenantSchema)
```

**Logic:**
```
For each objectKey in the query:
  → Load active RLS policies where applies_to_roles contains user's role (or is NULL)
  → For each matching policy:
      Resolve template placeholders using user.attributes JSONB
      Append as AND condition to SQL WHERE clause
Return RlsResult(rewrittenSql, List<appliedPolicyNames>, rowsFilteredEstimate)
```

**`RlsResult` record:**
```java
record RlsResult(String sql, List<String> policiesApplied) {}
```

---

#### `DataContractService.java` — package `governance`

Pre-execution validator. Checks generated SQL against active contracts before the query runs.

**Key method:**
```java
ContractResult evaluate(String sql, List<String> objectKeys, String tenantSchema)
```

**Logic per rule type:**
```
REQUIRE_DATE_FILTER  → parse WHERE clause, check for date column reference
REQUIRE_COLUMN_FILTER → parse WHERE clause, check for specified column
REQUIRE_LIMIT        → check SQL contains LIMIT keyword
BLOCK_FULL_SCAN      → check SQL has WHERE clause

If violation:
  BLOCK          → return ContractResult(BLOCKED, reason)
  WARN           → return ContractResult(WARNED, reason, originalSql)
  AUTO_REMEDIATE → rewrite SQL to add missing constraint, return ContractResult(REMEDIATED, rewrittenSql)
```

**`ContractResult` record:**
```java
record ContractResult(
    ContractStatus status,    // PASSED | BLOCKED | WARNED | REMEDIATED
    List<String> violations,
    String remediatedSql      // non-null only when status = REMEDIATED
) {}
```

---

#### `GovernanceAuditService.java` — package `governance`

Called `@Async` after every query execution. Writes a `nexus_audit_event` row combining output from all three governance services above.

**Key method:**
```java
void record(AuditContext ctx)  // called fire-and-forget after executeQuery()
```

---

#### Integration into `ChatService.java`

Replace the current execution path in the `QUERY_LIVE_DATA` branch:

**Before:**
```java
var gov = queryGovernanceService.govern(...);
List<Map<String,Object>> rows = dynamicSqlService.executeQuery(connKey, gov.approvedSql(), limit);
```

**After:**
```java
var gov       = queryGovernanceService.govern(...);
var contract  = dataContractService.evaluate(gov.approvedSql(), objKeys, tenantSchema);
if (contract.status() == BLOCKED) { /* return blocked message */ }

String sql    = contract.remediatedSql() != null ? contract.remediatedSql() : gov.approvedSql();
var rls       = rowLevelSecurityService.apply(sql, currentUser, objKeys, tenantSchema);
var masked    = columnMaskingService.apply(rls.sql(), userEmail, objKeys, tenantSchema);

List<Map<String,Object>> rows = dynamicSqlService.executeQuery(connKey, masked.sql(), limit);
governanceAuditService.record(buildAuditContext(gov, contract, rls, masked, rows));
```

### 1.3 New API Endpoints

New controller: **`GovernanceController.java`** at `/governance`

```
# Column policies
GET    /governance/column-policies                list for tenant
POST   /governance/column-policies                create
DELETE /governance/column-policies/{id}           delete

# RLS policies
GET    /governance/rls-policies                   list for tenant
POST   /governance/rls-policies                   create
PATCH  /governance/rls-policies/{id}              activate / deactivate
DELETE /governance/rls-policies/{id}              delete

# Data contracts
GET    /governance/contracts                      list for tenant
POST   /governance/contracts                      create
DELETE /governance/contracts/{id}                 delete

# Audit log
GET    /governance/audit                          paginated audit events
       ?objectKey=&userEmail=&eventType=&from=&to=&page=&size=
GET    /governance/audit/export                   download as CSV

# Policy simulator
POST   /governance/simulate                       show effective SQL for a given user
       body: { userEmail, objectKey, sampleSql }
       returns: {
         originalSql, effectiveSql,
         maskedColumns, rlsPoliciesApplied,
         contractsViolated, contractEnforcement
       }
```

The **simulate** endpoint is the most important for adoption — it lets admins verify exactly what a user would see before rolling out policies.

### 1.4 Frontend: Governance Hub

New page at `/governance` with four tabs:

| Tab | Content |
|---|---|
| **Column Policies** | Table → Column → Mask type → Exempt roles. Add/remove. Warning banner when EXCLUDE removes a column entirely. |
| **Row Filters** | Policy cards: Table → Filter rule → Applies to roles → Active toggle. Live preview showing filter expression with current user's attributes substituted. |
| **Data Contracts** | Rule builder per table. Rule type dropdown + config fields + enforcement selector. |
| **Audit Log** | Date-filtered table: Time \| User \| Event \| Tables \| Columns masked \| RLS applied \| Rows returned. CSV export. |

**Additional:** In the Enterprise Map object detail panel, add a **"Data Policies"** tab showing which column and RLS policies exist for that table — so admins can manage policies without leaving the object context.

---

## Phase 2 — Multi-step Reasoning Engine (Weeks 3–6)

**Goal:** Replace single-shot SQL planning with an iterative hypothesis-and-verify loop. The AI looks at partial results and decides what to query next.

### The problem with the current approach

`generateInvestigationPlan()` generates all SQL steps in a single LLM call before seeing any data. The LLM is essentially guessing what joins and filters will be needed. It cannot adapt based on what it finds.

### What changes

The new approach executes one step at a time, feeds actual result rows back to the planner, and lets it decide whether to continue, change direction, or conclude.

**Example query this unlocks:**

> "Why did revenue drop in March?"

| Step | Action | Result |
|---|---|---|
| 1 | Query revenue by month | Confirms March is −12% |
| 2 | (Informed by step 1) Break March down by product category | Electronics category dropped −34% |
| 3 | (Informed by step 2) Query returns for Electronics in March | Returns spiked 3× in Northeast |
| Answer | "March revenue dropped 12%. The driver is a 3× spike in Electronics returns concentrated in the Northeast region." | — |

This level of multi-hop causal reasoning is impossible with single-shot planning.

### 2.1 Architecture: ReAct-style loop

```
QUESTION
  │
  ▼
Planner: "What single SQL query will give me the most useful information?"
  │
  ▼
Executor: Run query, collect rows
  │
  ▼
Evaluator: "Given what I know now, can I answer the question?"
  ├── SUFFICIENT  → go to Synthesizer
  ├── NEED_MORE   → Planner generates next step (WITH result context)
  └── DEAD_END    → Synthesizer composes best-effort answer
  │
  ▼ (loop, max 6 iterations)
Synthesizer: Compose final answer from all accumulated evidence
```

### 2.2 Database Changes (V021)

Extend existing reasoning tables:

```sql
ALTER TABLE nexus_reasoning_step
    ADD COLUMN input_evidence_summary TEXT,
    -- compact summary of previous steps' results fed to this step's planner
    ADD COLUMN step_output_json       JSONB,
    -- full step result rows, capped at 200 rows
    ADD COLUMN planner_rationale      TEXT,
    -- why the planner chose this SQL
    ADD COLUMN evaluator_decision     VARCHAR(50),
    -- SUFFICIENT | NEED_MORE_DATA | NEED_DIFFERENT_APPROACH | DEAD_END
    ADD COLUMN evaluator_rationale    TEXT;

ALTER TABLE nexus_reasoning_session
    ADD COLUMN step_count             INT DEFAULT 0,
    ADD COLUMN total_rows_processed   INT DEFAULT 0,
    ADD COLUMN cross_source           BOOLEAN DEFAULT FALSE;
    -- true when multiple database connections were queried
```

### 2.3 New Backend Services

#### `ReasoningEngine.java` — package `reasoning`

Replaces the SQL planning + execution section inside `ChatService`'s `QUERY_LIVE_DATA` branch. Owns the full iterative loop.

**Key method:**
```java
ReasoningResult reason(
    String question,
    String enrichedQuestion,     // includes attachment content if present
    String sessionKey,
    Map<String, Object> entCtx,
    String semCtx,
    List<DocumentChunk> memChunks,
    NexusAgent agent,
    String userEmail,
    boolean forceAsync
)
```

**Internal loop:**
```java
EvidenceStore evidence = new EvidenceStore();
int step = 1;
EvaluationDecision decision = NEED_MORE_DATA;

while (step <= MAX_STEPS && decision == NEED_MORE_DATA) {
    StepPlan plan = planner.nextStep(question, evidence, entCtx, semCtx);
    if (plan == null) break; // planner says it has enough

    StepResult result = executor.run(plan, userEmail, forceAsync);
    evidence.add(step, plan, result);
    reasoningRepository.saveStep(buildReasoningStep(sessionKey, step, plan, result));

    decision = evaluator.evaluate(question, evidence);
    step++;
}

return synthesizer.compose(question, evidence, decision);
```

---

#### `ReasoningPlanner.java` — package `reasoning`

Generates the **single next** SQL step given accumulated evidence so far. Key difference from current: it receives actual result summaries from previous steps, not just schema.

**System prompt to LLM:**
```
You are a SQL investigator building a case step by step.
You have run [N] queries so far. Here is what you have found:
[evidence summary]

Based on this, generate the SINGLE next SQL query that will most advance the investigation.
If you already have enough data to answer the question, return null.
Return JSON: {"description":"...", "sql":"...", "connection_key":"...", "rationale":"..."}
```

---

#### `ReasoningEvaluator.java` — package `reasoning`

After each step, decides whether to continue.

**Returns:** `SUFFICIENT | NEED_MORE_DATA | NEED_DIFFERENT_APPROACH | DEAD_END`

**System prompt to LLM:**
```
Question: [question]
Evidence gathered so far: [evidence summary]

Can you fully answer the question? Partially? Or do you need more data?
Return JSON: {"decision": "SUFFICIENT|NEED_MORE_DATA|DEAD_END", "rationale": "..."}
```

---

#### `EvidenceStore.java` — package `reasoning`

In-memory accumulator for a single reasoning session. Stores each step's SQL, results, and summary.

**Key record:**
```java
record StepEvidence(
    int stepNo,
    String description,
    String sql,
    String connectionKey,
    List<Map<String, Object>> rows,
    String rowSummary,          // compact statistical summary for LLM context
    Instant executedAt,
    long executionMs
) {}
```

**Key method:**
```java
String buildContextForPlanner()
// Returns compact multi-line string summarising all steps so far
// Avoids token overflow by using row statistics not raw data
```

---

#### `CrossSourceMerger.java` — package `reasoning`

When step 1 retrieves data from connection A and step 2 needs to join it with connection B (different databases), performs the join in-memory using a common key column.

```java
List<Map<String, Object>> merge(
    List<Map<String, Object>> leftRows,
    String leftKey,
    List<Map<String, Object>> rightRows,
    String rightKey,
    JoinType joinType    // INNER | LEFT
)
```

### 2.4 SSE Streaming Endpoint (High value)

Instead of waiting for the full reasoning to complete, stream each step to the frontend as it happens.

**New endpoint:** `GET /chat/runs/{runKey}/stream` — Server-Sent Events

```
data: {"type":"step_started","stepNo":1,"description":"Querying revenue by month"}
data: {"type":"step_completed","stepNo":1,"rowCount":12,"summary":"12 months retrieved"}
data: {"type":"evaluation","decision":"NEED_MORE_DATA","rationale":"March drop confirmed, need category breakdown"}
data: {"type":"step_started","stepNo":2,"description":"Breaking down March by product category"}
data: {"type":"step_completed","stepNo":2,"rowCount":8}
data: {"type":"answer_ready","answer":"...","queryData":[...]}
```

### 2.5 Frontend: Reasoning Trace Panel

When a `QUERY_LIVE_DATA` answer arrives, render a collapsible **"How Zevra investigated this"** panel below the answer.

Each step shows:
- Step number + description
- SQL run (expandable)
- Row count returned
- Evaluator decision + rationale
- Arrow to next step

If SSE is implemented, the panel appears and expands step by step in real-time — similar to Perplexity's source-loading animation.

---

## Phase 3 — Semantic Learning (Weeks 5–8)

**Goal:** Zevra improves automatically from team usage. After 50 queries, it should perform noticeably better on industry-specific terminology than on day one.

### What gets learned

| Signal | Trigger | What is extracted |
|---|---|---|
| **Query success** | QUERY_LIVE_DATA completes, no immediate correction | Business term → SQL pattern mapping |
| **User correction** | Follow-up contradicts/refines prior answer | What was wrong, what the correct interpretation is |
| **Positive feedback** | Thumbs up on `POST /chat/runs/{runKey}/feedback` | Reinforces the patterns used in that run |

### 3.1 Database Changes (V022)

```sql
-- Learned business term → SQL mapping
CREATE TABLE nexus_learned_mapping (
    id              BIGSERIAL PRIMARY KEY,
    tenant_schema   VARCHAR(100) NOT NULL,
    domain_key      VARCHAR(255),
    business_term   VARCHAR(500) NOT NULL,
    -- Examples: "late order", "active customer", "at-risk account"
    sql_pattern     TEXT NOT NULL,
    -- Examples: "status = 'DELAYED' AND eta < NOW()"
    source_run_key  VARCHAR(255),
    source          VARCHAR(50)  NOT NULL,
    -- QUERY_SUCCESS | USER_CORRECTION | POSITIVE_FEEDBACK
    confidence      FLOAT DEFAULT 0.5,   -- 0.0–1.0; increases with reinforcement
    use_count       INT DEFAULT 0,
    last_used_at    TIMESTAMPTZ,
    promoted        BOOLEAN DEFAULT FALSE,
    -- true = graduated to formal nexus_operational_vocabulary entry
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_learned_term ON nexus_learned_mapping(tenant_schema, domain_key, business_term);

-- Detected user corrections for future context injection
CREATE TABLE nexus_correction (
    id                       BIGSERIAL PRIMARY KEY,
    tenant_schema            VARCHAR(100) NOT NULL,
    conversation_id          VARCHAR(255),
    original_run_key         VARCHAR(255),
    correction_run_key       VARCHAR(255),
    original_interpretation  TEXT,
    corrected_interpretation TEXT,
    correction_type          VARCHAR(100),
    -- TIMEFRAME | ENTITY | FILTER | METRIC | DIRECTION
    extracted_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Canonical common queries — questions the team asks repeatedly
CREATE TABLE nexus_common_query (
    id                   BIGSERIAL PRIMARY KEY,
    tenant_schema        VARCHAR(100) NOT NULL,
    domain_key           VARCHAR(255),
    canonical_question   TEXT NOT NULL,     -- normalised question form
    example_questions    TEXT[],            -- actual phrasings seen
    representative_sql   TEXT,              -- SQL that best answered it
    success_count        INT DEFAULT 0,
    avg_user_rating      FLOAT,
    last_run_at          TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 New Backend Services

#### `SemanticLearningService.java` — package `semantic`

Called `@Async` after every successful `QUERY_LIVE_DATA` run from `ChatService`. Does not block the response.

```java
@Async
void learnFromRun(
    String runKey,
    String question,
    String executedSql,
    List<Map<String, Object>> results,
    String tenantSchema,
    String domainKey
)
```

Internally calls `TermExtractor`, `CorrectionDetector`, and `CommonQueryClusterer`.

**Confidence decay and promotion (nightly `@Scheduled` job):**
```
use_count >= 10 AND confidence >= 0.8
  → promoted = true
  → Create nexus_operational_vocabulary entry (visible in Semantic Layer UI)

use_count >= 5 AND confidence < 0.2
  → DELETE (never reinforced, likely wrong extraction)
```

---

#### `TermExtractor.java` — package `semantic`

LLM-based extractor. Given a question and the SQL that answered it, extracts business term → SQL pattern pairs.

**System prompt:**
```
Given a user's business question and the SQL that answered it, extract up to 3 business
terms the user implicitly defined and their SQL equivalents.
Return JSON array: [{"term": "late shipment", "sql": "status = 'DELAYED' AND eta < NOW()"}]
Return [] if no clear business terms are present.
```

---

#### `CorrectionDetector.java` — package `semantic`

Detects when a conversation turn corrects a prior answer, and extracts what changed.

```java
Optional<Correction> detect(String currentQuestion, String priorQuestion, String priorAnswer)
```

**System prompt:**
```
Did the user's second message correct, refine, or contradict the first answer?
If yes, return JSON: {
  "is_correction": true,
  "correction_type": "TIMEFRAME|ENTITY|FILTER|METRIC|DIRECTION",
  "original_interpretation": "...",
  "corrected_interpretation": "..."
}
If no, return {"is_correction": false}
```

---

#### `LearningContextBuilder.java` — package `semantic`

Called before `generateInvestigationPlan()` in `ChatService` to inject accumulated learnings. This is what makes the platform progressively smarter.

```java
String buildLearningContext(String question, String tenantSchema, String domainKey)
```

**Output example:**
```
Based on previous successful queries in this account:
- "late shipment" means: status = 'DELAYED' AND eta < NOW()  (used 23 times, confidence 0.91)
- "active customer" means: last_order_date > NOW() - INTERVAL '90 days'  (used 11 times, confidence 0.84)
- "at-risk account" means: churn_score > 0.7  (used 8 times, confidence 0.76)

Known corrections:
- "this week" for this team means Mon–Sun, not the rolling 7 days
```

Injected alongside schema context in the SQL planning prompt — the model inherits team-specific business language automatically.

### 3.3 Frontend: Learnings Panel

New tab in the Semantic Layer page: **"Learned"**

| Column | Content |
|---|---|
| Term | Business phrase |
| Maps to | SQL pattern (truncated, expandable) |
| Confidence | Progress bar (0–100%) |
| Source | Badge: from query / from correction / from feedback |
| Usage | "Used 23 times · Last used 2 days ago" |
| Actions | Approve (promote) · Edit · Delete |

Filter bar: domain, confidence threshold, source type, promoted status.

**In-chat transparency:** When Zevra applies a learned term to answer, a subtle badge appears: `learned term applied`. Clicking it shows which term was applied and its confidence. This builds user trust by making the system's reasoning visible.

---

## Phase 4 — Industry Context Packs (Weeks 7–10)

**Goal:** A new tenant with a hospitality database should get pre-built entities, vocabulary, and example questions without any manual configuration.

### 4.1 Pack Format

Packs are JSON files at `sei-nexus-ai/src/main/resources/industry-packs/`. Each pack defines a complete semantic layer for an industry.

**Schema:**
```json
{
  "pack_id": "healthcare-v1",
  "industry": "HEALTHCARE",
  "display_name": "Healthcare & Clinical Operations",
  "version": "1.0.0",
  "entities": [
    {
      "name": "Patient",
      "aliases": ["patient", "client", "member", "beneficiary"],
      "table_patterns": ["patients", "patient_records", "members", "beneficiaries"],
      "key_column_patterns": ["patient_id", "patient_number", "mrn", "member_id"],
      "description": "Individual receiving healthcare services",
      "operational_meaning": "Core entity for patient flow, census, and outcomes tracking"
    }
  ],
  "vocabulary": [
    {
      "term": "LOS",
      "aliases": ["length of stay", "days admitted", "days inpatient"],
      "definition": "Number of days between admission and discharge",
      "sql_hint": "DATEDIFF(discharge_date, admission_date) or DATE_PART('day', discharge_date - admission_date)"
    }
  ],
  "suggested_questions": [
    "What is the average length of stay this month?",
    "Which wards have the most patients waiting for discharge approval?"
  ],
  "kpi_definitions": [
    {
      "name": "Bed Occupancy Rate",
      "formula_description": "occupied_beds / total_beds * 100",
      "target_range": "75–90%",
      "alert_threshold": 95,
      "alert_severity": "HIGH"
    }
  ],
  "alert_templates": [
    {
      "name": "High Wait Time",
      "description": "Average patient wait time exceeds 2 hours",
      "metric_hint": "AVG(wait_time_minutes) FROM patient_encounters WHERE encounter_date = CURRENT_DATE",
      "threshold_type": "ABOVE",
      "threshold_value": 120,
      "severity": "HIGH"
    }
  ]
}
```

### 4.2 Initial Packs (5 industries)

| Pack ID | Key Entities | Key Vocabulary |
|---|---|---|
| `healthcare-v1` | Patient, Encounter, Provider, Bed, Ward, Appointment, Medication | LOS, readmission, discharge, census, ED revisit, occupancy rate |
| `hospitality-v1` | Guest, Reservation, Room, Property, Rate, Revenue, Review | RevPAR, ADR, occupancy, no-show rate, GOPPAR, pace report |
| `logistics-v1` | Shipment, Order, Carrier, Warehouse, Route, Item, Supplier | on-time delivery, dwell time, fill rate, backorder, POD, freight spend |
| `retail-v1` | Product, Customer, Transaction, Store, Category, Return, Supplier | sell-through, shrinkage, basket size, stockout, GMROI, markdown |
| `finance-v1` | Account, Transaction, Invoice, Payment, Budget, Cost Centre | AR aging, DSO, burn rate, budget variance, accruals, GL reconciliation |

### 4.3 Database Changes (V023)

```sql
CREATE TABLE nexus_industry_pack (
    pack_key        VARCHAR(255) PRIMARY KEY,
    industry        VARCHAR(100) NOT NULL,
    display_name    VARCHAR(255) NOT NULL,
    version         VARCHAR(20)  NOT NULL,
    pack_json       JSONB        NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE nexus_tenant_pack (
    id              BIGSERIAL PRIMARY KEY,
    tenant_schema   VARCHAR(100) NOT NULL,
    pack_key        VARCHAR(255) REFERENCES nexus_industry_pack(pack_key),
    status          VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE | DISABLED
    mapping_json    JSONB,
    -- Maps pack entity names to actual discovered table names:
    -- {"Patient": "tbl_patient_records", "Encounter": "visits", "Provider": "staff"}
    coverage_score  FLOAT,
    -- Percentage of pack entities that matched discovered tables (0.0–1.0)
    applied_at      TIMESTAMPTZ DEFAULT NOW(),
    applied_by      VARCHAR(255)
);
```

The V023 migration also seeds all 5 pack JSON files into `nexus_industry_pack` at startup.

### 4.4 New Backend Services

#### `IndustryPackService.java` — package `pack`

```java
List<IndustryPack> listPacks()

PackPreview previewPack(String packKey, String tenantSchema)
// Runs entity matching without committing anything.
// Returns: matched entities, vocabulary terms to be added, coverage score, alert templates.

PackApplicationResult applyPack(String packKey, String tenantSchema, String appliedBy)
// 1. Creates nexus_tenant_pack record
// 2. Calls PackEntityMapper to create nexus_business_entity records
// 3. Calls SemanticService to add vocabulary terms
// 4. Adds suggested_questions to onboarding suggestions
// 5. Creates alert rule templates from kpi_definitions
```

---

#### `PackEntityMapper.java` — package `pack`

Uses the LLM to match each pack entity's `table_patterns` against the tables discovered in the tenant's database.

**Example:**
```
Pack entity "Patient" patterns: ["patients", "patient_records", "members"]
Discovered tables: ["tbl_patients", "visit_log", "staff_roster", "insurance_claims"]

LLM matches: Patient → tbl_patients (0.94 confidence)
             Encounter → visit_log (0.71 confidence)

For matches > 0.6: create nexus_business_entity + nexus_entity_data_mapping
For matches < 0.6: flag as "manual review needed" in the preview
```

---

#### `PackRecommendationService.java` — package `pack`

Called during onboarding after table scan. Suggests which pack best fits the discovered schema.

```java
Optional<String> recommendPack(List<String> tableNames, List<String> columnSamples)
// Returns pack_key if a pack covers ≥ 40% of discovered entities, else empty.
```

### 4.5 Onboarding Integration

In `OnboardingService.java`, after entity creation completes:

```java
Optional<String> recommendedPack = packRecommendation.recommendPack(tableNames, columnSamples);
if (recommendedPack.isPresent()) {
    // Store in onboarding status response:
    // { "recommended_pack": "healthcare-v1", "pack_display_name": "Healthcare & Clinical Operations",
    //   "coverage_score": 0.78, "entities_to_add": 12, "vocab_terms_to_add": 34 }
}
```

**New onboarding wizard step: "Industry Pack"**

Shows the recommended pack with a preview of what will be added (entity count, vocab terms, example questions, alert templates). Single-click **Apply Pack** or **Skip**.

### 4.6 Frontend: Pack Management

**In Settings → Semantic Layer:**

- **"Packs"** tab showing applied packs and their coverage score
- Vocabulary terms tagged: `from pack` vs `custom` vs `learned`
- **"Browse Packs"** button to see all available packs and apply additional ones

**In Onboarding Wizard:**

- Step 4 (after connections + entities): "We detected your data looks like a **Healthcare** system. Apply the Healthcare pack?"
- Preview card showing: entities matched, vocab added, example questions unlocked
- Apply / Skip buttons

---

## Phase 5 — UI Polish & Integration (Weeks 9–12)

- Governance Hub fully built out (all four tabs)
- Semantic Learning panel in Semantic Layer page
- Reasoning trace panel in Chat (collapsible, step-by-step)
- SSE streaming for real-time reasoning steps
- Pack coverage dashboard in Settings
- API documentation updated for all new endpoints
- Full integration testing across all four features

---

## Migration Plan Summary

| Version | Contents | Phase |
|---|---|---|
| V019 | `nexus_column_policy`, `nexus_rls_policy`, `nexus_data_contract`, `attributes` column on `nexus_user_account` | 1 |
| V020 | `nexus_audit_event` with indices | 1 |
| V021 | Extend `nexus_reasoning_step` and `nexus_reasoning_session` | 2 |
| V022 | `nexus_learned_mapping`, `nexus_correction`, `nexus_common_query` | 3 |
| V023 | `nexus_industry_pack`, `nexus_tenant_pack`, seed 5 pack definitions | 4 |

---

## New Java Classes Summary

| Class | Package | Phase | Depends On |
|---|---|---|---|
| `ColumnMaskingService` | `governance` | 1 | `nexus_column_policy` |
| `RowLevelSecurityService` | `governance` | 1 | `nexus_rls_policy`, `UserAccount.attributes` |
| `DataContractService` | `governance` | 1 | `nexus_data_contract` |
| `GovernanceAuditService` | `governance` | 1 | `nexus_audit_event` |
| `GovernanceController` | `governance` | 1 | All governance services |
| `ReasoningEngine` | `reasoning` | 2 | `ReasoningRepository` (existing) |
| `ReasoningPlanner` | `reasoning` | 2 | `AzureOpenAiClient` (existing) |
| `ReasoningEvaluator` | `reasoning` | 2 | `AzureOpenAiClient` (existing) |
| `EvidenceStore` | `reasoning` | 2 | — |
| `CrossSourceMerger` | `reasoning` | 2 | — |
| `SemanticLearningService` | `semantic` | 3 | `nexus_learned_mapping` |
| `TermExtractor` | `semantic` | 3 | `AzureOpenAiClient` (existing) |
| `CorrectionDetector` | `semantic` | 3 | `AzureOpenAiClient` (existing) |
| `LearningContextBuilder` | `semantic` | 3 | `nexus_learned_mapping` |
| `IndustryPackService` | `pack` | 4 | `SemanticService` (existing) |
| `PackEntityMapper` | `pack` | 4 | `AzureOpenAiClient` (existing) |
| `PackRecommendationService` | `pack` | 4 | `AzureOpenAiClient` (existing) |

---

## Recommended Build Order

```
Phase 1: Governance  ──────────────────────────────────────────► Ship (Week 4)
             │
             ▼
Phase 2: Reasoning Engine  ──────────────────────────────────► Ship (Week 6)
             │
             ▼
Phase 3: Semantic Learning  (requires governance audit events) ► Ship (Week 8)
             │
             ▼
Phase 4: Industry Packs  (requires stable semantic layer)  ───► Ship (Week 10)
             │
             ▼
Phase 5: UI Polish + SSE Streaming  ─────────────────────────► Ship (Week 12)
```

**Parallelisation opportunity:** Phase 2 (Reasoning) can start in Week 3 alongside Phase 1 if two engineers are available. It has no dependency on governance.

**Do not skip Phase 1.** Governance is the enterprise sales unlocker. Every other feature makes Zevra smarter; governance makes it sellable.

---

*Last updated: 2026-05-20*
