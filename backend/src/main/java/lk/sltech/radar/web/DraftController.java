package lk.sltech.radar.web;

import lk.sltech.radar.service.DraftWorkflowService;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/drafts")
public class DraftController {

    private final DraftWorkflowService drafts;

    public DraftController(DraftWorkflowService drafts) {
        this.drafts = drafts;
    }

    @PostMapping("/generate")
    public Map<String, List<ApiDtos.DraftRef>> generate(@RequestBody ApiDtos.GenerateDraftsRequest req) {
        if (req.runId() == null || req.runId().isBlank())
            throw new IllegalArgumentException("runId is required");
        if (req.categories() == null || req.categories().isEmpty())
            throw new IllegalArgumentException("categories is required");
        return Map.of("drafts", drafts.generateForRun(req.runId(), req.categories()));
    }

    @GetMapping
    public Map<String, List<ApiDtos.DraftSectionDto>> list(@RequestParam String edition) {
        return Map.of("drafts", drafts.listByEdition(edition));
    }

    /** Inline edit — status becomes `edited`. */
    @PutMapping("/{id}")
    public ApiDtos.DraftSectionDto update(@PathVariable String id,
                                          @RequestBody ApiDtos.UpdateDraftRequest req) {
        if (req.contentMd() == null) throw new IllegalArgumentException("contentMd is required");
        return drafts.update(id, req.contentMd());
    }

    @PostMapping("/{id}/approve")
    public ApiDtos.IdStatus approve(@PathVariable String id) {
        return drafts.approve(id);
    }

    @PostMapping("/{id}/reject")
    public ApiDtos.IdStatus reject(@PathVariable String id,
                                   @RequestBody ApiDtos.RejectRequest req) {
        if (req.reason() == null || req.reason().isBlank())
            throw new IllegalArgumentException("reason is required");
        return drafts.reject(id, req.reason(), req.note());
    }

    /** New draft (new id); the old one is kept for diffing. */
    @PostMapping("/{id}/regenerate")
    public ApiDtos.DraftSectionDto regenerate(@PathVariable String id,
                                              @RequestBody(required = false) ApiDtos.RegenerateRequest req) {
        return drafts.regenerate(id, req == null ? null : req.feedback());
    }
}
