package lk.sltech.radar.pipeline;

import lk.sltech.radar.domain.Enums;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Cheap deterministic grading before any LLM call:
 * <ul>
 *   <li>deadline parseable and in the future?</li>
 *   <li>SL-eligible heuristic?</li>
 * </ul>
 * Anything uncertain is flagged VERIFY so it sorts to the top of the review
 * queue — the human looks at exceptions only.
 */
@Service
public class EligibilityGrader {

    private static final Pattern SL_HINT = Pattern.compile(
            "(?i)(sri\\s?lanka|\\blanka\\b|colombo|kandy|jaffna|galle|moratuwa|peradeniya|"
            + "seusl|university\\s+of\\s+(moratuwa|colombo|peradeniya|jaffna|ruhuna)|"
            + "slasscom|icta\\s+sri\\s+lanka)");

    private static final Pattern STUDENT_OPEN = Pattern.compile(
            "(?i)(undergrad|students?|university|college|youth|school)");

    private static final Pattern GLOBAL_OPEN = Pattern.compile(
            "(?i)(worldwide|global|international|open\\s+to\\s+all|anyone\\s+can|remote|online)");

    /** Explicitly restricted to somewhere else. */
    private static final Pattern EXCLUDED = Pattern.compile(
            "(?i)(us\\s+only|u\\.s\\.\\s+citizens?\\s+only|india\\s+only|uk\\s+only|"
            + "must\\s+be\\s+(a\\s+)?(us|indian|uk)\\s+(citizen|resident))");

    /**
     * Returns the recommended dedup status: NEW for clean candidates,
     * VERIFY when the grader is unsure (deadline past/unparseable or
     * eligibility uncertain).
     */
    public Enums.DedupStatus grade(String title, String snippet, LocalDate deadline,
                                   Enums.DeadlineConfidence confidence) {
        String text = ((title == null ? "" : title) + " " + (snippet == null ? "" : snippet))
                .toLowerCase(Locale.ROOT);

        // Past deadline -> needs human eyes (could be next year's edition or a stale page).
        if (deadline != null && deadline.isBefore(LocalDate.now())) {
            return Enums.DedupStatus.VERIFY;
        }
        // Explicitly restricted elsewhere -> verify rather than silently drop.
        if (EXCLUDED.matcher(text).find()) {
            return Enums.DedupStatus.VERIFY;
        }
        // No deadline at all -> verify (deadline-first newsletter can't rank it).
        if (deadline == null) {
            return Enums.DedupStatus.VERIFY;
        }
        // SL signal, or student-targeted + globally open -> clean.
        if (SL_HINT.matcher(text).find()) return Enums.DedupStatus.NEW;
        if (STUDENT_OPEN.matcher(text).find() && GLOBAL_OPEN.matcher(text).find()) return Enums.DedupStatus.NEW;
        // Deadline known but eligibility unclear -> human decides.
        return Enums.DedupStatus.VERIFY;
    }
}
