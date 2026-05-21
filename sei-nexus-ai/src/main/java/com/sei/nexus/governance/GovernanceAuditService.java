package com.sei.nexus.governance;

import com.sei.nexus.common.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Writes compliance audit events asynchronously after every query execution.
 *
 * <p>Using {@code @Async} ensures governance logging never adds latency to the
 * user-facing response. Events are fire-and-forget; a failure here is logged
 * but does not propagate to the caller.
 */
@Service
public class GovernanceAuditService {

    private static final Logger log = LoggerFactory.getLogger(GovernanceAuditService.class);

    private final AuditEventRepository auditEventRepository;

    public GovernanceAuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    /**
     * Persist an audit event derived from the supplied {@link AuditContext}.
     * Called fire-and-forget via {@code @Async} — exceptions are swallowed to
     * prevent audit failures from surfacing to users.
     */
    @Async
    public void record(AuditContext ctx, boolean blocked) {
        try {
            String eventType = ctx.deriveEventType(blocked);
            AuditEvent event = ctx.toEvent(eventType);

            // Assign key here (not in the builder) so the repository never sees null
            AuditEvent withKey = new AuditEvent(
                    Keys.uniqueKey("audit"),
                    event.eventType(),
                    event.userEmail(), event.userRole(),
                    event.runKey(), event.connectionKey(),
                    event.objectKeys(),
                    event.columnsAccessed(), event.columnsMasked(),
                    event.rlsPoliciesApplied(),
                    event.contractsChecked(), event.contractsViolated(),
                    event.originalSql(), event.executedSql(),
                    event.rowCountReturned(), event.rowsFilteredByRls(),
                    event.executionMs(), event.ipAddress(),
                    java.time.Instant.now());

            auditEventRepository.save(withKey);
        } catch (Exception e) {
            // Audit failure must never surface to the user
            log.error("Failed to write audit event for run '{}': {}",
                    ctx != null ? "unknown" : "unknown", e.getMessage(), e);
        }
    }
}
