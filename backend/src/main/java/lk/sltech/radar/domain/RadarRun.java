package lk.sltech.radar.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Tracks one async Saturday pipeline execution.
 * (Supporting table for the /api/radar/runs endpoints — the brief's data model
 * covered editions/candidates/drafts; runs need their own lifecycle row for
 * progress polling while the pipeline executes.)
 * Table: radar_runs
 */
@Entity
@Table(name = "radar_runs")
public class RadarRun {

    @Id
    @Column(length = 36)
    private String id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "edition_id", nullable = false)
    private Edition edition;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Enums.RunStatus status = Enums.RunStatus.queued;

    /** 0-100. */
    @Column(nullable = false)
    private int progress;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    /** JSON: {"candidatesFound":N,"netNew":N,"draftsReady":N}. */
    @Column(name = "stats_json", columnDefinition = "TEXT")
    private String statsJson = "{}";

    @Column(name = "error", length = 2048)
    private String error;

    protected RadarRun() {}

    public RadarRun(Edition edition) {
        this.id = UUID.randomUUID().toString();
        this.edition = edition;
        this.status = Enums.RunStatus.queued;
        this.progress = 0;
        this.startedAt = Instant.now();
    }

    public String getId() { return id; }
    public Edition getEdition() { return edition; }
    public Enums.RunStatus getStatus() { return status; }
    public void setStatus(Enums.RunStatus s) { this.status = s; }
    public int getProgress() { return progress; }
    public void setProgress(int p) { this.progress = Math.max(0, Math.min(100, p)); }
    public Instant getStartedAt() { return startedAt; }
    public Instant getFinishedAt() { return finishedAt; }
    public void setFinishedAt(Instant t) { this.finishedAt = t; }
    public String getStatsJson() { return statsJson; }
    public void setStatsJson(String s) { this.statsJson = s; }
    public String getError() { return error; }
    public void setError(String e) { this.error = e; }
}
