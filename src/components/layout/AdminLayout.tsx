import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

export default function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "240px 1fr" }}>
      <aside
        style={{
          background: "#111827",
          color: "#fff",
          padding: 20,
        }}
      >
        <h2 style={{ marginTop: 0 }}>Ludimus Admin</h2>

        <div style={{ marginBottom: 24, fontSize: 14, opacity: 0.9 }}>
          <div>{user?.username}</div>
          <div>{user?.email}</div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link to="/" style={{ color: "#fff", textDecoration: "none" }}>
            Dashboard
          </Link>
          <Link to="/posts" style={{ color: "#fff", textDecoration: "none" }}>
            Články
          </Link>
        </nav>

        <button
          onClick={logout}
          style={{
            marginTop: 24,
            padding: "10px 14px",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Odhlásiť sa
        </button>
      </aside>

      <main style={{ padding: 24, background: "#f3f4f6" }}>
        <Outlet />
      </main>
    </div>
  );
}