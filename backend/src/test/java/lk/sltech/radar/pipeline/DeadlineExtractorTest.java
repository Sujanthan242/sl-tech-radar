package lk.sltech.radar.pipeline;

import lk.sltech.radar.domain.Enums;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;

class DeadlineExtractorTest {

    private final DeadlineExtractor ex = new DeadlineExtractor();

    @Test
    void explicitDateWithYear_nearKeyword_isHigh() {
        var g = ex.extract("HackNova 2026", "Registration deadline: 31 Oct 2026. Apply now!");
        assertEquals(LocalDate.of(2026, 10, 31), g.date());
        assertEquals(Enums.DeadlineConfidence.high, g.confidence());
    }

    @Test
    void monthDayYearWordFormat_isHigh() {
        var g = ex.extract("GSoC", "Student applications due October 31, 2026 for the programme.");
        assertEquals(LocalDate.of(2026, 10, 31), g.date());
        assertEquals(Enums.DeadlineConfidence.high, g.confidence());
    }

    @Test
    void isoDate_isParsed() {
        var g = ex.extract("Internship", "Applications close 2026-11-15.");
        assertEquals(LocalDate.of(2026, 11, 15), g.date());
        assertNotEquals(Enums.DeadlineConfidence.low, g.confidence());
    }

    @Test
    void numericDMY_assumesDayFirst() {
        var g = ex.extract("Scholarship", "Last date 31/10/2026.");
        assertEquals(LocalDate.of(2026, 10, 31), g.date());
        assertEquals(Enums.DeadlineConfidence.high, g.confidence());
    }

    @Test
    void relativeInNDays_isMedium() {
        var g = ex.extract("Hackathon", "Registrations close in 5 days!");
        assertEquals(LocalDate.now().plusDays(5), g.date());
        assertEquals(Enums.DeadlineConfidence.medium, g.confidence());
    }

    @Test
    void monthDayWithoutYear_assumesNextOccurrence_medium() {
        LocalDate today = LocalDate.now();
        var g = ex.extract("Course", "Enrolment ends December 25, join soon.");
        // Dec 25 this year or next, whichever is not in the past.
        LocalDate expected = LocalDate.of(today.getYear(), 12, 25);
        if (expected.isBefore(today)) expected = expected.plusYears(1);
        assertEquals(expected, g.date());
        assertEquals(Enums.DeadlineConfidence.medium, g.confidence());
    }

    @Test
    void vagueUrgency_isLowWithNullDate() {
        var g = ex.extract("Workshop", "Closing soon — limited seats, apply now!");
        assertNull(g.date());
        assertEquals(Enums.DeadlineConfidence.low, g.confidence());
    }

    @Test
    void noDateAtAll_isLowWithNullDate() {
        var g = ex.extract("Free course", "Self-paced online course, start anytime.");
        assertNull(g.date());
        assertEquals(Enums.DeadlineConfidence.low, g.confidence());
    }
}
