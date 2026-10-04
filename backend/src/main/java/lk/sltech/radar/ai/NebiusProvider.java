package lk.sltech.radar.ai;

import lk.sltech.radar.config.AppProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Primary provider: Nebius Token Factory (OpenAI-compatible). Env: NEBIUS_API_KEY. */
@Component("nebius")
public class NebiusProvider extends OpenAiCompatibleProvider {

    public NebiusProvider(AppProperties props,
                          @Value("${NEBIUS_API_KEY:}") String apiKey) {
        super(baseUrl(props), apiKey, model(props), timeout(props));
    }

    private static String baseUrl(AppProperties props) {
        var p = props.getProviders().get("nebius");
        return (p != null && p.getBaseUrl() != null && !p.getBaseUrl().isBlank())
                ? p.getBaseUrl() : "https://api.tokenfactory.nebius.com/v1";
    }

    private static String model(AppProperties props) {
        var p = props.getProviders().get("nebius");
        return (p != null && p.getModel() != null && !p.getModel().isBlank())
                ? p.getModel() : "meta-llama/Llama-3.3-70B-Instruct";
    }

    private static int timeout(AppProperties props) {
        var p = props.getProviders().get("nebius");
        return p != null ? p.getTimeoutMs() : 60_000;
    }

    @Override
    public String name() { return "nebius"; }
}
