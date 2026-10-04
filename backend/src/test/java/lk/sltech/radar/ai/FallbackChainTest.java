package lk.sltech.radar.ai;

import lk.sltech.radar.config.AppProperties;
import lk.sltech.radar.cost.UsageService;
import lk.sltech.radar.repo.ProviderUsageRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

/** Verifies the ordered fallback chain: config order is honored, failures fall through. */
class FallbackChainTest {

    /** Controllable stub provider. */
    static class StubProvider implements AiProvider {
        private final String name;
        private final boolean available;
        private final boolean throwsOnChat;

        StubProvider(String name, boolean available, boolean throwsOnChat) {
            this.name = name; this.available = available; this.throwsOnChat = throwsOnChat;
        }

        @Override public String name() { return name; }
        @Override public String modelName() { return name + "-model"; }
        @Override public boolean isAvailable() { return available; }
        @Override public ChatResult chat(String systemPrompt, String userPrompt) {
            if (throwsOnChat) throw new AiProviderException(name + " simulated outage");
            return new ChatResult(name, modelName(), "ok", 10, 5, 42);
        }
    }

    private FallbackAiService chain(List<String> order, List<AiProvider> providers) {
        AppProperties props = new AppProperties();
        props.setProvidersOrder(order);
        UsageService usage = new UsageService(mock(ProviderUsageRepository.class));
        return new FallbackAiService(props, providers, usage);
    }

    @Test
    void firstAvailableProviderServes() {
        var c = chain(List.of("nebius", "groq", "template"),
                List.of(new StubProvider("nebius", false, false),
                        new StubProvider("groq", true, false),
                        new StubProvider("template", true, false)));
        assertEquals("groq", c.chat("s", "u").providerName());
    }

    @Test
    void failingProviderFallsThroughToNext() {
        var c = chain(List.of("nebius", "groq", "template"),
                List.of(new StubProvider("nebius", true, true),   // up but errors
                        new StubProvider("groq", true, false),
                        new StubProvider("template", true, false)));
        assertEquals("groq", c.chat("s", "u").providerName());
    }

    @Test
    void templateIsTheGuaranteedLastResort() {
        var c = chain(List.of("nebius", "groq", "gemini", "ollama", "template"),
                List.of(new StubProvider("nebius", false, false),
                        new StubProvider("groq", false, false),
                        new StubProvider("gemini", false, false),
                        new StubProvider("ollama", false, false),
                        new StubProvider("template", true, false)));
        assertEquals("template", c.chat("s", "u").providerName());
    }

    @Test
    void configuredOrderIsRespected() {
        // Same providers, reversed order -> groq serves first even though nebius is up.
        var c = chain(List.of("groq", "nebius", "template"),
                List.of(new StubProvider("nebius", true, false),
                        new StubProvider("groq", true, false),
                        new StubProvider("template", true, false)));
        assertEquals("groq", c.chat("s", "u").providerName());
    }

    @Test
    void unknownProviderNamesInOrderAreIgnored() {
        var c = chain(List.of("nebius", "nope-not-real", "template"),
                List.of(new StubProvider("nebius", true, false),
                        new StubProvider("template", true, false)));
        assertEquals(List.of("nebius", "template"), c.chainOrder());
    }

    @Test
    void chaosTest_verifiesChainServesPastSimulatedOutage() {
        var c = chain(List.of("nebius", "groq", "template"),
                List.of(new StubProvider("nebius", true, false),
                        new StubProvider("groq", true, false),
                        new StubProvider("template", true, false)));
        Map<String, Object> result = c.fallbackTest(Set.of("nebius"));
        assertEquals("down", result.get("nebiusSimulated"));
        assertEquals("groq", result.get("servedBy"));
        assertEquals(true, result.get("ok"));
        // After the test the provider is back: normal call serves nebius again.
        assertEquals("nebius", c.chat("s", "u").providerName());
    }

    @Test
    void chainStatus_marksFirstAvailableActive_restStandby() {
        var c = chain(List.of("nebius", "groq", "template"),
                List.of(new StubProvider("nebius", false, false),
                        new StubProvider("groq", true, false),
                        new StubProvider("template", true, false)));
        var status = c.chainStatus();
        assertEquals("unavailable", status.get(0).get("status"));
        assertEquals("active", status.get(1).get("status"));
        assertEquals("standby", status.get(2).get("status"));
    }
}
