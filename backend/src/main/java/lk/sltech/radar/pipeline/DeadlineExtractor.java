package lk.sltech.radar.pipeline;

import lk.sltech.radar.domain.Enums;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Month;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Cheap deterministic deadline pre-pass over titles/snippets, run BEFORE any
 * LLM call. Sets deadlineConfidence high/medium/low so the LLM only has to
 * verify dates instead of discovering them (halves hallucinated-deadline risk).
 */
@Service
public class DeadlineExtractor {

    public record DeadlineGuess(LocalDate date, Enums.DeadlineConfidence confidence) {}

    private static final Map<String, Month> MONTHS = Map.ofEntries(
            Map.entry("jan", Month.JANUARY), Map.entry("january", Month.JANUARY),
            Map.entry("feb", Month.FEBRUARY), Map.entry("february", Month.FEBRUARY),
            Map.entry("mar", Month.MARCH), Map.entry("march", Month.MARCH),
            Map.entry("apr", Month.APRIL), Map.entry("april", Month.APRIL),
            Map.entry("may", Month.MAY),
            Map.entry("jun", Month.JUNE), Map.entry("june", Month.JUNE),
            Map.entry("jul", Month.JULY), Map.entry("july", Month.JULY),
            Map.entry("aug", Month.AUGUST), Map.entry("august", Month.AUGUST),
            Map.entry("sep", Month.SEPTEMBER), Map.entry("sept", Month.SEPTEMBER),
            Map.entry("september", Month.SEPTEMBER),
            Map.entry("oct", Month.OCTOBER), Map.entry("october", Month.OCTOBER),
            Map.entry("nov", Month.NOVEMBER), Map.entry("november", Month.NOVEMBER),
            Map.entry("dec", Month.DECEMBER), Map.entry("december", Month.DECEMBER));

    private static final String MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|"
            + "jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

    /** Words that signal the nearby date is actually a deadline. */
    private static final Pattern KEYWORD = Pattern.compile(
            "(?i)(deadline|apply\\s+by|applications?\\s+(close|closing|end|due)|"
            + "closes?\\s+(on|by)?|due\\s+(on|by)?|last\\s+date|register\\s+by|"
            + "submissions?\\s+(close|closing|deadline|due)|ends?\\s+(on|by)?|cut-?off)");

    private static final Pattern ISO = Pattern.compile("(?<!\\d)(\\d{4})-(\\d{1,2})-(\\d{1,2})(?!\\d)");
    private static final Pattern DMY_NUM = Pattern.compile("(?<!\\d)(\\d{1,2})[/\\-.](\\d{1,2})[/\\-.](\\d{2,4})(?!\\d)");
    private static final Pattern DMY_WORD = Pattern.compile(
            "(?i)(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s+" + MON + "\\s*,?\\s*(\\d{4})?");
    private static final Pattern MDY_WORD = Pattern.compile(
            "(?i)" + MON + "\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s*(\\d{4})?");
    private static final Pattern RELATIVE = Pattern.compile(
            "(?i)\\bin\\s+(\\d{1,3})\\s+(days?|weeks?|months?)\\b");
    private static final Pattern VAGUE = Pattern.compile(
            "(?i)(closing\\s+soon|apply\\s+(now|soon|asap)|limited\\s+(time|seats|slots)|"
            + "deadline\\s+(approaching|near)|last\\s+chance|hurry)");

    public DeadlineGuess extract(String title, String snippet) {
        String text = ((title == null ? "" : title) + "\n" + (snippet == null ? "" : snippet));
        LocalDate today = LocalDate.now();

        // 1) Explicit dates with year -> high confidence (higher if near a deadline keyword).
        Matcher m = ISO.matcher(text);
        if (m.find()) {
            LocalDate d = safeDate(intOf(m.group(1)), intOf(m.group(2)), intOf(m.group(3)));
            if (d != null) return new DeadlineGuess(d, nearKeyword(text, m.start()) ? Enums.DeadlineConfidence.high : Enums.DeadlineConfidence.medium);
        }
        m = DMY_WORD.matcher(text);
        if (m.find()) {
            Month mo = MONTHS.get(m.group(2).toLowerCase(Locale.ROOT));
            String yr = m.group(3);
            if (mo != null && yr != null && !yr.isBlank()) {
                LocalDate d = safeDate(intOf(yr), mo.getValue(), intOf(m.group(1)));
                if (d != null) return new DeadlineGuess(d, nearKeyword(text, m.start()) ? Enums.DeadlineConfidence.high : Enums.DeadlineConfidence.medium);
            } else if (mo != null) {
                LocalDate d = nextOccurrence(today, mo, intOf(m.group(1)));
                if (d != null) return new DeadlineGuess(d, Enums.DeadlineConfidence.medium);
            }
        }
        m = MDY_WORD.matcher(text);
        if (m.find()) {
            Month mo = MONTHS.get(m.group(1).toLowerCase(Locale.ROOT));
            String yr = m.group(3);
            if (mo != null && yr != null && !yr.isBlank()) {
                LocalDate d = safeDate(intOf(yr), mo.getValue(), intOf(m.group(2)));
                if (d != null) return new DeadlineGuess(d, nearKeyword(text, m.start()) ? Enums.DeadlineConfidence.high : Enums.DeadlineConfidence.medium);
            } else if (mo != null) {
                LocalDate d = nextOccurrence(today, mo, intOf(m.group(2)));
                if (d != null) return new DeadlineGuess(d, Enums.DeadlineConfidence.medium);
            }
        }
        m = DMY_NUM.matcher(text);
        if (m.find()) {
            // Assume D/M/Y (Sri Lankan convention).
            int a = intOf(m.group(1)), b = intOf(m.group(2));
            int year = intOf(m.group(3));
            if (year < 100) year += 2000;
            LocalDate d = safeDate(year, b, a);
            if (d != null) return new DeadlineGuess(d, nearKeyword(text, m.start()) ? Enums.DeadlineConfidence.high : Enums.DeadlineConfidence.medium);
        }

        // 2) Relative dates ("in 5 days") -> medium.
        m = RELATIVE.matcher(text);
        if (m.find()) {
            int n = intOf(m.group(1));
            String unit = m.group(2).toLowerCase(Locale.ROOT);
            LocalDate d = unit.startsWith("week") ? today.plusWeeks(n)
                    : unit.startsWith("month") ? today.plusMonths(n) : today.plusDays(n);
            return new DeadlineGuess(d, Enums.DeadlineConfidence.medium);
        }

        // 3) Vague urgency or nothing -> low / null.
        if (VAGUE.matcher(text).find()) {
            return new DeadlineGuess(null, Enums.DeadlineConfidence.low);
        }
        return new DeadlineGuess(null, Enums.DeadlineConfidence.low);
    }

    private boolean nearKeyword(String text, int pos) {
        int from = Math.max(0, pos - 50);
        return KEYWORD.matcher(text.substring(from, pos)).find();
    }

    private LocalDate safeDate(int year, int month, int day) {
        try {
            return LocalDate.of(year, month, day);
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDate nextOccurrence(LocalDate today, Month month, int day) {
        LocalDate d = safeDate(today.getYear(), month.getValue(), day);
        if (d == null) return null;
        return d.isBefore(today) ? d.plusYears(1) : d;
    }

    private int intOf(String s) {
        try { return Integer.parseInt(s.trim()); }
        catch (Exception e) { return 0; }
    }
}
