package lk.sltech.radar.pipeline;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.ObjectNode;
import lk.sltech.radar.ai.ChatResult;
import lk.sltech.radar.ai.FallbackAiService;
import lk.sltech.radar.domain.Candidate;
import lk.sltech.radar.domain.Category;
import lk.sltech.radar.domain.DraftSection;
import lk.sltech.radar.domain.Edition;
import lk.sltech.radar.repo.DraftSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.stream.Collectors;

/**
 * ONE structured-output call per category. The prompt embeds the candidates as
 * JSON; the model returns a JSON section payload which is rendered to markdown
 * deterministically. Identical inputs never regenerate: the content key
 * SHA256(category + edition week + sorted source-URL set) is checked against
 * Caffeine first, then the DB (draft_sections.cache_key).
 */
@Service
public class DraftService {

    private static final Logger log = LoggerFactory.getLogger(DraftService.class);

    private final FallbackAiService ai;
    private final DraftSectionRepository drafts;
    private final CacheManager cacheManager;
    private final ObjectMapper mapper = new ObjectMapper();

    public DraftService(FallbackAiService ai, DraftSectionRepository drafts, CacheManager cacheManager) {
        this.ai = ai;
        this.drafts = drafts;
        this.cacheManager = cacheManager;
    }

    /** Cache entry kept in Caffeine (small, detached from JPA). */
    public record CachedDraft(String contentMd, String sourcesJson, String modelUsed, long tokensUsed) {}

    @Transactional
    public DraftSection generateDraft(Edition edition, Category category,
                                      List<Candidate> candidates, String feedback, String traceRunId) {
        String key = cacheKey(edition.getWeek(), category,
                candidates.stream().map(Candidate::getUrl).sorted().toList(), feedback);

        CachedDraft cached = lookupCache(key);
        if (cached == null) {
            cached = drafts.findFirstByCacheKey(key)
                    .map(d -> new CachedDraft(d.getContentMd(), d.getSourcesJson(), d.getModelUsed(), d.getTokensUsed()))
                    .orElse(null);
            if (cached != null) putCache(key, cached);
        }
        if (cached != null) {
            log.info("Draft cache hit for {} {} (key {})", edition.getWeek(), category, key.substring(0, 12));
            return saveDraft(edition, category, cached, key, traceRunId);
        }

        ChatResult r = ai.chat(systemPrompt(category), userPrompt(edition.getWeek(), category, candidates, feedback));
        String contentMd = renderMarkdown(category, candidates, r);
        String sourcesJson = buildSourcesJson(candidates);
        CachedDraft fresh = new CachedDraft(contentMd, sourcesJson, r.providerName(), r.totalTokens());
        putCache(key, fresh);
        log.info("Draft generated for {} {} via {} ({} tokens)", edition.getWeek(), category,
                r.providerName(), r.totalTokens());
        return saveDraft(edition, category, fresh, key, traceRunId);
    }

    private DraftSection saveDraft(Edition edition, Category category, CachedDraft cached,
                                   String key, String traceRunId) {
        DraftSection d = new DraftSection(edition, category, cached.contentMd(),
                cached.modelUsed(), cached.tokensUsed(), cached.sourcesJson(), key);
        d.setTraceRunId(traceRunId);
        return drafts.save(d);
    }

