package lk.sltech.radar.cost;

import java.util.Map;

/**
 * Token-cost math per provider, from the research brief's verified pricing.
 * <ul>
 *   <li>Nebius TF Llama 3.3 70B Instruct: $0.13 / $0.40 per 1M tokens (in/out)</li>
 *   <li>Groq / Gemini Flash-Lite free tiers, local Ollama, template mode: $0</li>
 * </ul>
 */
public final class CostEstimator {

    private CostEstimator() {}

    /** {provider -> [usdPer1MIn, usdPer1MOut]} */
    private static final Map<String, double[]> PRICING_USD_PER_1M = Map.of(
            "nebius", new double[]{0.13, 0.40},
            "groq", new double[]{0.0, 0.0},
            "gemini", new double[]{0.0, 0.0},
            "ollama", new double[]{0.0, 0.0},
            "template", new double[]{0.0, 0.0},
            "tavily", new double[]{0.0, 0.0}
    );

    public static double estimate(String provider, long tokensIn, long tokensOut) {
        double[] p = PRICING_USD_PER_1M.getOrDefault(provider, new double[]{0.0, 0.0});
        return tokensIn / 1_000_000.0 * p[0] + tokensOut / 1_000_000.0 * p[1];
    }

    /**
     * Projected runway for the $50 Nebius Token Factory credit.
     * A weekly run ≈ 8k in + 3k out on Llama 3.3 70B ≈ $0.002 → ~$0.12/yr,
     * so $50 ≈ 100+ years. Capped at "100+ years" per the API contract.
     */
    public static String projectedRunway(double monthlyCostUsd) {
        if (monthlyCostUsd <= 0.0) return "100+ years";
        double years = 50.0 / (monthlyCostUsd * 12.0);
        if (years >= 100) return "100+ years";
        if (years >= 1) return String.format("%.0f years", years);
        double months = years * 12;
        if (months >= 1) return String.format("%.0f months", months);
        return String.format("%.0f days", Math.max(1, months * 30));
    }
}
