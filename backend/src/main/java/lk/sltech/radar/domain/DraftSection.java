package lk.sltech.radar.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** One drafted newsletter section per category. Table: draft_sections */
@Entity
@Table(name = "draft_sections", indexes = {
        @Index(name = "idx_drafts_edition", columnList = "edition_id"),
        @Index(name = "idx_drafts_cache_key", columnList = "cache_key")
})
public class DraftSection {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edition_id", nullable = false)
    private Edition edition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private Category category;

    @Column(name = "content_md", columnDefinition = "TEXT")
    private String contentMd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Enums.DraftStatus status = Enums.DraftStatus.draft;

    @Column(name = "rejection_reason", length = 1024)
    private String rejectionReason;

    @Column(name = "tokens_used")
    private long tokensUsed;

    @Column(name = "model_used", length = 128)
    private String modelUsed;

    /** JSON array of {title,url} citations, stored as text for H2/Postgres portability. */
    @Column(name = "sources_json", columnDefinition = "TEXT")
    private String sourcesJson = "[]";

    /**
     * Content-address key: SHA256(category + edition week + sorted source-URL set).
     * Enables the "never regenerate identical inputs" cache (Caffeine + DB).
     */
    @Column(name = "cache_key", length = 64)
    private String cacheKey;

    /** LangSmith run id of the draft_section span (for binary feedback binding). */
    @Column(name = "trace_run_id", length = 64)
    private String traceRunId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected DraftSection() {}

    public DraftSection(Edition edition, Category category, String contentMd, String modelUsed,
                        long tokensUsed, String sourcesJson, String cacheKey) {
        this.id = UUID.randomUUID().toString();
        this.edition = edition;
        this.category = category;
        this.contentMd = contentMd;
        this.status = Enums.DraftStatus.draft;
        this.modelUsed = modelUsed;
        this.tokensUsed = tokensUsed;
        this.sourcesJson = sourcesJson == null ? "[]" : sourcesJson;
        this.cacheKey = cacheKey;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public String getId() { return id; }
    public Edition getEdition() { return edition; }
    public Category getCategory() { return category; }
    public String getContentMd() { return contentMd; }
    public void setContentMd(String c) { this.contentMd = c; this.updatedAt = Instant.now(); }
    public Enums.DraftStatus getStatus() { return status; }
    public void setStatus(Enums.DraftStatus s) { this.status = s; this.updatedAt = Instant.now(); }
    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String r) { this.rejectionReason = r; this.updatedAt = Instant.now(); }
    public long getTokensUsed() { return tokensUsed; }
    public void setTokensUsed(long t) { this.tokensUsed = t; }
    public String getModelUsed() { return modelUsed; }
    public String getSourcesJson() { return sourcesJson; }
    public String getCacheKey() { return cacheKey; }
    public String getTraceRunId() { return traceRunId; }
    public void setTraceRunId(String traceRunId) { this.traceRunId = traceRunId; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
