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

/** Fallback 2: Google Gemini (REST generateContent). Env: GEMINI_API_KEY. */
@Component("gemini")
public class GeminiProvider implements AiProvider {

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String model;
    private final int timeoutMs;

    public GeminiProvider(AppProperties props,
                          @Value("${GEMINI_API_KEY:}") String apiKey) {
        var p = props.getProviders().get("gemini");
        this.apiKey = apiKey;
        this.model = (p != null && p.getModel() != null && !p.getModel().isBlank())
                ? p.getModel() : "gemini-2.5-flash-lite";
        this.timeoutMs = p != null ? p.getTimeoutMs() : 60_000;
    }

    @Override public String name() { return "gemini"; }
    @Override public String modelName() { return model; }
    @Override public boolean isAvailable() { return apiKey != null && !apiKey.isBlank(); }

    @Override
    public ChatResult chat(String systemPrompt, String userPrompt) throws AiProviderException {
        if (!isAvailable()) throw new AiProviderException("gemini: no API key configured");
        long t0 = System.currentTimeMillis();
        try {
            SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
            rf.setConnectTimeout(Duration.ofMillis(10_000));
            rf.setReadTimeout(Duration.ofMillis(timeoutMs));
            RestClient client = RestClient.builder()
                    .baseUrl("https://generativelanguage.googleapis.com")
                    .requestFactory(rf).build();

            ObjectNode body = mapper.createObjectNode();
            ObjectNode sys = mapper.createObjectNode();
            ArrayNode sysParts = sys.putArray("parts");
            sysParts.add(mapper.createObjectNode().put("text", systemPrompt));
            body.set("system_instruction", sys);
            ArrayNode contents = body.putArray("contents");
            ObjectNode content = mapper.createObjectNode();
            ArrayNode parts = content.putArray("parts");
            parts.add(mapper.createObjectNode().put("text", userPrompt));
            body.set("contents", contents);
            ObjectNode genCfg = mapper.createObjectNode();
            genCfg.put("responseMimeType", "application/json");
            genCfg.put("temperature", 0.4);
            body.set("generationConfig", genCfg);

            String raw = client.post()
                    .uri("/v1beta/models/{model}:generateContent?key={key}", model, apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString())
                    .retrieve()
                    .body(String.class);

            JsonNode root = mapper.readTree(raw);
            String text = root.path("candidates").path(0)
                    .path("content").path("parts").path(0).path("text").asText("");
            JsonNode usage = root.path("usageMetadata");
            long in = usage.path("promptTokenCount").asLong((systemPrompt.length() + userPrompt.length()) / 4);
            long out = usage.path("candidatesTokenCount").asLong(text.length() / 4);
            return new ChatResult(name(), model, text, in, out, System.currentTimeMillis() - t0);
        } catch (Exception e) {
            throw new AiProviderException("gemini chat failed: " + e.getMessage(), e);
        }
    }
}
