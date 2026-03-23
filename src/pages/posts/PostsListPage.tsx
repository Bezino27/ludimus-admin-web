import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deletePost, getPosts } from "../../api/posts";
import { useAuth } from "../../context/useAuth";
import type { AdminPost } from "../../types/post";
import styles from "./PostsListPage.module.css";

type UserMembership = {
  club_id: number;
  club_name: string;
  club_slug: string;
};

const POSTS_PER_PAGE = 10;

function getStatusLabel(status: string) {
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

function getStatusClass(status: string) {
  switch (status) {
    case "published":
      return styles.badgePublished;
    case "scheduled":
      return styles.badgeScheduled;
    case "archived":
      return styles.badgeArchived;
    default:
      return styles.badgeDraft;
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function PostsListPage() {
  const { user } = useAuth();
  const selectedClub = (user?.memberships?.[0] as UserMembership | undefined) ?? null;

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getPosts({ clubSlug: selectedClub?.club_slug });

        const sorted = [...data.results].sort(
        (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setPosts(sorted);
      } catch (err) {
        console.error("Načítanie článkov zlyhalo", err);
        setError("Nepodarilo sa načítať články.");
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, [selectedClub?.club_slug]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        !normalizedSearch ||
        post.title.toLowerCase().includes(normalizedSearch) ||
        post.slug.toLowerCase().includes(normalizedSearch) ||
        post.excerpt.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || post.status === statusFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        String(post.category ?? "none") === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [posts, search, statusFilter, categoryFilter]);

  const categories = useMemo(() => {
    const map = new Map<string, string>();

    posts.forEach((post) => {
      const key = String(post.category ?? "none");
      const label = post.category_name || "Bez kategórie";
      map.set(key, label);
    });

    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [posts]);

  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter((post) => post.status === "published").length;
    const drafts = posts.filter((post) => post.status === "draft").length;
    const featured = posts.filter((post) => post.is_featured).length;

    return { total, published, drafts, featured };
  }, [posts]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));

  const paginatedPosts = useMemo(() => {
    const startIndex = (page - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    return filteredPosts.slice(startIndex, endIndex);
  }, [filteredPosts, page]);

  const handleDelete = async (postId: number, title: string) => {
    const confirmed = window.confirm(`Naozaj chcete zmazať článok "${title}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(postId);
      await deletePost(postId);

      setPosts((prev) => prev.filter((post) => post.id !== postId));

      const newFilteredCount = filteredPosts.length - 1;
      const newTotalPages = Math.max(1, Math.ceil(newFilteredCount / POSTS_PER_PAGE));

      if (page > newTotalPages) {
        setPage(newTotalPages);
      }
    } catch (err) {
      console.error("Mazanie článku zlyhalo", err);
      alert("Článok sa nepodarilo zmazať.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.headingWrap}>
          <h1 className={styles.title}>Články</h1>
          <p className={styles.subtitle}>
            {selectedClub
              ? `Spravujete články pre klub ${selectedClub.club_name}`
              : "Správa klubových článkov"}
          </p>
        </div>

        <Link to="/posts/create" className={styles.primaryButton}>
          Nový článok
        </Link>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Všetky články</p>
          <p className={styles.statValue}>{stats.total}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Publikované</p>
          <p className={styles.statValue}>{stats.published}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Drafty</p>
          <p className={styles.statValue}>{stats.drafts}</p>
        </div>

        <div className={styles.statCard}>
          <p className={styles.statLabel}>Featured</p>
          <p className={styles.statValue}>{stats.featured}</p>
        </div>
      </div>

      <div className={styles.filtersCard}>
        <div className={styles.filtersGrid}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Vyhľadávanie</label>
            <input
              className={styles.input}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Hľadať podľa názvu, slugu alebo popisu"
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Status</label>
            <select
              className={styles.input}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Všetky statusy</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Kategória</label>
            <select
              className={styles.input}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Všetky kategórie</option>
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingCard}>Načítavam články...</div>
      ) : error ? (
        <div className={styles.errorCard}>{error}</div>
      ) : filteredPosts.length === 0 ? (
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Žiadne články</h2>
          <p className={styles.emptyText}>
            Skúste upraviť filtre alebo vytvorte nový článok.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.list}>
            {paginatedPosts.map((post) => {
              const liveUrl =
                post.club_slug && post.slug
                  ? `/${post.club_slug}/posts/${post.slug}`
                  : "#";

              return (
                <article key={post.id} className={styles.card}>
                  <div className={styles.imageWrap}>
                    {post.featured_image_url || post.featured_image ? (
                      <img
                        src={post.featured_image_url || post.featured_image || ""}
                        alt={post.title}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.imageFallback}>Bez obrázka</div>
                    )}
                  </div>

                  <div className={styles.content}>
                    <div className={styles.headerRow}>
                      <div className={styles.titleWrap}>
                        <h2 className={styles.postTitle}>{post.title}</h2>

                        <div className={styles.badges}>
                          <span
                            className={`${styles.badge} ${getStatusClass(post.status)}`}
                          >
                            {getStatusLabel(post.status)}
                          </span>

                          {post.is_featured && (
                            <span className={`${styles.badge} ${styles.badgeFeatured}`}>
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={styles.metaRow}>
                      <span className={styles.metaItem}>
                        Klub: {post.club_name}
                      </span>
                      <span className={styles.metaItem}>
                        Kategória: {post.category_name || "Bez kategórie"}
                      </span>
                      <span className={styles.metaItem}>
                        Vytvorené: {formatDate(post.created_at)}
                      </span>
                      <span className={styles.metaItem}>
                        Upravené: {formatDate(post.updated_at)}
                      </span>
                    </div>

                    <p className={styles.excerpt}>
                      {post.excerpt || "Tento článok zatiaľ nemá krátky popis."}
                    </p>

                    <p className={styles.slug}>Slug: {post.slug}</p>

                    <div className={styles.actions}>
                      <Link
                        to={`/posts/${post.id}/edit`}
                        className={styles.actionButton}
                      >
                        Upraviť
                      </Link>

                      <a
                        href={liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.actionButton}
                      >
                        Otvoriť live
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDelete(post.id, post.title)}
                        className={`${styles.actionButton} ${styles.actionDanger}`}
                        disabled={deletingId === post.id}
                      >
                        {deletingId === post.id ? "Mažem..." : "Zmazať"}
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