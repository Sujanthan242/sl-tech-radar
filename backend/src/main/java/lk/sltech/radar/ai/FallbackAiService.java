package lk.sltech.radar.ai;

import lk.sltech.radar.config.AppProperties;
import lk.sltech.radar.cost.CostEstimator;
import lk.sltech.radar.cost.UsageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * The ordered fallback chain. Providers are tried in the order configured via
 * `app.providers.order` (default: nebius → groq → gemini → ollama → template).
 * A provider that is unavailable (no key) or throws is skipped; the first
 * success wins. Template mode is the guaranteed last resort.
 */
@Service
public class FallbackAiService {

    private static final Logger log = LoggerFactory.getLogger(FallbackAiService.class);

    private final AppProperties props;
    private final Map<String, AiProvider> providersByName;
    private final UsageService usageService;
    /** Names force-marked down (chaos testing via /api/providers/fallback-test). */
    private final Set<String> forcedDown = Collections.synchronizedSet(new HashSet<>());

    public FallbackAiService(AppProperties props, List<AiProvider> providers, UsageService usageService) {
        this.props = props;
        this.providersByName = new HashMap<>();
        for (AiProvider p : providers) providersByName.put(p.name(), p);
        this.usageService = usageService;
    }

    /** Ordered provider names after config; unknown names are ignored with a warning. */
    public List<String> chainOrder() {
        List<String> order = new ArrayList<>();
        for (String name : props.getProvidersOrder()) {
            if (providersByName.containsKey(name)) order.add(name);
            else log.warn("Unknown provider '{}' in app.providers.order — ignoring", name);
        }
        // Safety net: template must always be reachable.
        if (!order.contains("template") && providersByName.containsKey("template")) order.add("template");
        return order;
    }

    public Optional<AiProvider> resolve(String name) {
        return Optional.ofNullable(providersByName.get(name));
    }

    /** True when at least one real (non-template) provider can serve. */
    public boolean anyRealProviderAvailable() {
        return chainOrder().stream()
                .filter(n -> !"template".equals(n))
                .anyMatch(n -> !forcedDown.contains(n)
                        && providersByName.get(n).isAvailable());
    }

    /** Runs the chain; records token usage + cost for the winner. */
    public ChatResult chat(String systemPrompt, String userPrompt) {
        List<String> tried = new ArrayList<>();
        for (String name : chainOrder()) {
            AiProvider p = providersByName.get(name);
            if (forcedDown.contains(name)) {
                log.info("Provider {} is force-marked down (chaos test) — skipping", name);
                tried.add(name + ":forced-down");
                continue;
            }
            if (!p.isAvailable()) {
                tried.add(name + ":unavailable");
                continue;
            }
            try {
                ChatResult r = p.chat(systemPrompt, userPrompt);
                double cost = CostEstimator.estimate(name, r.promptTokens(), r.completionTokens());
                usageService.record(name, r.promptTokens(), r.completionTokens(), cost);
                log.info("AI call served by {} (model={}, {} tokens in {}ms)",
                        name, r.model(), r.totalTokens(), r.latencyMs());
                return r;
            } catch (AiProviderException e) {
                log.warn("Provider {} failed, falling through: {}", name, e.getMessage());
                tried.add(name + ":error");
            }
        }
        throw new AiProviderException("All AI providers exhausted. Tried: " + tried);
    }

    /** Chaos button: simulate an outage of the given providers and verify the chain still serves. */
    public Map<String, Object> fallbackTest(Set<String> simulateDown) {
        forcedDown.addAll(simulateDown);
        try {
            long t0 = System.currentTimeMillis();
            ChatResult r = chat("You are a health check. Reply with exactly: ok",
                    "Reply with exactly: ok");
            long latency = System.currentTimeMillis() - t0;
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("nebiusSimulated", simulateDown.contains("nebius") ? "down" : "up");
            out.put("servedBy", r.providerName());
            out.put("ok", !simulateDown.contains(r.providerName()));
            out.put("latencyMs", latency);
            return out;
        } finally {
            forcedDown.removeAll(simulateDown);
        }
    }

    /** Per-provider status for GET /api/providers/status. */
    public List<Map<String, Object>> chainStatus() {
        List<String> order = chainOrder();
        String firstAvailable = order.stream()
                .filter(n -> !forcedDown.contains(n) && providersByName.get(n).isAvailable())
                .findFirst().orElse(null);
        List<Map<String, Object>> out = new ArrayList<>();
        for (String name : order) {
            AiProvider p = providersByName.get(name);
            boolean up = !forcedDown.contains(name) && p.isAvailable();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", name);
            row.put("status", !up ? "unavailable" : name.equals(firstAvailable) ? "active" : "standby");
            row.put("latencyMs", null);
            row.put("model", p.modelName());
            out.add(row);
        }
        return out;
    }
}
