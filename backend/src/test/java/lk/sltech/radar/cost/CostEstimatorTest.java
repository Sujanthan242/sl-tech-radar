package lk.sltech.radar.cost;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CostEstimatorTest {

    @Test
    void nebiusWeeklyRun_costsAboutTwoTenthsOfACent() {
        // One weekly run ≈ 8k in + 3k out on Llama 3.3 70B.
        double cost = CostEstimator.estimate("nebius", 8_000, 3_000);
        assertEquals(0.00224, cost, 1e-9);
    }

    @Test
    void freeProviders_costZero() {
        assertEquals(0.0, CostEstimator.estimate("groq", 100_000, 50_000), 1e-12);
        assertEquals(0.0, CostEstimator.estimate("template", 1_000, 1_000), 1e-12);
        assertEquals(0.0, CostEstimator.estimate("ollama", 1_000, 1_000), 1e-12);
    }

    @Test
    void fiftyDollarsCoversAWeeklyRunway_beyond100Years() {
        // $0.00224/week * 52 ≈ $0.116/year -> $50 ≈ 429 years -> capped "100+ years".
        double annualCost = 0.00224 * 52;
        assertEquals("100+ years", CostEstimator.projectedRunway(annualCost / 12));
    }

    @Test
    void zeroMonthlyCost_isInfiniteRunway() {
        assertEquals("100+ years", CostEstimator.projectedRunway(0.0));
    }

    @Test
    void moderateCost_formatsYears() {
        assertEquals("4 years", CostEstimator.projectedRunway(1.0)); // 50/12 ≈ 4.17
    }

    @Test
    void subYearRunway_formatsMonths() {
        // $5/month -> $60/yr -> 50/60 ≈ 0.83 yr ≈ 10 months.
        assertEquals("10 months", CostEstimator.projectedRunway(5.0));
    }
}
