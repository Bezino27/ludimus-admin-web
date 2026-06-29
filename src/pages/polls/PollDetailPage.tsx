import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPoll } from "../../api/polls";
import AdminCard from "../../components/layout/AdminCard";
import AdminPage from "../../components/layout/AdminPage";
import type { Poll } from "../../types/poll";
import styles from "./PollsListPage.module.css";

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

export default function PollDetailPage() {
  const { id } = useParams();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPoll = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError("");
        const data = await getPoll(id);
        setPoll(data);
      } catch (err) {
        console.error("Načítanie detailu ankety zlyhalo", err);
        setError("Detail ankety sa nepodarilo načítať.");
      } finally {
        setLoading(false);
      }
    };

    loadPoll();
  }, [id]);

  if (loading) {
    return (
      <AdminPage title="Detail ankety" subtitle="Načítavam anketu...">
        <AdminCard>Načítavam anketu...</AdminCard>
      </AdminPage>
    );
  }

  if (error || !poll) {
    return (
      <AdminPage title="Detail ankety" subtitle="Anketa nie je dostupná.">
        <AdminCard>{error || "Anketa neexistuje."}</AdminCard>
      </AdminPage>
    );
  }

  const totalVotes = getTotalVotes(poll);

  return (
    <AdminPage
      title="Detail ankety"
      subtitle={poll.club_name ? `Klub ${poll.club_name}` : "Klubová anketa"}
    >
      <div className={styles.page}>
        <article className={styles.card}>
          <div className={styles.content}>
            <div className={styles.headerRow}>
              <div className={styles.titleWrap}>
                <h2 className={styles.pollTitle}>{poll.question}</h2>

                <div className={styles.badges}>
                  <span
                    className={`${styles.badge} ${
                      poll.is_active ? styles.badgePublished : styles.badgeDraft
                    }`}
                  >
                    {poll.is_active ? "Aktívna" : "Neaktívna"}
                  </span>

                  <span
                    className={`${styles.badge} ${
                      poll.voting_open ? styles.badgeOpen : styles.badgeArchived
                    }`}
                  >
                    {poll.voting_open ? "Otvorené hlasovanie" : "Ukončené hlasovanie"}
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.metaRow}>
              <span className={styles.metaItem}>Začiatok: {formatDate(poll.starts_at)}</span>
              <span className={styles.metaItem}>Koniec: {formatDate(poll.ends_at)}</span>
              <span className={styles.metaItem}>Vytvorené: {formatDate(poll.created_at)}</span>
              <span className={styles.metaItem}>Upravené: {formatDate(poll.updated_at)}</span>
              <span className={styles.metaItem}>Možnosti: {poll.options.length}</span>
              <span className={styles.metaItem}>Hlasy: {totalVotes}</span>
            </div>

            {poll.description ? (
              <p className={styles.excerpt}>{poll.description}</p>
            ) : null}

            <section className={styles.resultsBox}>
              <div className={styles.resultsHeader}>
                <h3 className={styles.resultsTitle}>Výsledky hlasovania</h3>
                <span className={styles.resultsTotal}>{totalVotes} hlasov spolu</span>
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
              <Link to="/polls" className={styles.actionButton}>
                Späť na ankety
              </Link>
              <Link to={`/polls/${poll.id}/edit`} className={styles.actionButton}>
                Upraviť
              </Link>
            </div>
          </div>
        </article>
      </div>
    </AdminPage>
  );
}
