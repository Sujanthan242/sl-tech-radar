package lk.sltech.radar.pipeline;

import lk.sltech.radar.domain.Enums;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Deterministic dedup — NO embeddings, per the research brief.
 * <ol>
 *   <li>Normalized-URL exact match against the ledger first.</li>
 *   <li>Then Jaro-Winkler ≥ 0.85 on titles.</li>
 * </ol>
 */
@Service
public class DedupService {

    /** Fuzzy title-match threshold from the brief. */
    public static final double TITLE_SIMILARITY_THRESHOLD = 0.85;

    private static final Set<String> TRACKING_PARAMS = Set.of(
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid", "ref", "mc_cid", "mc_eid");

    /** Verdict of a dedup check. */
    public record DedupVerdict(Enums.DedupStatus status, String matchedOn) {}

    public DedupVerdict check(String title, String url,
                              List<String> knownUrls, List<String> knownTitles) {
        String norm = normalizeUrl(url);
        for (String known : knownUrls) {
            if (norm.equals(normalizeUrl(known))) {
                return new DedupVerdict(Enums.DedupStatus.SEEN, "url:" + known);
            }
        }
        String cleanTitle = cleanTitle(title);
        double best = 0;
        String bestTitle = null;
        for (String known : knownTitles) {
            double sim = jaroWinkler(cleanTitle, cleanTitle(known));
            if (sim > best) { best = sim; bestTitle = known; }
        }
        if (best >= TITLE_SIMILARITY_THRESHOLD) {
            return new DedupVerdict(Enums.DedupStatus.SEEN,
                    String.format(Locale.ROOT, "title:%.2f:%s", best, bestTitle));
        }
        return new DedupVerdict(Enums.DedupStatus.NEW, null);
    }

    /** Normalize a URL for exact-match dedup: lowercase host, strip www/trailing-slash/fragment/tracking params. */
    public static String normalizeUrl(String url) {
        if (url == null) return "";
        String u = url.trim();
        try {
            URI uri = new URI(u);
            String host = uri.getHost() == null ? "" : uri.getHost().toLowerCase(Locale.ROOT);
            if (host.startsWith("www.")) host = host.substring(4);
            String path = uri.getPath() == null ? "" : uri.getPath();
            if (path.endsWith("/") && path.length() > 1) path = path.substring(0, path.length() - 1);
            String query = uri.getQuery();
            String kept = "";
            if (query != null && !query.isBlank()) {
                kept = Arrays.stream(query.split("&"))
                        .filter(p -> !TRACKING_PARAMS.contains(
                                p.split("=", 2)[0].toLowerCase(Locale.ROOT)))
                        .sorted()
                        .collect(Collectors.joining("&"));
            }
            String scheme = uri.getScheme() == null ? "https" : uri.getScheme().toLowerCase(Locale.ROOT);
            return scheme + "://" + host + path + (kept.isEmpty() ? "" : "?" + kept);
        } catch (Exception e) {
            // Fall back to a cheap normalization when the URL doesn't parse.
            return u.toLowerCase(Locale.ROOT).replaceFirst("^https?://(www\\.)?", "").replaceAll("/$", "");
        }
    }

    private static String cleanTitle(String t) {
        if (t == null) return "";
        return t.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    /** Jaro-Winkler similarity in [0,1]. */
    public static double jaroWinkler(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        if (s1.equals(s2)) return 1.0;
        int len1 = s1.length(), len2 = s2.length();
        if (len1 == 0 || len2 == 0) return 0.0;

        int matchDistance = Math.max(len1, len2) / 2 - 1;
        boolean[] s1Matches = new boolean[len1];
        boolean[] s2Matches = new boolean[len2];
        int matches = 0;

        for (int i = 0; i < len1; i++) {
            int start = Math.max(0, i - matchDistance);
            int end = Math.min(i + matchDistance + 1, len2);
            for (int j = start; j < end; j++) {
                if (s2Matches[j] || s1.charAt(i) != s2.charAt(j)) continue;
                s1Matches[i] = true;
                s2Matches[j] = true;
                matches++;
                break;
            }
        }
        if (matches == 0) return 0.0;

        int transpositions = 0, k = 0;
        for (int i = 0; i < len1; i++) {
            if (!s1Matches[i]) continue;
            while (!s2Matches[k]) k++;
            if (s1.charAt(i) != s2.charAt(k)) transpositions++;
            k++;
        }
        double m = matches;
        double jaro = (m / len1 + m / len2 + (m - transpositions / 2.0) / m) / 3.0;

        int prefix = 0;
        for (int i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
            if (s1.charAt(i) == s2.charAt(i)) prefix++;
            else break;
        }
        return jaro + prefix * 0.1 * (1 - jaro);
    }
}
