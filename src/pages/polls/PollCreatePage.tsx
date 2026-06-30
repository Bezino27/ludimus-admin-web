import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { createPoll } from "../../api/polls";
import PollForm from "../../components/PollForm";
import AdminCard from "../../components/layout/AdminCard";
import AdminPage from "../../components/layout/AdminPage";
import { useAuth } from "../../context/useAuth";
import type { Membership } from "../../types/auth";
import type { PollPayload } from "../../types/poll";

type ApiErrorResponse = {
  detail?: string;
  [key: string]: unknown;
};

export default function PollCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const selectedClub = (user?.memberships?.[0] as Membership | undefined) ?? null;

  const handleSubmit = async (payload: PollPayload) => {
    if (!selectedClub) {
      alert("Nie je dostupný klub.");
      return;
    }

    try {
      await createPoll({
        ...payload,
        club: selectedClub.club_id,
      });

      navigate("/polls");
    } catch (error: unknown) {
      const axiosError = error as AxiosError<ApiErrorResponse>;

      console.error(
        "CREATE POLL ERROR:",
        axiosError.response?.data || axiosError.message || error
      );

      alert(
        JSON.stringify(
          axiosError.response?.data || { detail: "Vytvorenie ankety zlyhalo." },
          null,
          2
        )
      );

      throw error;
    }
  };

  if (!selectedClub) {
    return (
      <AdminPage title="Nová anketa" subtitle="Nie je dostupný klub.">
        <AdminCard>Nie je dostupný klub.</AdminCard>
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Nová anketa" subtitle="Vytvárate novú klubovú anketu.">
      <AdminCard>
        <PollForm
          onSubmit={handleSubmit}
          submitLabel="Vytvoriť anketu"
          clubId={selectedClub.club_id}
        />
      </AdminCard>
    </AdminPage>
  );
}
