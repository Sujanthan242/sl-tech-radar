package lk.sltech.radar.web.dto;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lk.sltech.radar.domain.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** API response shapes — exactly per API_CONTRACT.md. */
public final class ApiDtos {
    private ApiDtos() {}
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public record StartRunResponse(String runId, String edition) {}
    public record IdStatus(String id, String status) {}

    public record RunResponse(String runId, String edition, String status, int progress,
                              Instant startedAt, Instant finishedAt,
                              Map<String, Integer> stats) {}

    public record CandidateDto(String id, String title, String url, LocalDate deadline,
                               String deadlineConfidence, String kind, String snippet,
                               String sourceQuery, String dedupStatus) {
        public static CandidateDto from(Candidate c) {
            return new CandidateDto(c.getId(), c.getTitle(), c.getUrl(), c.getDeadline(),
                    c.getDeadlineConfidence() == null ? "low" : c.getDeadlineConfidence().name(),
                    c.getKind() == null ? null : c.getKind().name(),
                    c.getSnippet(), c.getSourceQuery(), c.getDedupStatus().name());
        }
    }

    public record DraftRef(String id, String category, String status) {}
    public record SourceRef(String title, String url) {}

    public record DraftSectionDto(String id, String edition, String category, String contentMd,
                                  String status, String rejectionReason, long tokensUsed,
                                  String modelUsed, List<SourceRef> sources,
                                  Instant createdAt, Instant updatedAt) {
        public static DraftSectionDto from(DraftSection d) {
            List<SourceRef> sources = new ArrayList<>();
            try {
                JsonNode arr = MAPPER.readTree(d.getSourcesJson() == null ? "[]" : d.getSourcesJson());
                for (JsonNode n : arr) {
                    sources.add(new SourceRef(n.path("title").asText(""), n.path("url").asText("")));
                }
            } catch (Exception ignored) {}
            return new DraftSectionDto(d.getId(), d.getEdition().getWeek(), d.getCategory().name(),
                    d.getContentMd(), d.getStatus().name(), d.getRejectionReason(),
                    d.getTokensUsed(), d.getModelUsed(), sources,
                    d.getCreatedAt(), d.getUpdatedAt());
        }
    }

    public record EditionDto(String id, String week, String status, Map<String, Object> stats,
                             Instant createdAt) {}

    public record LedgerEventDto(String id, String name, String url, String kind,
                                 LocalDate registrationDeadline, String notes, String status,
                                 String edition, Instant firstSeen) {
        public static LedgerEventDto from(LedgerEvent e) {
            return new LedgerEventDto(e.getId(), e.getName(), e.getUrl(),
                    e.getKind() == null ? null : e.getKind().name(),
                    e.getRegistrationDeadline(), e.getNotes(), e.getStatus().name(),
                    e.getEdition(), e.getFirstSeen());
        }
    }

    public record ProviderStatusResponse(List<Map<String, Object>> chain, Map<String, Object> usage) {}
    public record ExportResponse(String markdown) {}

    // ---- request bodies ----
    public record GenerateDraftsRequest(String runId, List<String> categories) {}
    public record UpdateDraftRequest(String contentMd) {}
    public record RejectRequest(String reason, String note) {}
    public record RegenerateRequest(String feedback) {}
}
