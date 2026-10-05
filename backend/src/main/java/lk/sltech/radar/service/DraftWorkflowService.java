package lk.sltech.radar.service;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lk.sltech.radar.domain.*;
import lk.sltech.radar.pipeline.DraftService;
import lk.sltech.radar.ai.TemplateProvider;
import lk.sltech.radar.ai.TemplateProvider;
import lk.sltech.radar.repo.*;
import lk.sltech.radar.tracing.TracingService;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/** Review-queue operations: generate / edit / approve / reject / regenerate. */
@Service
public class DraftWorkflowService {

    private static final Map<Category, Kind> CATEGORY_KIND = Map.of(
            Category.hackathons, Kind.hackathon,
            Category.internships, Kind.internship,
            Category.courses, Kind.course,
            Category.scholarships, Kind.scholarship);

    private final DraftSectionRepository drafts;
    private final EditionRepository editions;
    private final CandidateRepository candidates;
    private final RadarRunRepository runs;
    private final LedgerEventRepository ledger;
    private final DraftService draftService;
    private final TracingService tracing;
    private final ObjectMapper mapper = new ObjectMapper();

    public DraftWorkflowService(DraftSectionRepository drafts, EditionRepository editions,
                                CandidateRepository candidates, RadarRunRepository runs,
                                LedgerEventRepository ledger, DraftService draftService,
                                TracingService tracing) {
        this.drafts = drafts; this.editions = editions; this.candidates = candidates;
        this.runs = runs; this.ledger = ledger; this.draftService = draftService;
        this.tracing = tracing;
    }

    @Transactional
    public List<ApiDtos.DraftRef> generateForRun(String runId, List<String> categoryNames) {
        RadarRun run = runs.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown run: " + runId));
        Edition edition = run.getEdition();
        List<ApiDtos.DraftRef> out = new ArrayList<>();
        for (String name : categoryNames) {
            Category cat = Category.from(name);
            List<Candidate> items = candidates.findByEditionId(edition.getId()).stream()
                    .filter(c -> CATEGORY_KIND.get(cat) == c.getKind())
                    .filter(c -> c.getDedupStatus() != Enums.DedupStatus.SEEN)
                    .toList();
DraftSection d = draftService.generateDraft(edition, cat, items, null, null);
            if (d == null) continue; // no candidates — no placeholder draft saved
            out.add(new ApiDtos.DraftRef(d.getId(), d.getCategory().name(), d.getStatus().name()));
        }
        return out;
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.DraftSectionDto> listByEdition(String week) {
        return drafts.findByEditionWeek(week).stream()
                .filter(d -> !isPlaceholder(d))
                .sorted(Comparator.comparing(d -> d.getCategory().name()))
                .map(ApiDtos.DraftSectionDto::from)
                .toList();
    }

    @Transactional
/**
     * Placeholder drafts (generated when the pipeline had zero candidates)
     * are hidden from the review queue so it shows an honest empty state.
     * The rows stay in the DB for audit purposes.
     */
    private boolean isPlaceholder(DraftSection d) {
        String md = d.getContentMd();
        return md != null && md.contains(TemplateProvider.EMPTY_MARKER);
    }

    public ApiDtos.DraftSectionDto update(String id, String contentMd) {
        DraftSection d = get(id);
        d.setContentMd(contentMd);
        d.setStatus(Enums.DraftStatus.edited);
        // Edit captured verbatim as partial-positive feedback for prompt tuning.
        tracing.feedback(d.getTraceRunId(), 0.5, "human edit: " + contentMd);
        return ApiDtos.DraftSectionDto.from(d);
    }

    @Transactional
    public ApiDtos.IdStatus approve(String id) {
        DraftSection d = get(id);
        d.setStatus(Enums.DraftStatus.approved);
        tracing.feedback(d.getTraceRunId(), 1.0, null);
        markLedger(d, Enums.LedgerStatus.approved, null);
        return new ApiDtos.IdStatus(d.getId(), d.getStatus().name());
    }

    @Transactional
    public ApiDtos.IdStatus reject(String id, String reason, String note) {
        DraftSection d = get(id);
        d.setStatus(Enums.DraftStatus.rejected);
        String rr = reason + (note == null || note.isBlank() ? "" : " — " + note);
        d.setRejectionReason(rr);
        tracing.feedback(d.getTraceRunId(), 0.0, "rejected: " + rr);
        tracing.appendRejectionToDataset(d.getContentMd(), reason, note);
        markLedger(d, Enums.LedgerStatus.rejected, rr);
        return new ApiDtos.IdStatus(d.getId(), d.getStatus().name());
    }

    @Transactional
    public ApiDtos.DraftSectionDto regenerate(String id, String feedback) {
        DraftSection old = get(id);
        List<Candidate> items = candidates.findByEditionId(old.getEdition().getId()).stream()
                .filter(c -> CATEGORY_KIND.get(old.getCategory()) == c.getKind())
                .filter(c -> c.getDedupStatus() != Enums.DedupStatus.SEEN)
                .toList();
        // Feedback changes the content key -> brand-new draft; the old row is kept for diffing.
        DraftSection fresh = draftService.generateDraft(
                old.getEdition(), old.getCategory(), items, feedback, null);
        if (fresh == null)
            throw new IllegalArgumentException("No candidates to regenerate from for " + old.getCategory());
        return ApiDtos.DraftSectionDto.from(fresh);
    }

    private DraftSection get(String id) {
        return drafts.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Unknown draft: " + id));
    }

    /** Syncs the ledger entries cited by a draft with the human's verdict. */
    private void markLedger(DraftSection d, Enums.LedgerStatus status, String reason) {
        try {
            JsonNode arr = mapper.readTree(d.getSourcesJson() == null ? "[]" : d.getSourcesJson());
            for (JsonNode n : arr) {
                String url = n.path("url").asText("");
                if (url.isBlank()) continue;
                for (LedgerEvent e : ledger.findByUrl(url)) {
                    e.setStatus(status);
                    if (reason != null) e.setRejectionReason(reason);
                    ledger.save(e);
                }
            }
        } catch (Exception ignored) {}
    }
}
