import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminLayout from "./components/layout/AdminLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import PollCreatePage from "./pages/polls/PollCreatePage";
import PollDetailPage from "./pages/polls/PollDetailPage";
import PollEditPage from "./pages/polls/PollEditPage";
import PollsListPage from "./pages/polls/PollsListPage";
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
          <Route path="polls" element={<PollsListPage />} />
          <Route path="polls/create" element={<PollCreatePage />} />
          <Route path="polls/:id" element={<PollDetailPage />} />
          <Route path="polls/:id/edit" element={<PollEditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
