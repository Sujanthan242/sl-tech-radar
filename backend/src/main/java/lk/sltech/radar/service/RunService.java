package lk.sltech.radar.service;

import tools.jackson.databind.ObjectMapper;
import lk.sltech.radar.domain.Edition;
import lk.sltech.radar.domain.RadarRun;
import lk.sltech.radar.pipeline.RadarPipelineService;
import lk.sltech.radar.repo.CandidateRepository;
import lk.sltech.radar.repo.EditionRepository;
import lk.sltech.radar.repo.RadarRunRepository;
import lk.sltech.radar.search.TavilyClient;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Starts async radar runs and serves their status/candidates. */
@Service
public class RunService {

    private final EditionRepository editions;
    private final RadarRunRepository runs;
    private final CandidateRepository candidates;
    private final RadarPipelineService pipeline;
    private final ObjectMapper mapper = new ObjectMapper();

    public RunService(EditionRepository editions, RadarRunRepository runs,
                      CandidateRepository candidates, RadarPipelineService pipeline) {
        this.editions = editions;
        this.runs = runs;
        this.candidates = candidates;
        this.pipeline = pipeline;
    }

    /**
     * Creates the edition + run rows (each save commits immediately) and then
     * launches the async pipeline — no transaction spans the handoff, so the
     * worker thread always sees committed rows.
     */
    public ApiDtos.StartRunResponse startRun() {
        String week = TavilyClient.currentWeek();
        Edition edition = editions.findByWeek(week).orElseGet(() -> editions.save(new Edition(week)));
        RadarRun run = runs.save(new RadarRun(edition));
        pipeline.runPipeline(run.getId());
        return new ApiDtos.StartRunResponse(run.getId(), week);
    }

    @Transactional(readOnly = true)
    public ApiDtos.RunResponse getRun(String runId) {
        RadarRun run = runs.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown run: " + runId));
        Map<String, Integer> stats = new LinkedHashMap<>();
        try {
            Map<?, ?> parsed = mapper.readValue(run.getStatsJson(), Map.class);
            parsed.forEach((k, v) -> stats.put(String.valueOf(k),
                    v instanceof Number n ? n.intValue() : 0));
        } catch (Exception ignored) {}
        stats.putIfAbsent("candidatesFound", 0);
        stats.putIfAbsent("netNew", 0);
        stats.putIfAbsent("draftsReady", 0);
        return new ApiDtos.RunResponse(run.getId(), run.getEdition().getWeek(),
                run.getStatus().name(), run.getProgress(),
                run.getStartedAt(), run.getFinishedAt(), stats);
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.CandidateDto> candidates(String runId) {
        RadarRun run = runs.findById(runId)
                .orElseThrow(() -> new IllegalArgumentException("Unknown run: " + runId));
        return candidates.findByEditionId(run.getEdition().getId()).stream()
                .map(ApiDtos.CandidateDto::from)
                .toList();
    }
}
