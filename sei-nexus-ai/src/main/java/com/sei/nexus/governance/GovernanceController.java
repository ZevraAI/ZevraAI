package com.sei.nexus.governance;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sei.nexus.auth.UserAccount;
import com.sei.nexus.common.NexusException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

/**
 * REST API for the Governance Hub.
 *
 * <pre>
 * Column masking policies   GET/POST /governance/column-policies
 *                           DELETE   /governance/column-policies/{policyKey}
 *
 * Row-level security        GET/POST /governance/rls-policies
 *                           PATCH    /governance/rls-policies/{policyKey}/status
 *                           DELETE   /governance/rls-policies/{policyKey}
 *
 * Data contracts            GET/POST /governance/contracts
 *                           DELETE   /governance/contracts/{contractKey}
 *
 * User attributes           GET/PUT  /governance/users/{email}/attributes
 *
 * Audit log                 GET      /governance/audit
 *                           GET      /governance/audit/export (CSV)
 *
 * Policy simulator          POST     /governance/simulate
 * </pre>
 */
@RestController
@RequestMapping("/governance")
public class GovernanceController {

    private final ColumnPolicyRepository   columnPolicyRepo;
    private final RlsPolicyRepository      rlsPolicyRepo;
    private final DataContractRepository   contractRepo;
    private final AuditEventRepository     auditRepo;
    private final UserAttributesRepository userAttrRepo;
    private final ColumnMaskingService     maskingService;
    private final RowLevelSecurityService  rlsService;
    private final DataContractService      contractService;
    private final ObjectMapper             objectMapper;

    public GovernanceController(ColumnPolicyRepository columnPolicyRepo,
                                RlsPolicyRepository rlsPolicyRepo,
                                DataContractRepository contractRepo,
                                AuditEventRepository auditRepo,
                                UserAttributesRepository userAttrRepo,
                                ColumnMaskingService maskingService,
                                RowLevelSecurityService rlsService,
                                DataContractService contractService,
                                ObjectMapper objectMapper) {
        this.columnPolicyRepo = columnPolicyRepo;
        this.rlsPolicyRepo    = rlsPolicyRepo;
        this.contractRepo     = contractRepo;
        this.auditRepo        = auditRepo;
        this.userAttrRepo     = userAttrRepo;
        this.maskingService   = maskingService;
        this.rlsService       = rlsService;
        this.contractService  = contractService;
        this.objectMapper     = objectMapper;
    }

    // ── Column Policies ───────────────────────────────────────────────────────

    @GetMapping("/column-policies")
    public ResponseEntity<List<ColumnPolicy>> listColumnPolicies() {
        return ResponseEntity.ok(columnPolicyRepo.findAll());
    }

