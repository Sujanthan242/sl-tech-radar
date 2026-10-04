package lk.sltech.radar.repo;

import lk.sltech.radar.domain.DraftSection;
import lk.sltech.radar.domain.Enums;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DraftSectionRepository extends JpaRepository<DraftSection, String> {
    List<DraftSection> findByEditionWeek(String week);
    List<DraftSection> findByEditionId(String editionId);
    Optional<DraftSection> findFirstByCacheKey(String cacheKey);
    long countByEditionIdAndStatus(String editionId, Enums.DraftStatus status);
}
