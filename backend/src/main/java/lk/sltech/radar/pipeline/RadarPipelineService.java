package lk.sltech.radar.pipeline;

import tools.jackson.databind.ObjectMapper;
import lk.sltech.radar.domain.*;
import lk.sltech.radar.repo.*;
import lk.sltech.radar.search.TavilyClient;
import lk.sltech.radar.search.TavilyResult;
import lk.sltech.radar.tracing.TracingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * The Saturday pipeline, run asynchronously:
 * DISCOVER (Tavily) → NORMALIZE → DEDUP → GRADE → DRAFT (one structured call
 * per category) → IN_REVIEW. Progress 0-100 is persisted on the RadarRun row
 * so GET /api/radar/runs/{runId} can poll it.
 */
@Service
public class RadarPipelineService {

    private static final Logger log = LoggerFactory.getLogger(RadarPipelineService.class);

    /** Per-category discovery queries (brief §2-3). 2-3 queries × 4 categories ≈ 10-12 Tavily calls. */
    private static final Map<Category, List<String>> QUERIES = Map.of(
            Category.hackathons, List.of(
                    "hackathons sri lanka undergraduate 2026",
                    "coding competitions students sri lanka",
                    "hackathon registration open students asia 2026"),
            Category.internships, List.of(
                    "software engineering internships sri lanka students",
                    "tech internships colombo undergraduates 2026"),
            Category.courses, List.of(
                    "free programming courses students 2026",
                    "free tech certifications students online"),
            Category.scholarships, List.of(
                    "scholarships sri lanka tech students 2026",
                    "undergraduate scholarships software engineering asia"));

    private static final Map<Category, Kind> CATEGORY_KIND = Map.of(
            Category.hackathons, Kind.hackathon,
            Category.internships, Kind.internship,
            Category.courses, Kind.course,
            Category.scholarships, Kind.scholarship);

    private final RadarRunRepository runs;
    private final EditionRepository editions;
    private final CandidateRepository candidates;
    private final LedgerEventRepository ledger;
    private final DraftSectionRepository draftSections;
    private final TavilyClient tavily;
    private final MockDataService mockData;
    private final DedupService dedup;
    private final DeadlineExtractor deadlineExtractor;
    private final EligibilityGrader grader;
    private final DraftService draftService;
    private final TracingService tracing;
    private final ObjectMapper mapper = new ObjectMapper();

    public RadarPipelineService(RadarRunRepository runs, EditionRepository editions,
                                CandidateRepository candidates, LedgerEventRepository ledger,
                                DraftSectionRepository draftSections, TavilyClient tavily,
                                MockDataService mockData, DedupService dedup,
                                DeadlineExtractor deadlineExtractor, EligibilityGrader grader,
                                DraftService draftService, TracingService tracing) {
        this.runs = runs; this.editions = editions; this.candidates = candidates;
        this.ledger = ledger; this.draftSections = draftSections; this.tavily = tavily;
        this.mockData = mockData; this.dedup = dedup; this.deadlineExtractor = deadlineExtractor;
        this.grader = grader; this.draftService = draftService; this.tracing = tracing;
    }

