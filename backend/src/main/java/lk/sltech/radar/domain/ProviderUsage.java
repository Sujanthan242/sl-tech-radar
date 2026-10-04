package lk.sltech.radar.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/** Per-call AI usage row for the monthly cost dashboard. Table: provider_usage */
@Entity
@Table(name = "provider_usage", indexes = {
        @Index(name = "idx_usage_created", columnList = "created_at")
})
public class ProviderUsage {

    @Id
    @Column(length = 36)
    private String id;

    /** Provider name: nebius | groq | gemini | ollama | template | tavily. */
    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "tokens_in")
    private long tokensIn;

    @Column(name = "tokens_out")
    private long tokensOut;

    @Column(name = "cost_usd")
    private double costUsd;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    protected ProviderUsage() {}

    public ProviderUsage(String provider, long tokensIn, long tokensOut, double costUsd) {
        this.id = UUID.randomUUID().toString();
        this.provider = provider;
        this.tokensIn = tokensIn;
        this.tokensOut = tokensOut;
        this.costUsd = costUsd;
        this.createdAt = Instant.now();
    }

    public String getId() { return id; }
    public String getProvider() { return provider; }
    public long getTokensIn() { return tokensIn; }
    public long getTokensOut() { return tokensOut; }
    public double getCostUsd() { return costUsd; }
    public Instant getCreatedAt() { return createdAt; }
}
