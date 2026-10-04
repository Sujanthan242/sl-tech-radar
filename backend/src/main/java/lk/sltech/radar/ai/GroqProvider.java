package lk.sltech.radar.ai;

import lk.sltech.radar.config.AppProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Fallback 1: Groq free tier (OpenAI-compatible). Env: GROQ_API_KEY. */
@Component("groq")
public class GroqProvider extends OpenAiCompatibleProvider {

    public GroqProvider(AppProperties props,
                        @Value("${GROQ_API_KEY:}") String apiKey) {
        super(
            baseUrl(props),
            apiKey,
            model(props),
            timeout(props));
    }

    private static String baseUrl(AppProperties props) {
        var p = props.getProviders().get("groq");
        return (p != null && p.getBaseUrl() != null && !p.getBaseUrl().isBlank())
                ? p.getBaseUrl() : "https://api.groq.com/openai/v1";
    }

    private static String model(AppProperties props) {
        var p = props.getProviders().get("groq");
        return (p != null && p.getModel() != null && !p.getModel().isBlank())
                ? p.getModel() : "llama-3.3-70b-versatile";
    }

    private static int timeout(AppProperties props) {
        var p = props.getProviders().get("groq");
        return p != null ? p.getTimeoutMs() : 60_000;
    }

    @Override
    public String name() { return "groq"; }
}
