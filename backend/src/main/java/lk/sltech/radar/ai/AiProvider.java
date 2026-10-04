package lk.sltech.radar.ai;

/** One attempt at a chat completion by a single provider. */
public interface AiProvider {

    /** Stable name used in `app.providers.order`: nebius | groq | gemini | ollama | template. */
    String name();

    /** Model identifier served (or "template" for template mode). */
    String modelName();

    /**
     * True when this provider can serve right now. A bean whose API key is
     * missing reports false here — the chain falls through without failing.
     */
    boolean isAvailable();

    /** Sends the prompts; throws AiProviderException on any failure (the chain then tries the next provider). */
    ChatResult chat(String systemPrompt, String userPrompt) throws AiProviderException;

    /** Quick latency probe for the status dashboard; -1 when unavailable. */
    default long pingMs() {
        if (!isAvailable()) return -1;
        long t0 = System.currentTimeMillis();
        try {
            chat("You are a health check. Reply with exactly: ok",
                 "Reply with exactly: ok");
            return System.currentTimeMillis() - t0;
        } catch (Exception e) {
            return -1;
        }
    }
}
