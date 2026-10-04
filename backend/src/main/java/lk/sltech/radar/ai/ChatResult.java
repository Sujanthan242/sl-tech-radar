package lk.sltech.radar.ai;

/** Result of one chat completion. */
public record ChatResult(
        String providerName,
        String model,
        String content,
        long promptTokens,
        long completionTokens,
        long latencyMs
) {
    public long totalTokens() { return promptTokens + completionTokens; }
}
