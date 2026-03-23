import api from "./axios";

export const uploadPostImage = async (clubId: number, file: File) => {
  const formData = new FormData();
  formData.append("club", String(clubId));
  formData.append("image", file);

  const response = await api.post<{ url: string }>(
    "/api/admin/posts/upload/image/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};

export const uploadFeaturedImage = async (clubId: number, file: File) => {
  const formData = new FormData();
  formData.append("club", String(clubId));
  formData.append("image", file);

  const response = await api.post<{ url: string; path: string }>(
    "/api/admin/posts/upload/featured-image/",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
};