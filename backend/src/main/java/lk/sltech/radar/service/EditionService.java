package lk.sltech.radar.service;

import lk.sltech.radar.domain.Category;
import lk.sltech.radar.domain.DraftSection;
import lk.sltech.radar.domain.Edition;
import lk.sltech.radar.domain.Enums;
import lk.sltech.radar.repo.*;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/** Editions archive + Substack markdown export. */
@Service
public class EditionService {

    private final EditionRepository editions;
    private final CandidateRepository candidates;
    private final DraftSectionRepository drafts;
    private final ProviderUsageRepository usage;

    public EditionService(EditionRepository editions, CandidateRepository candidates,
                          DraftSectionRepository drafts, ProviderUsageRepository usage) {
        this.editions = editions;
        this.candidates = candidates;
        this.drafts = drafts;
        this.usage = usage;
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.EditionDto> list() {
        List<Edition> all = editions.findAll();
        all.sort(Comparator.comparing(Edition::getCreatedAt).reversed());
        return all.stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public ApiDtos.ExportResponse exportMarkdown(String editionId) {
        Edition edition = editions.findById(editionId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown edition: " + editionId));
        List<DraftSection> sections = drafts.findByEditionId(editionId);

        StringBuilder md = new StringBuilder();
        md.append("# SL Tech Students Weekly — ").append(edition.getWeek()).append("\n\n");
        md.append("*Curated for Sri Lankan tech undergrads. Never miss a deadline that matters.*\n\n");

        // One active draft per category: a regenerated draft supersedes the older
        // one (which is kept in the review queue for diffing, but not exported).
        Map<Category, DraftSection> latestByCategory = new EnumMap<>(Category.class);
        for (DraftSection d : sections) {
            DraftSection cur = latestByCategory.get(d.getCategory());
            if (cur == null || d.getCreatedAt().isAfter(cur.getCreatedAt())) {
                latestByCategory.put(d.getCategory(), d);
            }
        }

        List<DraftSection> shippable = latestByCategory.values().stream()
                .filter(d -> d.getStatus() == Enums.DraftStatus.approved
                        || d.getStatus() == Enums.DraftStatus.edited
                        || d.getStatus() == Enums.DraftStatus.draft)
                .sorted(Comparator.comparing(d -> d.getCategory().name()))
                .toList();
        for (DraftSection d : shippable) {
            md.append(d.getContentMd() == null ? "" : d.getContentMd()).append("\n\n---\n\n");
        }

        List<DraftSection> cut = latestByCategory.values().stream()
                .filter(d -> d.getStatus() == Enums.DraftStatus.rejected)
                .toList();
        if (!cut.isEmpty()) {
            md.append("## Cut this week\n\n");
            for (DraftSection d : cut) {
                md.append("- ").append(d.getCategory().name()).append(": ")
                  .append(d.getRejectionReason() == null ? "rejected" : d.getRejectionReason())
                  .append("\n");
            }
            md.append("\n");
        }
        md.append("_Generated with SL Tech Radar._\n");
        return new ApiDtos.ExportResponse(md.toString());
    }

    private ApiDtos.EditionDto toDto(Edition e) {
        long found = candidates.countByEditionId(e.getId());
        long approved = drafts.countByEditionIdAndStatus(e.getId(), Enums.DraftStatus.approved)
                + drafts.countByEditionIdAndStatus(e.getId(), Enums.DraftStatus.edited);
        long rejected = drafts.countByEditionIdAndStatus(e.getId(), Enums.DraftStatus.rejected);
        long tokens = usage.sumTokensInSince(e.getCreatedAt()) + usage.sumTokensOutSince(e.getCreatedAt());
        double cost = usage.sumCostSince(e.getCreatedAt());

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("found", found);
        stats.put("approved", approved);
        stats.put("rejected", rejected);
        stats.put("tokensUsed", tokens);
        stats.put("costUsd", Math.round(cost * 1_000_000.0) / 1_000_000.0);
        return new ApiDtos.EditionDto(e.getId(), e.getWeek(), e.getStatus().name(), stats, e.getCreatedAt());
    }
}
