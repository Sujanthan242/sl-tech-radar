package lk.sltech.radar.pipeline;

import lk.sltech.radar.ai.FallbackAiService;
import lk.sltech.radar.config.AppProperties;
import lk.sltech.radar.domain.Edition;
import lk.sltech.radar.domain.Enums;
import lk.sltech.radar.domain.LedgerEvent;
import lk.sltech.radar.repo.EditionRepository;
import lk.sltech.radar.repo.LedgerEventRepository;
import lk.sltech.radar.search.TavilyClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Seeds the dedup ledger with 3 sample events when the app starts in mock
 * mode (no real AI provider keys configured). Makes every endpoint demoable
 * out of the box with zero keys.
 */
@Component
public class MockDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(MockDataSeeder.class);

    private final AppProperties props;
    private final FallbackAiService chain;
    private final LedgerEventRepository ledger;
    private final EditionRepository editions;
    private final MockDataService mockData;

    public MockDataSeeder(AppProperties props, FallbackAiService chain,
                          LedgerEventRepository ledger, EditionRepository editions,
                          MockDataService mockData) {
        this.props = props;
        this.chain = chain;
        this.ledger = ledger;
        this.editions = editions;
        this.mockData = mockData;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        boolean mockMode = props.getMock().isEnabled() && !chain.anyRealProviderAvailable();
        if (!mockMode) {
            log.info("Real provider keys detected — skipping mock seed");
            return;
        }
        String week = TavilyClient.currentWeek();
        if (ledger.count() == 0) {
            List<LedgerEvent> seeds = mockData.seedLedgerEvents(week);
            // The rejected sample carries its reason, like a real review-queue rejection.
            seeds.stream()
                    .filter(e -> e.getStatus() == Enums.LedgerStatus.rejected)
                    .forEach(e -> e.setRejectionReason("deadline passed — discovered after close"));
            ledger.saveAll(seeds);
            log.info("Mock mode: seeded {} ledger events", seeds.size());
        }
        editions.findByWeek(week).orElseGet(() -> {
            Edition e = new Edition(week);
            log.info("Mock mode: created edition {}", week);
            return editions.save(e);
        });
    }
}
