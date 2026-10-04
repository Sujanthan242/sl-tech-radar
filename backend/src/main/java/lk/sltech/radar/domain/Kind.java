package lk.sltech.radar.domain;

/** Kind of a discovered opportunity (API contract). */
public enum Kind {
    hackathon, internship, course, scholarship, free_offer;

    public static Kind from(String value) {
        if (value == null) return null;
        String v = value.trim().toLowerCase().replace('-', '_');
        for (Kind k : values()) {
            if (k.name().equals(v)) return k;
        }
        return null;
    }
}
