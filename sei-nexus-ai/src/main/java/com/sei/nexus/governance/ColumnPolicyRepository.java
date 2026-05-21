package com.sei.nexus.governance;

import com.sei.nexus.common.Keys;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public class ColumnPolicyRepository {

    private final JdbcTemplate jdbc;

    public ColumnPolicyRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ColumnPolicy save(ColumnPolicy p) {
        String key = p.policyKey() != null ? p.policyKey() : Keys.uniqueKey("cpol");
        jdbc.update("""
                INSERT INTO nexus_column_policy
                    (policy_key, object_key, column_name, mask_type,
                     constant_value, partial_chars, exempt_roles,
                     created_by, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,NOW(),NOW())
                ON CONFLICT (policy_key) DO UPDATE SET
                    object_key      = EXCLUDED.object_key,
                    column_name     = EXCLUDED.column_name,
                    mask_type       = EXCLUDED.mask_type,
                    constant_value  = EXCLUDED.constant_value,
                    partial_chars   = EXCLUDED.partial_chars,
                    exempt_roles    = EXCLUDED.exempt_roles,
                    updated_at      = NOW()
                """,
                key, p.objectKey(), p.columnName(), p.maskType(),
                p.constantValue(), p.partialChars(),
                toSqlArray(p.exemptRoles()),
                p.createdBy());
        return findByKey(key).orElseThrow();
    }

    public Optional<ColumnPolicy> findByKey(String policyKey) {
        List<ColumnPolicy> rows = jdbc.query(
                "SELECT * FROM nexus_column_policy WHERE policy_key = ?", mapper(), policyKey);
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    public List<ColumnPolicy> findAll() {
        return jdbc.query(
                "SELECT * FROM nexus_column_policy ORDER BY object_key, column_name",
                mapper());
    }

    /** Returns all active policies for the given object keys — called by ColumnMaskingService. */
    public List<ColumnPolicy> findByObjectKeys(List<String> objectKeys) {
        if (objectKeys == null || objectKeys.isEmpty()) return List.of();
        String placeholders = "?".repeat(objectKeys.size())
                .chars().mapToObj(c -> "?")
                .collect(java.util.stream.Collectors.joining(","));
        return jdbc.query(
                "SELECT * FROM nexus_column_policy WHERE object_key IN (" + placeholders + ")",
                mapper(), objectKeys.toArray());
    }

    public void delete(String policyKey) {
        jdbc.update("DELETE FROM nexus_column_policy WHERE policy_key = ?", policyKey);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private RowMapper<ColumnPolicy> mapper() {
        return (rs, i) -> {
            Array exemptArr = rs.getArray("exempt_roles");
            String[] exemptRoles = exemptArr != null ? (String[]) exemptArr.getArray() : new String[0];
            return new ColumnPolicy(
                    rs.getString("policy_key"),
                    rs.getString("object_key"),
                    rs.getString("column_name"),
                    rs.getString("mask_type"),
                    rs.getString("constant_value"),
                    rs.getInt("partial_chars"),
                    exemptRoles,
                    rs.getString("created_by"),
                    toInstant(rs.getTimestamp("created_at")),
                    toInstant(rs.getTimestamp("updated_at")));
        };
    }

    private Array toSqlArray(String[] values) {
        try {
            return jdbc.getDataSource().getConnection()
                    .createArrayOf("text", values != null ? values : new String[0]);
        } catch (Exception e) {
            throw new RuntimeException("Failed to create SQL array", e);
        }
    }

    private Instant toInstant(Timestamp ts) {
        return ts != null ? ts.toInstant() : Instant.now();
    }
}
