package lk.sltech.radar.pipeline;

import lk.sltech.radar.domain.Enums;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DedupServiceTest {

    private final DedupService dedup = new DedupService();

    @Test
    void urlNormalization_stripsWwwTrailingSlashAndTrackingParams() {
        assertEquals("https://example.com/path?b=2",
                DedupService.normalizeUrl("https://www.Example.com/path/?utm_source=newsletter&b=2"));
        assertEquals("http://example.com/path",
                DedupService.normalizeUrl("http://example.com/path#section"));
    }

    @Test
    void urlNormalization_keepsMeaningfulParams() {
        // Same path, different param VALUES must NOT collide.
        String a = DedupService.normalizeUrl("https://example.com/e?id=1");
        String b = DedupService.normalizeUrl("https://example.com/e?id=2");
        assertNotEquals(a, b);
    }

    @Test
    void exactUrlMatch_isSeen() {
        var v = dedup.check("Some Hackathon 2026",
                "https://www.example.com/hack?utm_medium=x",
                List.of("https://example.com/hack"),
                List.of("Unrelated Event"));
        assertEquals(Enums.DedupStatus.SEEN, v.status());
    }

    @Test
    void fuzzyTitleMatch_aboveThreshold_isSeen() {
        var v = dedup.check("HackNova 2026 — National Hackathon",
                "https://new-site.example.com/other",
                List.of("https://old.example.com/x"),
                List.of("HackNova 2026 National Hackathon"));
        assertEquals(Enums.DedupStatus.SEEN, v.status());
    }

    @Test
    void differentTitle_isNew() {
        var v = dedup.check("Quantum Computing Workshop",
                "https://new-site.example.com/other",
                List.of("https://old.example.com/x"),
                List.of("HackNova 2026 National Hackathon"));
        assertEquals(Enums.DedupStatus.NEW, v.status());
    }

    @Test
    void jaroWinkler_identical_isOne() {
        assertEquals(1.0, DedupService.jaroWinkler("abc", "abc"), 1e-9);
    }

    @Test
    void jaroWinkler_nearDuplicates_aboveThreshold() {
        double sim = DedupService.jaroWinkler("codesprint 9 idea to product", "codesprint 9 idea to product hackathon");
        assertTrue(sim >= 0.85, "expected >= 0.85 but was " + sim);
    }

    @Test
    void jaroWinkler_unrelated_belowThreshold() {
        double sim = DedupService.jaroWinkler("quantum computing workshop", "hacknova national hackathon");
        assertTrue(sim < 0.85, "expected < 0.85 but was " + sim);
    }

    @Test
    void jaroWinkler_empty_isZero() {
        assertEquals(0.0, DedupService.jaroWinkler("", "abc"), 1e-9);
    }
}
