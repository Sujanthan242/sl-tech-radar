package lk.sltech.radar.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * The dedup ledger — extends the seen_events.json schema from the research brief.
 * Every opportunity ever surfaced lives here with its lifecycle status.
 * Table: ledger_events
 */
@Entity
@Table(name = "ledger_events", indexes = {
        @Index(name = "idx_ledger_url", columnList = "url"),
        @Index(name = "idx_ledger_status", columnList = "status")
})
public class LedgerEvent {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, length = 512)
    private String name;

    @Column(length = 1024)
    private String url;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private Kind kind;

    @Column(name = "registration_deadline")
    private LocalDate registrationDeadline;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Enums.LedgerStatus status = Enums.LedgerStatus.candidate;

    /** ISO week label of the edition that surfaced it, e.g. "2026-W41". */
    @Column(length = 16)
    private String edition;

    @Column(name = "source_query", length = 512)
    private String sourceQuery;

    @Enumerated(EnumType.STRING)
    @Column(name = "deadline_confidence", length = 16)
    private Enums.DeadlineConfidence deadlineConfidence;

    @Column(name = "rejection_reason", length = 1024)
    private String rejectionReason;

    @Column(name = "first_seen", nullable = false)
    private Instant firstSeen;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected LedgerEvent() {}

    public LedgerEvent(String name, String url, Kind kind, LocalDate registrationDeadline,
                       String notes, Enums.LedgerStatus status, String edition,
                       String sourceQuery, Enums.DeadlineConfidence deadlineConfidence) {
        this.id = UUID.randomUUID().toString();
        this.name = name;
        this.url = url;
        this.kind = kind;
        this.registrationDeadline = registrationDeadline;
        this.notes = notes;
        this.status = status == null ? Enums.LedgerStatus.candidate : status;
        this.edition = edition;
        this.sourceQuery = sourceQuery;
        this.deadlineConfidence = deadlineConfidence;
        this.firstSeen = Instant.now();
        this.createdAt = this.firstSeen;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getUrl() { return url; }
    public Kind getKind() { return kind; }
    public LocalDate getRegistrationDeadline() { return registrationDeadline; }
    public String getNotes() { return notes; }
    public Enums.LedgerStatus getStatus() { return status; }
    public void setStatus(Enums.LedgerStatus s) { this.status = s; }
    public String getEdition() { return edition; }
    public String getSourceQuery() { return sourceQuery; }
    public Enums.DeadlineConfidence getDeadlineConfidence() { return deadlineConfidence; }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String r) { this.rejectionReason = r; }
    public Instant getFirstSeen() { return firstSeen; }
}
