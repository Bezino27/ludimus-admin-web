import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PostCreatePage from "./pages/posts/PostCreatePage";
import PostEditPage from "./pages/posts/PostEditPage";
import PostsListPage from "./pages/posts/PostsListPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="posts" element={<PostsListPage />} />
          <Route path="posts/create" element={<PostCreatePage />} />
          <Route path="posts/:id/edit" element={<PostEditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}