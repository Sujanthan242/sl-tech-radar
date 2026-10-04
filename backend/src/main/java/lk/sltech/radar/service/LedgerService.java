package lk.sltech.radar.service;

import lk.sltech.radar.domain.Enums;
import lk.sltech.radar.domain.Kind;
import lk.sltech.radar.repo.LedgerEventRepository;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Searchable seen-events ledger. */
@Service
public class LedgerService {

    private final LedgerEventRepository ledger;

    public LedgerService(LedgerEventRepository ledger) {
        this.ledger = ledger;
    }

    @Transactional(readOnly = true)
    public List<ApiDtos.LedgerEventDto> search(String q, String kind, String status) {
        Kind k = (kind == null || kind.isBlank()) ? null : Kind.from(kind);
        Enums.LedgerStatus s = null;
        if (status != null && !status.isBlank()) {
            try { s = Enums.LedgerStatus.valueOf(status.toLowerCase()); }
            catch (IllegalArgumentException ignored) {}
        }
        return ledger.search(q == null || q.isBlank() ? null : q, k, s).stream()
                .map(ApiDtos.LedgerEventDto::from)
                .toList();
    }
}
