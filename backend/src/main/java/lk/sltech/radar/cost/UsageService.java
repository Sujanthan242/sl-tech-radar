package lk.sltech.radar.cost;

import lk.sltech.radar.domain.ProviderUsage;
import lk.sltech.radar.repo.ProviderUsageRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.LinkedHashMap;
import java.util.Map;

/** Records per-call usage and serves monthly rollups for the cost dashboard. */
@Service
public class UsageService {

    private final ProviderUsageRepository repo;

    public UsageService(ProviderUsageRepository repo) {
        this.repo = repo;
    }

    @Transactional
    public void record(String provider, long tokensIn, long tokensOut, double costUsd) {
        repo.save(new ProviderUsage(provider, tokensIn, tokensOut, costUsd));
    }

    /** One Tavily basic search = 1 credit. */
    @Transactional
    public void recordTavilySearch() {
        repo.save(new ProviderUsage("tavily", 0, 0, 0.0));
    }

    public long tavilyCreditsUsedThisMonth() {
        return repo.countTavilySince(monthStart());
    }

    /** {month, tokensIn, tokensOut, tavilyCreditsUsed, costUsd, projectedRunway}. */
    public Map<String, Object> monthlyUsage() {
        Instant since = monthStart();
        long in = repo.sumTokensInSince(since);
        long out = repo.sumTokensOutSince(since);
        double cost = repo.sumCostSince(since);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("month", YearMonth.now(ZoneOffset.UTC).toString());
        m.put("tokensIn", in);
        m.put("tokensOut", out);
        m.put("tavilyCreditsUsed", tavilyCreditsUsedThisMonth());
        m.put("costUsd", Math.round(cost * 1_000_000.0) / 1_000_000.0);
        m.put("projectedRunway", CostEstimator.projectedRunway(cost));
        return m;
    }

    public long tokensSince(Instant since) {
        return repo.sumTokensInSince(since) + repo.sumTokensOutSince(since);
    }

    public double costSince(Instant since) {
        return repo.sumCostSince(since);
    }

    private Instant monthStart() {
        return LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant();
    }
}