    @PostMapping("/column-policies")
    public ResponseEntity<ColumnPolicy> createColumnPolicy(@RequestBody Map<String, Object> body) {
        String userEmail = currentUserEmail();
        ColumnPolicy policy = new ColumnPolicy(
                null,
                required(body, "objectKey"),
                required(body, "columnName"),
                strOr(body, "maskType", "EXCLUDE"),
                (String) body.get("constantValue"),
                intOr(body, "partialChars", 3),
                toStringArray(body.get("exemptRoles")),
                userEmail,
                Instant.now(), Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(columnPolicyRepo.save(policy));
    }

    @DeleteMapping("/column-policies/{policyKey}")
    public ResponseEntity<Void> deleteColumnPolicy(@PathVariable String policyKey) {
        columnPolicyRepo.delete(policyKey);
        return ResponseEntity.noContent().build();
    }

    // ── Row-Level Security Policies ───────────────────────────────────────────

    @GetMapping("/rls-policies")
    public ResponseEntity<List<RlsPolicy>> listRlsPolicies() {
        return ResponseEntity.ok(rlsPolicyRepo.findAll());
    }

    @PostMapping("/rls-policies")
    public ResponseEntity<RlsPolicy> createRlsPolicy(@RequestBody Map<String, Object> body) {
        String userEmail = currentUserEmail();
        RlsPolicy policy = new RlsPolicy(
                null,
                required(body, "policyName"),
                required(body, "objectKey"),
                required(body, "filterTemplate"),
                toStringArray(body.get("appliesToRoles")),
                boolOr(body, "isActive", true),
                userEmail,
                Instant.now(), Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(rlsPolicyRepo.save(policy));
    }

    @PatchMapping("/rls-policies/{policyKey}/status")
    public ResponseEntity<Void> setRlsPolicyStatus(@PathVariable String policyKey,
                                                    @RequestBody Map<String, Object> body) {
        boolean active = boolOr(body, "isActive", true);
        rlsPolicyRepo.setActive(policyKey, active);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/rls-policies/{policyKey}")
    public ResponseEntity<Void> deleteRlsPolicy(@PathVariable String policyKey) {
        rlsPolicyRepo.delete(policyKey);
        return ResponseEntity.noContent().build();
    }

    // ── Data Contracts ────────────────────────────────────────────────────────

    @GetMapping("/contracts")
    public ResponseEntity<List<DataContract>> listContracts() {
        return ResponseEntity.ok(contractRepo.findAll());
    }

    @PostMapping("/contracts")
    public ResponseEntity<DataContract> createContract(@RequestBody Map<String, Object> body) {
        String userEmail = currentUserEmail();
        Object configRaw = body.getOrDefault("ruleConfig", Map.of());
        JsonNode config = objectMapper.valueToTree(configRaw);

        DataContract contract = new DataContract(
                null,
                required(body, "contractName"),
                required(body, "objectKey"),
                required(body, "ruleType"),
                config,
                strOr(body, "enforcement", "BLOCK"),
                boolOr(body, "isActive", true),
                userEmail,
                Instant.now(), Instant.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(contractRepo.save(contract));
    }

    @DeleteMapping("/contracts/{contractKey}")
    public ResponseEntity<Void> deleteContract(@PathVariable String contractKey) {
        contractRepo.delete(contractKey);
        return ResponseEntity.noContent().build();
    }

    // ── User Attributes ───────────────────────────────────────────────────────

    @GetMapping("/users/{email}/attributes")
    public ResponseEntity<Map<String, String>> getUserAttributes(@PathVariable String email) {
        return ResponseEntity.ok(userAttrRepo.getAttributes(email));
    }

    @PutMapping("/users/{email}/attributes")
    public ResponseEntity<Void> setUserAttributes(@PathVariable String email,
                                                   @RequestBody Map<String, String> attributes) {
        userAttrRepo.setAttributes(email, attributes);
        return ResponseEntity.noContent().build();
    }

    // ── Audit Log ─────────────────────────────────────────────────────────────

    @GetMapping("/audit")
    public ResponseEntity<Map<String, Object>> getAuditLog(
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String connectionKey,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {

        Instant fromInstant = from != null ? from.atStartOfDay().toInstant(ZoneOffset.UTC) : null;
        Instant toInstant   = to   != null ? to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC) : null;

        List<AuditEvent> events = auditRepo.findFiltered(
                userEmail, eventType, connectionKey, fromInstant, toInstant, page, size);
        long total = auditRepo.countFiltered(
                userEmail, eventType, connectionKey, fromInstant, toInstant);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("events", events);
        response.put("total", total);
        response.put("page",  page);
        response.put("size",  size);
        return ResponseEntity.ok(response);
    }

    /** Returns the audit log as a CSV download. */
    @GetMapping("/audit/export")
    public ResponseEntity<String> exportAuditLog(
            @RequestParam(required = false) String userEmail,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        Instant fromInstant = from != null ? from.atStartOfDay().toInstant(ZoneOffset.UTC) : null;
        Instant toInstant   = to   != null ? to.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC) : null;

        List<AuditEvent> events = auditRepo.findFiltered(
                userEmail, eventType, null, fromInstant, toInstant, 0, 10000);

        StringBuilder csv = new StringBuilder();
        csv.append("event_key,event_type,user_email,user_role,run_key,connection_key,")
           .append("original_sql,executed_sql,row_count,execution_ms,created_at\n");
        for (AuditEvent e : events) {
            csv.append(csvEscape(e.eventKey())).append(',')
               .append(csvEscape(e.eventType())).append(',')
               .append(csvEscape(e.userEmail())).append(',')
               .append(csvEscape(e.userRole())).append(',')
               .append(csvEscape(e.runKey())).append(',')
               .append(csvEscape(e.connectionKey())).append(',')
               .append(csvEscape(e.originalSql())).append(',')
               .append(csvEscape(e.executedSql())).append(',')
               .append(e.rowCountReturned() != null ? e.rowCountReturned() : "").append(',')
               .append(e.executionMs() != null ? e.executionMs() : "").append(',')
               .append(e.createdAt() != null ? e.createdAt().toString() : "").append('\n');
        }

        return ResponseEntity.ok()
                .header("Content-Type", "text/csv; charset=UTF-8")
                .header("Content-Disposition", "attachment; filename=\"zevra-audit-log.csv\"")
                .body(csv.toString());
    }

    // ── Policy Simulator ──────────────────────────────────────────────────────

    /**
     * Shows exactly what SQL would execute for a given user, after all governance
     * policies are applied. Lets admins verify policies before rolling them out.
     *
     * <p>Request body:
     * <pre>
     * {
     *   "userEmail":  "alice@company.com",
     *   "objectKeys": ["obj-orders", "obj-customers"],
     *   "sampleSql":  "SELECT id, email, ssn, region FROM orders WHERE status = 'OPEN'"
     * }
     * </pre>
     */
    @PostMapping("/simulate")
    public ResponseEntity<Map<String, Object>> simulate(@RequestBody Map<String, Object> body) {
        String       userEmail  = required(body, "userEmail");
        String       sampleSql  = required(body, "sampleSql");
        List<String> objectKeys = toStringList(body.get("objectKeys"));

        ContractResult contract = contractService.evaluate(sampleSql, objectKeys);
        String         sqlAfterContract = contract.effectiveSql(sampleSql);

        RlsResult      rls      = rlsService.apply(sqlAfterContract, userEmail, objectKeys);
        MaskResult     mask     = maskingService.apply(rls.sql(), userEmail, objectKeys);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("originalSql",           sampleSql);
        result.put("effectiveSql",           mask.sql());
        result.put("contractStatus",         contract.status().name());
        result.put("contractsChecked",       contract.contractsChecked());
        result.put("contractsViolated",      contract.contractsViolated());
        result.put("contractMessages",       contract.violationMessages());
        result.put("rlsPoliciesApplied",     rls.policiesApplied());
        result.put("rlsConditionsInjected",  rls.injectedConditions());
        result.put("columnsMasked",          mask.maskedColumns());
        result.put("sqlWasModified",
                contract.status() != ContractResult.ContractStatus.PASSED
                || rls.wasModified() || mask.wasModified());
        return ResponseEntity.ok(result);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String currentUserEmail() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserAccount u) return u.email();
        throw new NexusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
    }

    private String required(Map<String, Object> body, String key) {
        Object val = body.get(key);
        if (val == null || val.toString().isBlank()) {
            throw new NexusException(HttpStatus.BAD_REQUEST, "'" + key + "' is required");
        }
        return val.toString().trim();
    }

    private String strOr(Map<String, Object> body, String key, String defaultVal) {
        Object val = body.get(key);
        return (val != null && !val.toString().isBlank()) ? val.toString().trim() : defaultVal;
    }

    private int intOr(Map<String, Object> body, String key, int defaultVal) {
        Object val = body.get(key);
        if (val == null) return defaultVal;
        try { return Integer.parseInt(val.toString()); }
        catch (NumberFormatException e) { return defaultVal; }
    }

    private boolean boolOr(Map<String, Object> body, String key, boolean defaultVal) {
        Object val = body.get(key);
        if (val == null) return defaultVal;
        return Boolean.parseBoolean(val.toString());
    }

    private String[] toStringArray(Object val) {
        if (val == null) return new String[0];
        if (val instanceof List<?> list) {
            return list.stream().map(Object::toString).toArray(String[]::new);
        }
        return new String[0];
    }

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object val) {
        if (val instanceof List) return ((List<Object>) val).stream().map(Object::toString).toList();
        return List.of();
    }

    private String csvEscape(String value) {
        if (value == null) return "";
        String escaped = value.replace("\"", "\"\"").replace("\n", " ").replace("\r", "");
        return escaped.contains(",") || escaped.contains("\"") ? "\"" + escaped + "\"" : escaped;
    }
}
