package lk.sltech.radar.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Binds the `app.*` properties (see application.properties). */
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    /** Ordered fallback chain, e.g. [nebius, groq, gemini, ollama, template]. */
    private List<String> providersOrder = new ArrayList<>(List.of("nebius", "groq", "gemini", "ollama", "template"));

    /** Per-provider settings: model, baseUrl, timeouts. */
    private Map<String, ProviderProps> providers = Map.of();

    private TavilyProps tavily = new TavilyProps();
    private LangsmithProps langsmith = new LangsmithProps();
    private MockProps mock = new MockProps();

    public List<String> getProvidersOrder() { return providersOrder; }
    public void setProvidersOrder(List<String> providersOrder) { this.providersOrder = providersOrder; }
    public Map<String, ProviderProps> getProviders() { return providers; }
    public void setProviders(Map<String, ProviderProps> providers) { this.providers = providers; }
    public TavilyProps getTavily() { return tavily; }
    public void setTavily(TavilyProps tavily) { this.tavily = tavily; }
    public LangsmithProps getLangsmith() { return langsmith; }
    public void setLangsmith(LangsmithProps langsmith) { this.langsmith = langsmith; }
    public MockProps getMock() { return mock; }
    public void setMock(MockProps mock) { this.mock = mock; }

    public static class ProviderProps {
        private String model;
        private String baseUrl;
        private int timeoutMs = 60_000;

        public String getModel() { return model; }
        public void setModel(String model) { this.model = model; }
        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public int getTimeoutMs() { return timeoutMs; }
        public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }
    }

    public static class TavilyProps {
        private String baseUrl = "https://api.tavily.com";
        private int maxResults = 10;
        private String timeRange = "week";
        private String searchDepth = "basic";

        public String getBaseUrl() { return baseUrl; }
        public void setBaseUrl(String baseUrl) { this.baseUrl = baseUrl; }
        public int getMaxResults() { return maxResults; }
        public void setMaxResults(int maxResults) { this.maxResults = maxResults; }
        public String getTimeRange() { return timeRange; }
        public void setTimeRange(String timeRange) { this.timeRange = timeRange; }
        public String getSearchDepth() { return searchDepth; }
        public void setSearchDepth(String searchDepth) { this.searchDepth = searchDepth; }
    }

    public static class LangsmithProps {
        private String project = "sl-tech-radar";
        private String datasetId;

        public String getProject() { return project; }
        public void setProject(String project) { this.project = project; }
        public String getDatasetId() { return datasetId; }
        public void setDatasetId(String datasetId) { this.datasetId = datasetId; }
    }

    public static class MockProps {
        /** Seed curated sample data when no real provider keys are configured. */
        private boolean enabled = true;

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }
}
