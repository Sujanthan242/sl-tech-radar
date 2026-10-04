package lk.sltech.radar.repo;

import lk.sltech.radar.domain.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CandidateRepository extends JpaRepository<Candidate, String> {
    List<Candidate> findByEditionId(String editionId);
    Optional<Candidate> findByUrl(String url);
    long countByEditionId(String editionId);
}