    @Async("pipelineExecutor")
    public void runPipeline(String runId) {
        RadarRun run = runs.findById(runId).orElseThrow();
        Edition edition = run.getEdition();
        String week = edition.getWeek();
        TracingService.TraceHandle trace = tracing.startRun(week, runId);
        try {
            update(run, Enums.RunStatus.running, 2);

            // ---- DISCOVER -------------------------------------------------
            TracingService.TraceHandle discover = tracing.childRun(trace, "discover_opportunities");
            Map<Category, List<TavilyResult>> byCategory = new EnumMap<>(Category.class);
            boolean useMock = !tavily.isAvailable();
            if (useMock) {
                log.info("Tavily unavailable — mock discovery for run {}", runId);
                byCategory.putAll(mockData.searchResultsByCategory());
            } else {
                int done = 0, total = QUERIES.values().stream().mapToInt(List::size).sum();
                for (var e : QUERIES.entrySet()) {
                    List<TavilyResult> acc = byCategory.computeIfAbsent(e.getKey(), k -> new ArrayList<>());
                    for (String q : e.getValue()) {
                        try {
                            acc.addAll(tavily.search(q, week));
                        } catch (Exception ex) {
                            log.warn("Query failed, continuing: {}", q);
                        }
                        update(run, Enums.RunStatus.running, 2 + (int) (38.0 * ++done / total));
                    }
                }
            }
            int found = byCategory.values().stream().mapToInt(List::size).sum();
            tracing.endRun(discover, Map.of("candidatesFound", found, "mock", useMock));
            update(run, Enums.RunStatus.running, 42);

            // ---- NORMALIZE + DEDUP + GRADE --------------------------------
            TracingService.TraceHandle dedupSpan = tracing.childRun(trace, "deduplicate_candidates");
            List<String> ledgerUrls = ledger.findAll().stream()
                    .map(LedgerEvent::getUrl).filter(Objects::nonNull).toList();
            List<String> ledgerNames = ledger.findAll().stream()
                    .map(LedgerEvent::getName).filter(Objects::nonNull).toList();
            Set<String> seenThisRun = new HashSet<>();
            int netNew = 0, ledgerHits = 0;
            Map<Category, List<Candidate>> freshByCategory = new EnumMap<>(Category.class);

            for (var e : byCategory.entrySet()) {
                Category cat = e.getKey();
                for (TavilyResult r : e.getValue()) {
                    if (r.url() == null || r.url().isBlank()) continue;
                    String norm = DedupService.normalizeUrl(r.url());
                    if (!seenThisRun.add(norm)) continue; // same URL twice in one run

                    var verdict = dedup.check(r.title(), r.url(), ledgerUrls, ledgerNames);
                    var guess = deadlineExtractor.extract(r.title(), r.content());
                    Enums.DedupStatus status = verdict.status();
                    if (status == Enums.DedupStatus.NEW) {
                        status = grader.grade(r.title(), r.content(), guess.date(), guess.confidence());
                    } else {
                        ledgerHits++;
                    }
                    if (status == Enums.DedupStatus.NEW) netNew++;

                    try {
                        Candidate c = new Candidate(edition, r.title(), r.url(),
                                guess.date(), guess.confidence(), CATEGORY_KIND.get(cat),
                                r.content(), e.getKey().name(), status);
                        candidates.save(c);
                        if (status != Enums.DedupStatus.SEEN) {
                            freshByCategory.computeIfAbsent(cat, k -> new ArrayList<>()).add(c);
                            ledger.save(new LedgerEvent(r.title(), r.url(), CATEGORY_KIND.get(cat),
                                    guess.date(), r.content(), Enums.LedgerStatus.candidate,
                                    week, cat.name(), guess.confidence()));
                        }
                    } catch (Exception ex) {
                        log.debug("Candidate already stored (UNIQUE url): {}", r.url());
                    }
                }
            }
            tracing.endRun(dedupSpan, Map.of("ledgerHits", ledgerHits, "netNew", netNew));
            update(run, Enums.RunStatus.running, 60);

            // ---- DRAFT (one structured call per category) ------------------
            int drafted = 0;
            List<Category> cats = new ArrayList<>(freshByCategory.keySet());
            // Draft even empty categories in mock mode so the review queue is never bare.
            if (useMock) for (Category c : Category.values()) cats.add(c);
            cats = cats.stream().distinct().toList();
            for (int i = 0; i < cats.size(); i++) {
                Category cat = cats.get(i);
                TracingService.TraceHandle ds = tracing.childRun(trace, "draft_section_" + cat.name());
                try {
                    List<Candidate> items = freshByCategory.getOrDefault(cat, List.of());
                    draftService.generateDraft(edition, cat, items, null, ds.runId());
                    drafted++;
                    tracing.endRun(ds, Map.of("category", cat.name(), "items", items.size()));
                } catch (Exception ex) {
                    tracing.endRun(ds, Map.of("category", cat.name(), "error", ex.getMessage()));
                    log.warn("Draft failed for {}: {}", cat, ex.getMessage());
                }
                update(run, Enums.RunStatus.drafting, 60 + (int) (35.0 * (i + 1) / Math.max(1, cats.size())));
            }

            edition.setStatus(Enums.EditionStatus.in_review);
            editions.save(edition);
            update(run, Enums.RunStatus.in_review, 100);
            run.setStatsJson(mapper.writeValueAsString(Map.of(
                    "candidatesFound", found, "netNew", netNew, "draftsReady", drafted)));
            run.setFinishedAt(java.time.Instant.now());
            runs.save(run);
            tracing.endRun(trace, Map.of("edition", week, "draftsReady", drafted));
            log.info("Run {} finished: {} found, {} net-new, {} drafts", runId, found, netNew, drafted);
        } catch (Exception e) {
            log.error("Pipeline run {} failed", runId, e);
            run.setStatus(Enums.RunStatus.failed);
            run.setError(e.getMessage());
            run.setFinishedAt(java.time.Instant.now());
            runs.save(run);
            tracing.endRun(trace, Map.of("error", String.valueOf(e.getMessage())));
        }
    }

    private void update(RadarRun run, Enums.RunStatus status, int progress) {
        run.setStatus(status);
        run.setProgress(progress);
        runs.save(run);
    }
}
