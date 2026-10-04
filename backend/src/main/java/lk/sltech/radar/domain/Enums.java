package lk.sltech.radar.domain;

/** API contract enums for drafts, dedup, runs, deadlines and the ledger. */
public final class Enums {
    private Enums() {}

    public enum DraftStatus { draft, approved, edited, rejected }
    public enum DedupStatus { NEW, SEEN, VERIFY }
    public enum RunStatus { queued, running, drafting, in_review, done, failed }
    public enum DeadlineConfidence { high, medium, low }
    public enum LedgerStatus { candidate, approved, rejected, published }
    public enum EditionStatus { draft, in_review, published }
}
