package lk.sltech.radar.domain;

/** Newsletter content categories (API contract: hackathons | internships | courses | scholarships). */
public enum Category {
    hackathons, internships, courses, scholarships;

    public static Category from(String value) {
        for (Category c : values()) {
            if (c.name().equalsIgnoreCase(value)) return c;
        }
        throw new IllegalArgumentException("Unknown category: " + value);
    }
}
