package lk.sltech.radar.repo;

import lk.sltech.radar.domain.Edition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EditionRepository extends JpaRepository<Edition, String> {
    Optional<Edition> findByWeek(String week);
}
