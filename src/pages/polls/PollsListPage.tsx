import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deletePoll, getPolls } from "../../api/polls";
import { useAuth } from "../../context/useAuth";
import type { Poll } from "../../types/poll";
import type { Membership } from "../../types/auth";
import styles from "./PollsListPage.module.css";

const POLLS_PER_PAGE = 10;

function formatDate(dateString: string | null) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isEnded(poll: Poll) {
  if (!poll.ends_at) return false;

  return new Date(poll.ends_at).getTime() < Date.now();
}

function getTotalVotes(poll: Poll) {
  return (
    poll.total_votes ??
    poll.options.reduce((sum, option) => sum + (option.votes_count ?? 0), 0)
  );
}

function getOptionPercent(votes: number, totalVotes: number) {
  if (totalVotes <= 0) return 0;

  return Math.round((votes / totalVotes) * 1000) / 10;
}

export default function PollsListPage() {
  const { user } = useAuth();
  const selectedClub = (user?.memberships?.[0] as Membership | undefined) ?? null;

  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("current");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadPolls = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPolls(selectedClub?.club_slug);
        const sorted = [...data].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setPolls(sorted);
      } catch (err) {
        console.error("Načítanie ankiet zlyhalo", err);
        setError("Nepodarilo sa načítať ankety.");
      } finally {
        setLoading(false);
      }
    };

    loadPolls();
  }, [selectedClub?.club_slug]);

  useEffect(() => {
    setPage(1);
  }, [search, sectionFilter, statusFilter]);

  const filteredPolls = useMemo(() => {
    return polls.filter((poll) => {
      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        poll.question.toLowerCase().includes(normalizedSearch) ||
        poll.description.toLowerCase().includes(normalizedSearch);

      const matchesSection =
        sectionFilter === "all" ||
        (sectionFilter === "current" &&
          (poll.voting_open || (poll.is_active && !isEnded(poll)))) ||
        (sectionFilter === "ended" &&
          !poll.voting_open &&
          (!poll.is_active || isEnded(poll)));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && poll.is_active) ||
        (statusFilter === "inactive" && !poll.is_active) ||
        (statusFilter === "open" && poll.voting_open) ||
        (statusFilter === "ended" && !poll.voting_open && isEnded(poll));

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [polls, search, sectionFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = polls.length;
    const active = polls.filter((poll) => poll.is_active).length;
    const open = polls.filter((poll) => poll.voting_open).length;
    const ended = polls.filter(
      (poll) => !poll.voting_open && (!poll.is_active || isEnded(poll))
    ).length;
    const votes = polls.reduce((sum, poll) => sum + getTotalVotes(poll), 0);

    return { total, active, open, ended, votes };
  }, [polls]);

  const totalPages = Math.max(1, Math.ceil(filteredPolls.length / POLLS_PER_PAGE));

  const paginatedPolls = useMemo(() => {
    const startIndex = (page - 1) * POLLS_PER_PAGE;
    return filteredPolls.slice(startIndex, startIndex + POLLS_PER_PAGE);
  }, [filteredPolls, page]);

  const handleDelete = async (pollId: number, question: string) => {
    const confirmed = window.confirm(`Naozaj chcete zmazať anketu "${question}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(pollId);
      await deletePoll(pollId);

      setPolls((prev) => prev.filter((poll) => poll.id !== pollId));

      const newFilteredCount = filteredPolls.length - 1;
      const newTotalPages = Math.max(1, Math.ceil(newFilteredCount / POLLS_PER_PAGE));

      if (page > newTotalPages) {
        setPage(newTotalPages);
      }
    } catch (err) {
      console.error("Mazanie ankety zlyhalo", err);
      alert("Anketu sa nepodarilo zmazať.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.headingWrap}>
          <h1 className={styles.title}>Ankety</h1>
          <p className={styles.subtitle}>Správa klubových ankiet</p>
        </div>

        <Link to="/polls/create" className={styles.primaryButton}>
          Nová anketa
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Počet ankiet</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Aktívne ankety</p>
          <p className={styles.statValue}>{stats.active}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Otvorené hlasovanie</p>
          <p className={styles.statValue}>{stats.open}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Ukončené ankety</p>
          <p className={styles.statValue}>{stats.ended}</p>
        </div>
      </div>

      <div className={styles.statsGridCompact}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Celkový počet hlasov</p>
          <p className={styles.statValue}>{stats.votes}</p>
        </div>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.segmentedControl}>
          <button
            type="button"
            className={`${styles.segmentButton} ${
              sectionFilter === "current" ? styles.segmentButtonActive : ""
            }`}
            onClick={() => setSectionFilter("current")}
          >
            Aktuálne / otvorené ankety
          </button>
          <button
            type="button"
            className={`${styles.segmentButton} ${
              sectionFilter === "ended" ? styles.segmentButtonActive : ""
            }`}
            onClick={() => setSectionFilter("ended")}
          >
            Ukončené ankety
          </button>
          <button
            type="button"
            className={`${styles.segmentButton} ${
              sectionFilter === "all" ? styles.segmentButtonActive : ""
            }`}
            onClick={() => setSectionFilter("all")}
          >
            Všetky ankety
          </button>
        </div>

        <div className={styles.filtersGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Vyhľadávanie</label>
            <input
              className={styles.input}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Hľadať podľa otázky alebo popisu"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Filter</label>
            <select
              className={styles.input}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">Všetky</option>
              <option value="active">Aktívne</option>
              <option value="inactive">Neaktívne</option>
              <option value="open">Otvorené</option>
              <option value="ended">Ukončené</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingCard}>Načítavam ankety...</div>
      ) : error ? (
        <div className={styles.errorCard}>{error}</div>
      ) : filteredPolls.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Zatiaľ neexistujú žiadne ankety.</h2>
          <p className={styles.emptyText}>
            Skúste upraviť filtre alebo vytvorte novú anketu.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {paginatedPolls.map((poll) => {
              const totalVotes = getTotalVotes(poll);

              return (
                <article key={poll.id} className={styles.card}>
                  <div className={styles.content}>
                    <div className={styles.headerRow}>
                      <div className={styles.titleWrap}>
                        <h2 className={styles.pollTitle}>{poll.question}</h2>

                        <div className={styles.badges}>
                          <span
                            className={`${styles.badge} ${
                              poll.is_active
                                ? styles.badgePublished
                                : styles.badgeDraft
                            }`}
                          >
                            {poll.is_active ? "Aktívna" : "Neaktívna"}
                          </span>

                          <span
                            className={`${styles.badge} ${
                              poll.voting_open
                                ? styles.badgeOpen
                                : styles.badgeArchived
                            }`}
                          >
                            {poll.voting_open ? "Otvorené" : "Ukončené"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaItem}>
                        Začiatok: {formatDate(poll.starts_at)}
                      </span>
                      <span className={styles.metaItem}>
                        Koniec: {formatDate(poll.ends_at)}
                      </span>
                      <span className={styles.metaItem}>
                        Možnosti: {poll.options.length}
                      </span>
                      <span className={styles.metaItem}>
                        Hlasy: {totalVotes}
                      </span>
                    </div>

                    {poll.description ? (
                      <p className={styles.excerpt}>{poll.description}</p>
                    ) : null}

                    <section className={styles.resultsBox}>
                      <div className={styles.resultsHeader}>
                        <h3 className={styles.resultsTitle}>Výsledky hlasovania</h3>
                        <span className={styles.resultsTotal}>
                          {totalVotes} hlasov
                        </span>
                      </div>

                      <div className={styles.resultOptions}>
                        {poll.options.map((option) => {
                          const votes = option.votes_count ?? 0;
                          const percent = getOptionPercent(votes, totalVotes);

                          return (
                            <div key={option.id ?? option.order} className={styles.resultOption}>
                              <div className={styles.resultTopRow}>
                                <span className={styles.resultText}>{option.text}</span>
                                <span className={styles.resultNumbers}>
                                  {votes} hlasov · {percent} %
                                </span>
                              </div>
                              <div className={styles.progressTrack}>
                                <div
                                  className={styles.progressBar}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                    <div className={styles.actions}>
                      <Link
                        to={`/polls/${poll.id}`}
                        className={styles.actionButton}
                      >
                        Detail
                      </Link>

                      <Link
                        to={`/polls/${poll.id}/edit`}
                        className={styles.actionButton}
                      >
                        Upraviť
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(poll.id, poll.question)}
                        className={`${styles.actionButton} ${styles.actionDanger}`}
                        disabled={deletingId === poll.id}
                      >
                        {deletingId === poll.id ? "Mažem..." : "Vymazať"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
            >
              Predchádzajúca
            </button>

            <div className={styles.paginationInfo}>
              Strana <strong>{page}</strong> z <strong>{totalPages}</strong>
            </div>

            <button
              type="button"
              className={styles.paginationButton}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
            >
              Ďalšia
            </button>
          </div>
        </>
      )}
    </div>
  );
}
