package lk.sltech.radar.tracing;

import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;
import lk.sltech.radar.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * LangSmith tracing — active only when LANGSMITH_API_KEY is present.
 * One trace per weekly run, rooted at `weekly_radar_run`, with business-
 * operation span names (discover_opportunities, deduplicate_candidates,
 * draft_section_&lt;category&gt;). Binary feedback (approve/edit/reject) is
 * attached to draft runs; rejections are appended to a LangSmith dataset for
 * the monthly prompt-tuning review. Tracing never breaks the pipeline:
 * every call is best-effort.
 */
@Service
public class TracingService {

    private static final Logger log = LoggerFactory.getLogger(TracingService.class);

    /** No-op handle used when LangSmith is not configured. */
    public record TraceHandle(String runId, boolean noop) {}

    private final ObjectMapper mapper = new ObjectMapper();
    private final String apiKey;
    private final String project;
    private final String datasetId;

    public TracingService(AppProperties props,
                          @Value("${LANGSMITH_API_KEY:}") String apiKey) {
        this.apiKey = apiKey;
        this.project = props.getLangsmith().getProject();
        this.datasetId = props.getLangsmith().getDatasetId();
    }

    public boolean isEnabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    /** Trace from the entry point down: the weekly run is the root. */
    public TraceHandle startRun(String week, String runId) {
        if (!isEnabled()) return new TraceHandle(runId, true);
        try {
            String id = postRun("weekly_radar_run", null,
                    Map.of("week", week, "runId", runId));
            return new TraceHandle(id, false);
        } catch (Exception e) {
            log.debug("LangSmith startRun failed (non-fatal): {}", e.getMessage());
            return new TraceHandle(runId, true);
        }
    }

    public TraceHandle childRun(TraceHandle parent, String operationName) {
        if (parent == null || parent.noop()) return new TraceHandle(null, true);
        try {
            String id = postRun(operationName, parent.runId(), Map.of());
            return new TraceHandle(id, false);
        } catch (Exception e) {
            log.debug("LangSmith childRun failed (non-fatal): {}", e.getMessage());
            return new TraceHandle(null, true);
        }
    }

    public void endRun(TraceHandle handle, Map<String, Object> outputs) {
        if (handle == null || handle.noop() || handle.runId() == null) return;
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("end_time", Instant.now().toString());
            body.set("outputs", mapper.valueToTree(outputs));
            client().patch().uri("/runs/{id}", handle.runId())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString()).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.debug("LangSmith endRun failed (non-fatal): {}", e.getMessage());
        }
    }

    /**
     * Binary feedback on a draft: approved=1.0, edited=0.5 (with the edit
     * captured verbatim in the comment), rejected=0.0.
     */
    public void feedback(String runId, double score, String comment) {
        if (!isEnabled() || runId == null) return;
        try {
            ObjectNode body = mapper.createObjectNode();
            body.put("key", "human_review");
            body.put("score", score);
            if (comment != null) body.put("comment", comment);
            client().post().uri("/runs/{id}/feedback", runId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString()).retrieve().toBodilessEntity();
        } catch (Exception e) {
            log.debug("LangSmith feedback failed (non-fatal): {}", e.getMessage());
        }
    }

    /** Every rejected draft + reason becomes a dataset item for prompt tuning. */
    public void appendRejectionToDataset(String draftContent, String reason, String note) {
        if (!isEnabled() || datasetId == null || datasetId.isBlank()) return;
        try {
            ObjectNode body = mapper.createObjectNode();
            body.set("inputs", mapper.createObjectNode().put("draft", draftContent));
            ObjectNode outputs = mapper.createObjectNode();
            outputs.put("rejected", true);
            outputs.put("reason", reason);
            if (note != null) outputs.put("note", note);
            body.set("outputs", outputs);
            client().post().uri("/datasets/{id}/examples", datasetId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body.toString()).retrieve().toBodilessEntity();
            log.info("Rejection appended to LangSmith dataset {}", datasetId);
        } catch (Exception e) {
            log.debug("LangSmith dataset append failed (non-fatal): {}", e.getMessage());
        }
    }

    private String postRun(String name, String parentRunId, Map<String, Object> inputs) {
        ObjectNode body = mapper.createObjectNode();
        body.put("id", UUID.randomUUID().toString());
        body.put("name", name);
        body.put("run_type", "chain");
        body.put("start_time", Instant.now().toString());
        body.put("project_name", project);
        if (parentRunId != null) body.put("parent_run_id", parentRunId);
        body.set("inputs", mapper.valueToTree(inputs));
        String raw = client().post().uri("/runs")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body.toString()).retrieve().body(String.class);
        JsonNodeHolder h = new JsonNodeHolder(raw);
        return h.id();
    }

    private RestClient client() {
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofMillis(5_000));
        rf.setReadTimeout(Duration.ofMillis(10_000));
        return RestClient.builder()
                .baseUrl("https://api.smith.langchain.com")
                .defaultHeader("x-api-key", apiKey)
                .requestFactory(rf).build();
    }

    private class JsonNodeHolder {
        private final String raw;
        JsonNodeHolder(String raw) { this.raw = raw; }
        String id() {
            try { return mapper.readTree(raw).path("id").asText(null); }
            catch (Exception e) { return null; }
        }
    }
}
