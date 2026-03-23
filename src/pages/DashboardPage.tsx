import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPosts } from "../api/posts";
import { useAuth } from "../context/useAuth";
import type { AdminPost } from "../types/post";
import styles from "./DashboardPage.module.css";

type UserMembership = {
  id: number;
  club_id: number;
  club_name: string;
  club_slug: string;
  role: string;
};

type ChartPoint = {
  label: string;
  value: number;
};

function getRoleLabel(role: string) {
  switch (role) {
    case "club_admin":
      return "Admin klubu";
    case "editor":
      return "Editor";
    case "coach":
      return "Tréner";
    case "owner":
      return "Owner";
    default:
      return role;
  }
}

function formatDate(dateString: string) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("sk-SK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function isSameMonth(dateString: string, baseDate: Date) {
  const date = new Date(dateString);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === baseDate.getFullYear() &&
    date.getMonth() === baseDate.getMonth()
  );
}

function buildMonthlyContentChart(posts: AdminPost[]): ChartPoint[] {
  const now = new Date();
  const data: ChartPoint[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const current = new Date(now.getFullYear(), now.getMonth() - i, 1);

    const value = posts.filter((post) => {
      const created = new Date(post.created_at);
      return (
        !Number.isNaN(created.getTime()) &&
        created.getFullYear() === current.getFullYear() &&
        created.getMonth() === current.getMonth()
      );
    }).length;

    data.push({
      label: current.toLocaleDateString("sk-SK", { month: "short" }),
      value,
    });
  }

  return data;
}

