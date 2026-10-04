package lk.sltech.radar;

import lk.sltech.radar.ai.FallbackAiService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Boots the full application context on the dev (H2) profile with no keys:
 * proves wiring is sound and the app lands in mock mode (template active).
 */
@SpringBootTest
@ActiveProfiles("dev")
class SlTechRadarApplicationTests {

    @Autowired
    private FallbackAiService chain;

    @Test
    void contextLoads_chainFallsBackToTemplateWithNoKeys() {
        var status = chain.chainStatus();
        assertFalse(status.isEmpty());
        // Template must always be the last resort and report available.
        var last = status.get(status.size() - 1);
        assertEquals("template", last.get("name"));
        assertEquals("active", last.get("status"));
    }
}
