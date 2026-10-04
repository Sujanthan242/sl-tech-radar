package lk.sltech.radar.repo;

import lk.sltech.radar.domain.Enums;
import lk.sltech.radar.domain.Kind;
import lk.sltech.radar.domain.LedgerEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LedgerEventRepository extends JpaRepository<LedgerEvent, String> {
    @Query("select e from LedgerEvent e where " +
           "(:q is null or lower(e.name) like lower(concat('%',:q,'%')) or lower(e.notes) like lower(concat('%',:q,'%'))) " +
           "and (:kind is null or e.kind = :kind) " +
           "and (:status is null or e.status = :status) " +
           "order by e.firstSeen desc")
    List<LedgerEvent> search(@Param("q") String q,
                             @Param("kind") Kind kind,
                             @Param("status") Enums.LedgerStatus status);

    List<LedgerEvent> findByUrl(String url);
}
