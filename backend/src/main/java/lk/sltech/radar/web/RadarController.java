package lk.sltech.radar.web;

import lk.sltech.radar.service.RunService;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/radar/runs")
public class RadarController {

    private final RunService runs;

    public RadarController(RunService runs) {
        this.runs = runs;
    }

    /** Starts the async Saturday pipeline. 202 Accepted per contract. */
    @PostMapping
    public ResponseEntity<ApiDtos.StartRunResponse> startRun() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(runs.startRun());
    }

    @GetMapping("/{runId}")
    public ApiDtos.RunResponse getRun(@PathVariable String runId) {
        return runs.getRun(runId);
    }

    @GetMapping("/{runId}/candidates")
    public Map<String, List<ApiDtos.CandidateDto>> candidates(@PathVariable String runId) {
        return Map.of("candidates", runs.candidates(runId));
    }
}
