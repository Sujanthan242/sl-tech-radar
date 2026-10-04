package lk.sltech.radar.ai;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Shared logic for OpenAI-compatible chat-completions endpoints (Nebius Token Factory, Groq).
 * Nebius TF exposes an OpenAI-compatible API at https://api.tokenfactory.nebius.com/v1/
 * (https://docs.tokenfactory.nebius.com/), so the same wire shape works for both.
 */
public abstract class OpenAiCompatibleProvider implements AiProvider {

    protected final ObjectMapper mapper = new ObjectMapper();
    protected final String baseUrl;
    protected final String apiKey;
    protected final String model;
    protected final int timeoutMs;

    protected OpenAiCompatibleProvider(String baseUrl, String apiKey, String model, int timeoutMs) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.timeoutMs = timeoutMs;
    }

    @Override
    public String modelName() { return model; }

    /** Available iff an API key is configured. Missing key -> bean reports unavailable, chain falls through. */
    @Override
    public boolean isAvailable() { return apiKey != null && !apiKey.isBlank(); }

    protected RestClient client() {
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofMillis(Math.min(timeoutMs, 10_000)));
        rf.setReadTimeout(Duration.ofMillis(timeoutMs));
        return RestClient.builder().baseUrl(baseUrl).requestFactory(rf).build();
    }

    @Override
    public ChatResult chat(String systemPrompt, String userPrompt) throws AiProviderException {
        if (!isAvailable()) throw new AiProviderException(name() + ": no API key configured");
        long t0 = System.currentTimeMillis();
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("model", model);
            ArrayNode messages = body.putArray("messages");
            messages.add(message("system", systemPrompt));
            messages.add(message("user", userPrompt));
            body.put("temperature", 0.4);
            // Ask for strict JSON; we parse defensively in case the provider ignores it.
            body.set("response_format", mapper.createObjectNode().put("type", "json_object"));

            String raw = client().post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + apiKey)
                    .body(body.toString())
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(raw);
            JsonNode choice = root.path("choices").path(0);
            String content = choice.path("message").path("content").asText("");
            JsonNode usage = root.path("usage");
            long in = usage.path("prompt_tokens").asLong(estimateTokens(systemPrompt) + estimateTokens(userPrompt));
            long out = usage.path("completion_tokens").asLong(estimateTokens(content));
            return new ChatResult(name(), model, content, in, out, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            throw new AiProviderException(name() + " chat failed: " + e.getMessage(), e);
        }
    }

    private ObjectNode message(String role, String content) {
        ObjectNode m = mapper.createObjectNode();
        m.put("role", role);
        m.put("content", content);
        return m;
    }

    protected long estimateTokens(String text) {
        return text == null ? 0 : Math.max(1, text.length() / 4);
    }

    @Override
    public String toString() { return name() + "[" + model + "]"; }
}