function getPostStatusLabel(status: string) {
  switch (status) {
    case "published":
      return "Publikované";
    case "scheduled":
      return "Naplánované";
    case "archived":
      return "Archivované";
    default:
      return "Draft";
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const memberships = (user?.memberships ?? []) as UserMembership[];
  const activeClub = memberships[0] ?? null;

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPosts = async () => {
      if (!activeClub?.club_slug) {
        setPosts([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getPosts({ clubSlug: activeClub.club_slug });
        const sorted = [...response.results].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setPosts(sorted);
      } catch (err) {
        console.error("Dashboard posts load failed:", err);
        setError("Nepodarilo sa načítať dashboard dáta.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [activeClub?.club_slug]);

  const dashboardData = useMemo(() => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

    const publishedPosts = posts.filter((post) => post.status === "published");
    const draftPosts = posts.filter((post) => post.status === "draft");
    const scheduledPosts = posts.filter((post) => post.status === "scheduled");
    const featuredPosts = posts.filter((post) => post.is_featured);

    const thisMonthPosts = posts.filter((post) => isSameMonth(post.created_at, now));

    const previousMonthPosts = posts.filter((post) =>
      isSameMonth(post.created_at, lastMonth)
    );

    const monthlyChange =
      previousMonthPosts.length === 0
        ? thisMonthPosts.length > 0
          ? 100
          : 0
        : Math.round(
            ((thisMonthPosts.length - previousMonthPosts.length) /
              previousMonthPosts.length) *
              100
          );

    const recentPosts = [...posts].slice(0, 5);

    const topPosts = [...posts]
      .sort((a, b) => {
        const scoreA =
          (a.is_featured ? 100 : 0) +
          (a.status === "published" ? 50 : 0) +
          new Date(a.updated_at).getTime() / 1000000000;
        const scoreB =
          (b.is_featured ? 100 : 0) +
          (b.status === "published" ? 50 : 0) +
          new Date(b.updated_at).getTime() / 1000000000;

        return scoreB - scoreA;
      })
      .slice(0, 5);

    const chart = buildMonthlyContentChart(posts);

    return {
      totalPosts: posts.length,
      publishedPosts: publishedPosts.length,
      draftPosts: draftPosts.length,
      scheduledPosts: scheduledPosts.length,
      featuredPosts: featuredPosts.length,
      thisMonthPosts: thisMonthPosts.length,
      monthlyChange,
      recentPosts,
      topPosts,
      chart,
    };
  }, [posts]);

  const chartMax = Math.max(...dashboardData.chart.map((item) => item.value), 1);

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroMain}>
          <div className={styles.heroTop}>
            <div>
              <span className={styles.eyebrow}>Ludimus Web Admin</span>
              <h1 className={styles.heroTitle}>
                {activeClub?.club_name || "Klubový dashboard"}
              </h1>
              <p className={styles.heroSubtitle}>
                {activeClub
                  ? `Spravuješ obsah webu klubu ${activeClub.club_name}. Dashboard je pripravený na články, analytiku a ďalšie webové moduly.`
                  : "Zatiaľ nemáš priradený aktívny klub."}
              </p>
            </div>

            {activeClub && (
              <div className={styles.heroBadge}>
                {getRoleLabel(activeClub.role)}
              </div>
            )}
          </div>

          <div className={styles.heroMeta}>
            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaLabel}>Slug klubu</span>
              <strong className={styles.heroMetaValue}>
                {activeClub?.club_slug || "—"}
              </strong>
            </div>

            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaLabel}>Články tento mesiac</span>
              <strong className={styles.heroMetaValue}>
                {dashboardData.thisMonthPosts}
              </strong>
            </div>

            <div className={styles.heroMetaItem}>
              <span className={styles.heroMetaLabel}>Zmena vs. minulý mesiac</span>
              <strong
                className={`${styles.heroMetaValue} ${
                  dashboardData.monthlyChange > 0
                    ? styles.positive
                    : dashboardData.monthlyChange < 0
                    ? styles.negative
                    : ""
                }`}
              >
                {dashboardData.monthlyChange > 0 ? "+" : ""}
                {dashboardData.monthlyChange} %
              </strong>
            </div>
          </div>

          <div className={styles.heroActions}>
            <Link to="/posts" className={styles.primaryButton}>
              Spravovať články
            </Link>
            <Link to="/posts/create" className={styles.secondaryButton}>
              Nový článok
            </Link>
          </div>
        </div>

        <div className={styles.heroSide}>
          <div className={styles.analyticsCard}>
            <div className={styles.analyticsHeader}>
              <div>
                <p className={styles.analyticsEyebrow}>Analytika</p>
                <h3 className={styles.analyticsTitle}>Návštevnosť a engagement</h3>
              </div>
              <span className={styles.analyticsSoon}>Backend zajtra</span>
            </div>

            <div className={styles.analyticsStats}>
              <div className={styles.analyticsStat}>
                <span className={styles.analyticsStatLabel}>Zobrazenia 7 dní</span>
                <strong className={styles.analyticsStatValue}>—</strong>
              </div>

              <div className={styles.analyticsStat}>
                <span className={styles.analyticsStatLabel}>Zobrazenia 30 dní</span>
                <strong className={styles.analyticsStatValue}>—</strong>
              </div>

              <div className={styles.analyticsStat}>
                <span className={styles.analyticsStatLabel}>Lajky / reakcie</span>
                <strong className={styles.analyticsStatValue}>—</strong>
              </div>

              <div className={styles.analyticsStat}>
                <span className={styles.analyticsStatLabel}>Čitatelia</span>
                <strong className={styles.analyticsStatValue}>—</strong>
              </div>
            </div>

            <p className={styles.analyticsNote}>
              Táto sekcia je už pripravená na napojenie reálnych views, likov,
              návštevnosti a porovnaní za týždeň / mesiac.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Články celkovo</p>
          <h3 className={styles.kpiValue}>{dashboardData.totalPosts}</h3>
          <p className={styles.kpiHint}>Všetok obsah klubu v CMS.</p>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Publikované</p>
          <h3 className={styles.kpiValue}>{dashboardData.publishedPosts}</h3>
          <p className={styles.kpiHint}>Články zverejnené na webe.</p>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Drafty</p>
          <h3 className={styles.kpiValue}>{dashboardData.draftPosts}</h3>
          <p className={styles.kpiHint}>Rozpracovaný obsah čakajúci na úpravu.</p>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Naplánované</p>
          <h3 className={styles.kpiValue}>{dashboardData.scheduledPosts}</h3>
          <p className={styles.kpiHint}>Obsah pripravený na publikovanie.</p>
        </article>

        <article className={styles.kpiCard}>
          <p className={styles.kpiLabel}>Featured články</p>
          <h3 className={styles.kpiValue}>{dashboardData.featuredPosts}</h3>
          <p className={styles.kpiHint}>Zvýraznený obsah klubu.</p>
        </article>

        <article className={styles.kpiCardAccent}>
          <p className={styles.kpiLabel}>Nové články tento mesiac</p>
          <h3 className={styles.kpiValue}>{dashboardData.thisMonthPosts}</h3>
          <p className={styles.kpiHint}>
            {dashboardData.monthlyChange > 0 ? "+" : ""}
            {dashboardData.monthlyChange}% oproti minulému mesiacu
          </p>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.panelLarge}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Obsahová aktivita</p>
              <h2 className={styles.panelTitle}>Vývoj publikovania článkov</h2>
            </div>
            <span className={styles.panelTag}>posledných 6 mesiacov</span>
          </div>

          <div className={styles.chart}>
            {dashboardData.chart.map((item) => (
              <div key={item.label} className={styles.chartItem}>
                <div className={styles.chartBarWrap}>
                  <div
                    className={styles.chartBar}
                    style={{
                      height: `${Math.max((item.value / chartMax) * 180, item.value > 0 ? 24 : 8)}px`,
                    }}
                  />
                </div>
                <span className={styles.chartValue}>{item.value}</span>
                <span className={styles.chartLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className={styles.panelSide}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Najnovšie články</p>
              <h2 className={styles.panelTitle}>Posledná aktivita</h2>
            </div>
            <Link to="/posts" className={styles.panelLink}>
              Zobraziť všetky
            </Link>
          </div>

          {loading ? (
            <div className={styles.placeholder}>Načítavam články…</div>
          ) : error ? (
            <div className={styles.errorBox}>{error}</div>
          ) : dashboardData.recentPosts.length === 0 ? (
            <div className={styles.placeholder}>Zatiaľ tu nie sú žiadne články.</div>
          ) : (
            <div className={styles.postList}>
              {dashboardData.recentPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/posts/${post.id}/edit`}
                  className={styles.postItem}
                >
                  <div className={styles.postItemMain}>
                    <h3 className={styles.postItemTitle}>{post.title}</h3>
                    <p className={styles.postItemMeta}>
                      {getPostStatusLabel(post.status)} · {formatDate(post.updated_at)}
                    </p>
                  </div>
                  <span className={styles.postItemArrow}>→</span>
                </Link>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Top obsah</p>
              <h2 className={styles.panelTitle}>Najsilnejšie články v CMS</h2>
            </div>
            <span className={styles.panelTag}>dočasne podľa recencie a featured</span>
          </div>

          {dashboardData.topPosts.length === 0 ? (
            <div className={styles.placeholder}>Zatiaľ nie sú k dispozícii žiadne články.</div>
          ) : (
            <div className={styles.rankList}>
              {dashboardData.topPosts.map((post, index) => (
                <div key={post.id} className={styles.rankItem}>
                  <div className={styles.rankNumber}>{index + 1}</div>
                  <div className={styles.rankBody}>
                    <div className={styles.rankTop}>
                      <h3 className={styles.rankTitle}>{post.title}</h3>
                      {post.is_featured && (
                        <span className={styles.featuredBadge}>Featured</span>
                      )}
                    </div>
                    <p className={styles.rankMeta}>
                      {getPostStatusLabel(post.status)} · {formatDate(post.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <p className={styles.panelEyebrow}>Pripravené na zajtra</p>
              <h2 className={styles.panelTitle}>Analytics moduly</h2>
            </div>
          </div>

          <div className={styles.todoCards}>
            <div className={styles.todoCard}>
              <h3 className={styles.todoTitle}>Views tracking</h3>
              <p className={styles.todoText}>
                Počet zobrazení článkov za deň, týždeň a mesiac.
              </p>
            </div>

            <div className={styles.todoCard}>
              <h3 className={styles.todoTitle}>Čitatelia a návštevnosť</h3>
              <p className={styles.todoText}>
                Unikátni návštevníci, trend návštevnosti a porovnania období.
              </p>
            </div>

            <div className={styles.todoCard}>
              <h3 className={styles.todoTitle}>Likes a engagement</h3>
              <p className={styles.todoText}>
                Reakcie, lajky a najvýkonnejší obsah klubu.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}