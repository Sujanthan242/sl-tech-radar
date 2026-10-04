package lk.sltech.radar.web;

import lk.sltech.radar.service.EditionService;
import lk.sltech.radar.service.LedgerService;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class ArchiveController {

    private final EditionService editions;
    private final LedgerService ledger;

    public ArchiveController(EditionService editions, LedgerService ledger) {
        this.editions = editions;
        this.ledger = ledger;
    }

    @GetMapping("/api/editions")
    public Map<String, List<ApiDtos.EditionDto>> editions() {
        return Map.of("editions", editions.list());
    }

    @PostMapping("/api/editions/{id}/export")
    public ApiDtos.ExportResponse export(@PathVariable String id) {
        return editions.exportMarkdown(id);
    }

    @GetMapping("/api/ledger")
    public Map<String, List<ApiDtos.LedgerEventDto>> ledger(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String kind,
            @RequestParam(required = false) String status) {
        return Map.of("events", ledger.search(q, kind, status));
    }
}
