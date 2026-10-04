package lk.sltech.radar.search;

/** One Tavily /search hit. */
public record TavilyResult(
        String title,
        String url,
        String content,
        String publishedDate
) {}
