package lk.sltech.radar.ai;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import lk.sltech.radar.config.AppProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Fallback 3: local Ollama. Env: OLLAMA_BASE_URL (default http://localhost:11434).
 * No key needed — available iff the daemon answers /api/tags. This is the
 * graceful-degradation floor: the app works fully offline with a local model.
 */
@Component("ollama")
public class OllamaProvider implements AiProvider {

    private final ObjectMapper mapper = new ObjectMapper();
    private final String baseUrl;
    private final String model;
    private final int timeoutMs;

    public OllamaProvider(AppProperties props,
                          @Value("${OLLAMA_BASE_URL:http://localhost:11434}") String baseUrl) {
        var p = props.getProviders().get("ollama");
        this.baseUrl = (baseUrl == null || baseUrl.isBlank()) ? "http://localhost:11434" : baseUrl;
        this.model = (p != null && p.getModel() != null && !p.getModel().isBlank())
                ? p.getModel() : "llama3.1:8b";
        this.timeoutMs = p != null ? p.getTimeoutMs() : 120_000;
    }

    @Override public String name() { return "ollama"; }
    @Override public String modelName() { return model; }

    @Override
    public boolean isAvailable() {
        try {
            SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
            rf.setConnectTimeout(Duration.ofMillis(2_000));
            rf.setReadTimeout(Duration.ofMillis(3_000));
            String body = RestClient.builder().baseUrl(baseUrl).requestFactory(rf).build()
                    .get().uri("/api/tags").retrieve().body(String.class);
            return body != null && body.contains("\"name\"");
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public ChatResult chat(String systemPrompt, String userPrompt) throws AiProviderException {
        if (!isAvailable()) throw new AiProviderException("ollama: daemon not reachable at " + baseUrl);
        long t0 = System.currentTimeMillis();
        try {
            SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
            rf.setConnectTimeout(Duration.ofMillis(10_000));
            rf.setReadTimeout(Duration.ofMillis(timeoutMs));
            RestClient client = RestClient.builder().baseUrl(baseUrl).requestFactory(rf).build();

            ObjectNode body = mapper.createObjectNode();
            body.put("model", model);
            body.put("stream", false);
            body.put("format", "json");
            ArrayNode messages = body.putArray("messages");
            messages.add(msg("system", systemPrompt));
            messages.add(msg("user", userPrompt));

            String raw = client.post().uri("/api/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString())
                    .retrieve().body(String.class);

            JsonNode root = mapper.readTree(raw);
            String text = root.path("message").path("content").asText("");
            long in = root.path("prompt_eval_count").asLong((systemPrompt.length() + userPrompt.length()) / 4);
            long out = root.path("eval_count").asLong(text.length() / 4);
            return new ChatResult(name(), model, text, in, out, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            throw new AiProviderException("ollama chat failed: " + e.getMessage(), e);
        }
    }

    private ObjectNode msg(String role, String content) {
        ObjectNode m = mapper.createObjectNode();
        m.put("role", role);
        m.put("content", content);
        return m;
    }
}
