package lk.sltech.radar.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Weekly newsletter edition. Table: editions */
@Entity
@Table(name = "editions")
public class Edition {

    @Id
    @Column(length = 36)
    private String id;

    /** ISO week label, e.g. "2026-W41". */
    @Column(nullable = false, unique = true, length = 16)
    private String week;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Enums.EditionStatus status = Enums.EditionStatus.draft;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected Edition() {}

    public Edition(String week) {
        this.id = UUID.randomUUID().toString();
        this.week = week;
        this.status = Enums.EditionStatus.draft;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public String getWeek() { return week; }
    public Enums.EditionStatus getStatus() { return status; }
    public void setStatus(Enums.EditionStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
}
