package lk.sltech.radar.repo;

import lk.sltech.radar.domain.ProviderUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;

public interface ProviderUsageRepository extends JpaRepository<ProviderUsage, String> {
    @Query("select coalesce(sum(u.tokensIn), 0) from ProviderUsage u where u.createdAt >= :since")
    long sumTokensInSince(@Param("since") Instant since);

    @Query("select coalesce(sum(u.tokensOut), 0) from ProviderUsage u where u.createdAt >= :since")
    long sumTokensOutSince(@Param("since") Instant since);

    @Query("select coalesce(sum(u.costUsd), 0.0) from ProviderUsage u where u.createdAt >= :since")
    double sumCostSince(@Param("since") Instant since);

    @Query("select count(u) from ProviderUsage u where u.provider = 'tavily' and u.createdAt >= :since")
    long countTavilySince(@Param("since") Instant since);
}
