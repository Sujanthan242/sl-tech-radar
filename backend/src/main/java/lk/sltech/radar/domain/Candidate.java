package lk.sltech.radar.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** A discovered opportunity. Table: candidates (UNIQUE url). */
@Entity
@Table(name = "candidates", indexes = {
        @Index(name = "idx_candidates_edition", columnList = "edition_id"),
        @Index(name = "idx_candidates_kind", columnList = "kind")
})
public class Candidate {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edition_id")
    private Edition edition;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, unique = true, length = 1024)
    private String url;

    @Column(name = "deadline")
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "deadline_confidence", length = 16)
    private Enums.DeadlineConfidence deadlineConfidence;

    @Enumerated(EnumType.STRING)
    @Column(length = 32)
    private Kind kind;

    @Column(columnDefinition = "TEXT")
    private String snippet;

    @Column(name = "source_query", length = 512)
    private String sourceQuery;

    @Enumerated(EnumType.STRING)
    @Column(name = "dedup_status", nullable = false, length = 16)
    private Enums.DedupStatus dedupStatus = Enums.DedupStatus.NEW;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Candidate() {}

    public Candidate(Edition edition, String title, String url, LocalDate deadline,
                     Enums.DeadlineConfidence deadlineConfidence, Kind kind,
                     String snippet, String sourceQuery, Enums.DedupStatus dedupStatus) {
        this.id = UUID.randomUUID().toString();
        this.edition = edition;
        this.title = title;
        this.url = url;
        this.deadline = deadline;
        this.deadlineConfidence = deadlineConfidence;
        this.kind = kind;
        this.snippet = snippet;
        this.sourceQuery = sourceQuery;
        this.dedupStatus = dedupStatus == null ? Enums.DedupStatus.NEW : dedupStatus;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public Edition getEdition() { return edition; }
    public String getTitle() { return title; }
    public String getUrl() { return url; }
    public LocalDate getDeadline() { return deadline; }
    public Enums.DeadlineConfidence getDeadlineConfidence() { return deadlineConfidence; }
    public Kind getKind() { return kind; }
    public String getSnippet() { return snippet; }
    public String getSourceQuery() { return sourceQuery; }
    public Enums.DedupStatus getDedupStatus() { return dedupStatus; }
    public void setDedupStatus(Enums.DedupStatus s) { this.dedupStatus = s; }
    public Instant getCreatedAt() { return createdAt; }
}
