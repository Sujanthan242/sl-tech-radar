package lk.sltech.radar.ai;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Last-resort provider: no AI, no network, no keys. Builds a clean curated
 * section from the candidate list embedded in the prompt by DraftService.
 * Always available — this is what keeps the app lifetime-workable when every
 * credit is exhausted. modelUsed is reported as "template" per the contract.
 */
@Component("template")
public class TemplateProvider implements AiProvider {

    private final ObjectMapper mapper = new ObjectMapper();
    private static final Pattern CANDIDATES_BLOCK =
            Pattern.compile("<<<CANDIDATES_JSON\\s*(.*?)\\s*>>>", Pattern.DOTALL);
    private static final Pattern CATEGORY_LINE =
            Pattern.compile("(?m)^CATEGORY:\\s*(\\S+)");

    @Override public String name() { return "template"; }
    @Override public String modelName() { return "template"; }
    @Override public boolean isAvailable() { return true; }

    @Override
    public ChatResult chat(String systemPrompt, String userPrompt) throws AiProviderException {
        long t0 = System.currentTimeMillis();
        try {
            String category = "opportunities";
            Matcher cm = CATEGORY_LINE.matcher(userPrompt);
            if (cm.find()) category = cm.group(1);

            StringBuilder md = new StringBuilder();
            md.append("### This week's ").append(prettyCategory(category)).append("\n\n");
            md.append("Hand-picked for Sri Lankan tech undergrads. Dates verified from the source links — apply early.\n\n");

            Matcher m = CANDIDATES_BLOCK.matcher(userPrompt);
            int count = 0;
            if (m.find()) {
                JsonNode items = mapper.readTree(m.group(1));
                for (JsonNode item : items) {
                    String title = item.path("title").asText("Untitled opportunity");
                    String url = item.path("url").asText("");
                    String deadline = item.path("deadline").asText("");
                    String snippet = item.path("snippet").asText("");
                    String oneLiner = snippet.length() > 160 ? snippet.substring(0, 157) + "..." : snippet;
                    md.append("- **[").append(title).append("](").append(url).append(")** — ⏰ ")
                      .append(deadline.isBlank() ? "date TBA — check the link" : deadline).append("\n");
                    if (!oneLiner.isBlank()) md.append("  ").append(oneLiner).append("\n");
                    count++;
                }
            }
            if (count == 0) {
                md.append("_No fresh opportunities surfaced this week — check back next Saturday._\n");
            }
            md.append("\n*Never miss a deadline that matters.*\n");

            String content = md.toString();
            long tokens = Math.max(1, (systemPrompt.length() + userPrompt.length() + content.length()) / 4);
            return new ChatResult(name(), modelName(), content, tokens / 2, tokens / 2,
                    System.currentTimeMillis() - t0);
        } catch (Exception e) {
            throw new AiProviderException("template render failed: " + e.getMessage(), e);
        }
    }

    private String prettyCategory(String category) {
        return switch (category.toLowerCase()) {
            case "hackathons" -> "Hackathons";
            case "internships" -> "Internships";
            case "courses" -> "Free Courses";
            case "scholarships" -> "Scholarships";
            default -> "Opportunities";
        };
    }
}