    /** Public for tests: the content-addressed key. */
    public static String cacheKey(String week, Category category, List<String> sortedUrls, String feedback) {
        try {
            String input = category.name() + "|" + week + "|"
                    + String.join(",", sortedUrls) + "|"
                    + (feedback == null ? "" : feedback);
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }

    private CachedDraft lookupCache(String key) {
        Cache c = cacheManager.getCache("draftCache");
        return c == null ? null : c.get(key, CachedDraft.class);
    }

    private void putCache(String key, CachedDraft entry) {
        Cache c = cacheManager.getCache("draftCache");
        if (c != null) c.put(key, entry);
    }

    private String systemPrompt(Category category) {
        return """
                You are the drafting assistant for "SL Tech Students Weekly", a newsletter for
                Sri Lankan tech undergraduates. Write in clear, friendly English with short punchy
                lines. Every item MUST link its source URL and show its deadline (or "date TBA").
                Never invent deadlines: use only the deadline given per item, or say "date TBA".
                Keep the whole section under 220 words.

                Reply with a single JSON object, no markdown fences:
                {"headline": "short section headline",
                 "intro": "one engaging sentence",
                 "items": [{"title": "...", "deadline": "YYYY-MM-DD or null",
                            "oneLiner": "why a student should care, <= 25 words", "url": "..."}],
                 "outro": "one closing line"}""";
    }

    private String userPrompt(String week, Category category, List<Candidate> candidates, String feedback) {
        try {
            ArrayNode arr = mapper.createArrayNode();
            for (Candidate c : candidates) {
                ObjectNode o = mapper.createObjectNode();
                o.put("title", c.getTitle());
                o.put("url", c.getUrl());
                o.put("deadline", c.getDeadline() == null ? "" : c.getDeadline().toString());
                o.put("deadlineConfidence", c.getDeadlineConfidence() == null ? "low" : c.getDeadlineConfidence().name());
                o.put("snippet", c.getSnippet() == null ? "" : c.getSnippet());
                arr.add(o);
            }
            StringBuilder sb = new StringBuilder();
            sb.append("CATEGORY: ").append(category.name()).append("\n");
            sb.append("EDITION: ").append(week).append("\n");
            if (feedback != null && !feedback.isBlank()) {
                sb.append("REGENERATION FEEDBACK (address this): ").append(feedback).append("\n");
            }
            sb.append("<<<CANDIDATES_JSON\n").append(mapper.writeValueAsString(arr)).append("\n>>>\n");
            sb.append("Draft the ").append(category.name()).append(" section from these candidates.");
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to build draft prompt", e);
        }
    }

    private String renderMarkdown(Category category, List<Candidate> candidates, ChatResult r) {
        // Template mode already returns finished markdown.
        if ("template".equals(r.providerName())) return r.content();
        try {
            String json = r.content();
            int start = json.indexOf('{');
            int end = json.lastIndexOf('}');
            if (start < 0 || end <= start) return json;
            JsonNode root = mapper.readTree(json.substring(start, end + 1));

            StringBuilder md = new StringBuilder();
            md.append("### ").append(root.path("headline").asText(prettyCategory(category))).append("\n\n");
            String intro = root.path("intro").asText("");
            if (!intro.isBlank()) md.append(intro).append("\n\n");
            for (JsonNode item : root.path("items")) {
                String title = item.path("title").asText("Untitled");
                String url = item.path("url").asText("");
                String deadline = item.path("deadline").asText("");
                if (deadline.isBlank() || "null".equals(deadline)) deadline = "date TBA";
                md.append("- **[").append(title).append("](").append(url).append(")** — ⏰ ")
                  .append(deadline).append("\n");
                String oneLiner = item.path("oneLiner").asText("");
                if (!oneLiner.isBlank()) md.append("  ").append(oneLiner).append("\n");
            }
            String outro = root.path("outro").asText("");
            if (!outro.isBlank()) md.append("\n").append(outro).append("\n");
            return md.toString();
        } catch (Exception e) {
            log.warn("Draft JSON parse failed, using raw content: {}", e.getMessage());
            return r.content();
        }
    }

    private String buildSourcesJson(List<Candidate> candidates) {
        try {
            ArrayNode arr = mapper.createArrayNode();
            for (Candidate c : candidates.stream()
                    .collect(Collectors.toMap(Candidate::getUrl, c -> c, (a, b) -> a))
                    .values()) {
                ObjectNode o = mapper.createObjectNode();
                o.put("title", c.getTitle());
                o.put("url", c.getUrl());
                arr.add(o);
            }
            return mapper.writeValueAsString(arr);
        } catch (Exception e) {
            return "[]";
        }
    }

    private String prettyCategory(Category category) {
        return switch (category) {
            case hackathons -> "Hackathons";
            case internships -> "Internships";
            case courses -> "Free Courses";
            case scholarships -> "Scholarships";
        };
    }
}
