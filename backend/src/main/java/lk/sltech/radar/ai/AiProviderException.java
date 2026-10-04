package lk.sltech.radar.ai;

/** Thrown when a single provider fails; the fallback chain catches this and tries the next provider. */
public class AiProviderException extends RuntimeException {
    public AiProviderException(String message) { super(message); }
    public AiProviderException(String message, Throwable cause) { super(message, cause); }
}
