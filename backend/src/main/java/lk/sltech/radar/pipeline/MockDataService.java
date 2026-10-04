package lk.sltech.radar.pipeline;

import lk.sltech.radar.domain.Category;
import lk.sltech.radar.domain.Enums;
import lk.sltech.radar.domain.Kind;
import lk.sltech.radar.domain.LedgerEvent;
import lk.sltech.radar.search.TavilyResult;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Curated sample data for mock mode (no provider keys). Mirrors the shape of
 * real Tavily results so the whole pipeline — dedup, deadline extraction,
 * grading, drafting, review — runs end to end without spending a cent.
 */
@Service
public class MockDataService {

    public record MockCandidate(String title, String url, String snippet, Kind kind, Category category) {}

    /** ~12 sample opportunities with deadlines relative to "today" so the demo always looks alive. */
    public List<MockCandidate> candidates() {
        LocalDate t = LocalDate.now();
        List<MockCandidate> out = new ArrayList<>();
        out.add(new MockCandidate("HackNova 2026 — National Inter-University Hackathon",
                "https://hacknova.lk/2026",
                "Sri Lanka's biggest student hackathon returns to Colombo. 48 hours, Rs. 1M prize pool. Registration deadline: " + t.plusDays(21) + ". Open to all undergraduates.",
                Kind.hackathon, Category.hackathons));
        out.add(new MockCandidate("CodeSprint 9 — From Idea to Product",
                "https://codesprint.lk",
                "The classic SL student startup hackathon. Applications close " + t.plusDays(14) + ".",
                Kind.hackathon, Category.hackathons));
        out.add(new MockCandidate("Dialog FutureMakers Hackathon 2026",
                "https://dialog.lk/futuremakers",
                "Build with Dialog's APIs. Deadline " + t.plusDays(35) + ". Student teams of 3-5.",
                Kind.hackathon, Category.hackathons));
        out.add(new MockCandidate("WSO2 Software Engineering Internship 2026",
                "https://wso2.com/careers/internships",
                "6-month paid internship in Colombo for CS undergraduates. Apply by " + t.plusDays(28) + ".",
                Kind.internship, Category.internships));
        out.add(new MockCandidate("99x Summer Internship Programme",
                "https://99x.io/internships",
                "Product engineering internship, Colombo. Applications close " + t.plusDays(42) + ".",
                Kind.internship, Category.internships));
        out.add(new MockCandidate("Google Summer of Code 2026",
                "https://summerofcode.withgoogle.com",
                "Global open-source programme, fully remote. Student applications due " + t.plusDays(60) + ".",
                Kind.internship, Category.internships));
        out.add(new MockCandidate("Helsinki Java MOOC — Free University Course",
                "https://java-programming.mooc.fi",
                "Free full Java course from the University of Helsinki. Self-paced, certificate available.",
                Kind.course, Category.courses));
        out.add(new MockCandidate("freeCodeCamp Full Stack Certification",
                "https://freecodecamp.org",
                "Free 3,000-hour curriculum. No deadline — start anytime.",
                Kind.course, Category.courses));
        out.add(new MockCandidate("SLASSCOM Women in Tech Scholarship 2026",
                "https://slasscom.lk/scholarships",
                "Scholarship for Sri Lankan women undergrads in IT. Deadline: " + t.plusDays(49) + ".",
                Kind.scholarship, Category.scholarships));
        out.add(new MockCandidate("Commonwealth Shared Scholarships 2026",
                "https://cscuk.fcdo.gov.uk",
                "Fully funded UK master's for Commonwealth students incl. Sri Lanka. Applications close " + t.plusDays(75) + ".",
                Kind.scholarship, Category.scholarships));
        return out;
    }

    /** Mock-mode stand-in for Tavily results, grouped by category. */
    public Map<Category, List<TavilyResult>> searchResultsByCategory() {
        Map<Category, List<TavilyResult>> map = new EnumMap<>(Category.class);
        for (Category c : Category.values()) map.put(c, new ArrayList<>());
        for (MockCandidate mc : candidates()) {
            map.get(mc.category()).add(new TavilyResult(mc.title(), mc.url(), mc.snippet(), null));
        }
        return map;
    }

    /** 3 sample ledger events seeded in mock mode (extension of the seen_events.json schema). */
    public List<LedgerEvent> seedLedgerEvents(String edition) {
        return List.of(
                new LedgerEvent("CodeSprint 8", "https://codesprint.lk/2025",
                        Kind.hackathon, LocalDate.now().minusDays(120),
                        "Covered last semester — national student hackathon.",
                        Enums.LedgerStatus.published, edition, "hackathons sri lanka undergraduate",
                        Enums.DeadlineConfidence.high),
                new LedgerEvent("HackX Junior 2025", "https://hackx.lk/junior",
                        Kind.hackathon, LocalDate.now().minusDays(200),
                        "Published edition 2026-W12.",
                        Enums.LedgerStatus.published, edition, "coding competitions students sri lanka",
                        Enums.DeadlineConfidence.high),
                new LedgerEvent("MegaDev Challenge 2025", "https://megadev.example.com",
                        Kind.hackathon, LocalDate.now().minusDays(90),
                        "Cut: registration had already closed when discovered.",
                        Enums.LedgerStatus.rejected, edition, "hackathons sri lanka undergraduate",
                        Enums.DeadlineConfidence.low)
        );
    }
}
