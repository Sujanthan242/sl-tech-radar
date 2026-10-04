package lk.sltech.radar.search;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import lk.sltech.radar.config.AppProperties;
import lk.sltech.radar.cost.UsageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Tavily /search wrapper (Spring RestClient — Tavily has no official Java SDK).
 * Basic search = 1 credit; time_range="week" per the research brief.
 *
 * NOTE (Feb 2026): Tavily was acquired by Nebius. The /search request/response
 * shape below follows the long-stable Tavily API; if Nebius reshapes it, this
 * class is the single place to adapt (see README "Tavily fallback").
 */
@Component
public class TavilyClient {

    private static final Logger log = LoggerFactory.getLogger(TavilyClient.class);

    private final ObjectMapper mapper = new ObjectMapper();
    private final AppProperties.TavilyProps tavilyProps;
    private final String apiKey;
    private final UsageService usageService;

    public TavilyClient(AppProperties props,
                        @Value("${TAVILY_API_KEY:}") String apiKey,
                        UsageService usageService) {
        this.tavilyProps = props.getTavily();
        this.apiKey = apiKey;
        this.usageService = usageService;
    }

    public boolean isAvailable() {
        return apiKey != null && !apiKey.isBlank();
    }

    /**
     * Cached per (query + ISO week): a Saturday re-run within 7 days hits the
     * cache instead of spending another Tavily credit.
     */
    @Cacheable(value = "tavilyCache", key = "#query + '|' + #week")
    public List<TavilyResult> search(String query, String week) {
        if (!isAvailable()) {
            throw new IllegalStateException("TAVILY_API_KEY is not configured");
        }
        try {
            SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
            rf.setConnectTimeout(Duration.ofMillis(10_000));
            rf.setReadTimeout(Duration.ofMillis(30_000));
            RestClient client = RestClient.builder()
                    .baseUrl(tavilyProps.getBaseUrl()).requestFactory(rf).build();

            ObjectNode body = mapper.createObjectNode();
            body.put("api_key", apiKey);
            body.put("query", query);
            body.put("search_depth", tavilyProps.getSearchDepth());
            body.put("time_range", tavilyProps.getTimeRange());
            body.put("max_results", tavilyProps.getMaxResults());
            body.put("include_answer", false);
            body.put("include_raw_content", false);

            String raw = client.post().uri("/search")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString())
                    .retrieve().body(String.class);

            usageService.recordTavilySearch();
            List<TavilyResult> out = new ArrayList<>();
            JsonNode results = mapper.readTree(raw).path("results");
            for (JsonNode r : results) {
                out.add(new TavilyResult(
                        r.path("title").asText(""),
                        r.path("url").asText(""),
                        r.path("content").asText(""),
                        r.path("published_date").asText(null)));
            }
            log.info("Tavily search '{}' -> {} results (week {})", query, out.size(), week);
            return out;
        } catch (Exception e) {
            log.warn("Tavily search failed for '{}': {}", query, e.getMessage());
            throw new IllegalStateException("Tavily search failed: " + e.getMessage(), e);
        }
    }

    /** Convenience overload using the current ISO week. */
    public List<TavilyResult> search(String query) {
        return search(query, currentWeek());
    }

    public static String currentWeek() {
        LocalDate now = LocalDate.now();
        int week = now.get(WeekFields.ISO.weekOfWeekBasedYear());
        int year = now.get(WeekFields.ISO.weekBasedYear());
        return String.format(Locale.ROOT, "%d-W%02d", year, week);
    }
}
