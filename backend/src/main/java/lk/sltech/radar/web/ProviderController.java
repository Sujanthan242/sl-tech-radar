package lk.sltech.radar.web;

import lk.sltech.radar.ai.FallbackAiService;
import lk.sltech.radar.cost.UsageService;
import lk.sltech.radar.web.dto.ApiDtos;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

/** Provider health, monthly usage/cost, and the chaos-test button. */
@RestController
@RequestMapping("/api/providers")
public class ProviderController {

    private final FallbackAiService chain;
    private final UsageService usage;

    public ProviderController(FallbackAiService chain, UsageService usage) {
        this.chain = chain;
        this.usage = usage;
    }

    @GetMapping("/status")
    public ApiDtos.ProviderStatusResponse status() {
        return new ApiDtos.ProviderStatusResponse(chain.chainStatus(), usage.monthlyUsage());
    }

    /**
     * Chaos button: simulates a Nebius outage and verifies the chain still
     * serves from the next available provider. Returns who actually served.
     */
    @GetMapping("/fallback-test")
    public Map<String, Object> fallbackTest(
            @RequestParam(defaultValue = "nebius") String simulateDown) {
        return chain.fallbackTest(Set.of(simulateDown.split(",")));
    }
}
