import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { getPoll, updatePoll } from "../../api/polls";
import PollForm from "../../components/PollForm";
import AdminCard from "../../components/layout/AdminCard";
import AdminPage from "../../components/layout/AdminPage";
import type {
  Poll,
  PollFormValues,
  PollOption,
  PollPayload,
} from "../../types/poll";

type ApiErrorResponse = {
  detail?: string;
  [key: string]: unknown;
};

function toDatetimeLocalValue(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function pollToFormValues(poll: Poll): PollFormValues {
  const options: PollOption[] = poll.options.length >= 2
    ? poll.options
    : [
        ...poll.options,
        ...Array.from({ length: 2 - poll.options.length }, (_, index) => ({
          text: "",
          order: poll.options.length + index,
        })),
      ];

  return {
    question: poll.question,
    description: poll.description,
    is_active: poll.is_active,
    starts_at: toDatetimeLocalValue(poll.starts_at),
    ends_at: toDatetimeLocalValue(poll.ends_at),
    options: options.map((option, index) => ({
      id: option.id,
      text: option.text,
      order: index,
      votes_count: option.votes_count,
    })),
  };
}

export default function PollEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPoll = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError("");
        const data = await getPoll(id);
        setPoll(data);
      } catch (err) {
        console.error("LOAD POLL ERROR:", err);
        setError("Anketu sa nepodarilo načítať.");
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id]);

  const handleSubmit = async (payload: PollPayload) => {
    if (!id || !poll || !poll.club) return;

    try {
      await updatePoll(id, {
        ...payload,
        club: poll.club,
      });

      navigate("/polls");
    } catch (submitError: unknown) {
      const axiosError = submitError as AxiosError<ApiErrorResponse>;

      console.error(
        "UPDATE POLL ERROR:",
        axiosError.response?.data || axiosError.message || submitError
      );

      alert(
        JSON.stringify(
          axiosError.response?.data || { detail: "Úprava ankety zlyhala." },
          null,
          2
        )
      );

      throw submitError;
    }
  };

  if (loading) {
    return (
      <AdminPage title="Upraviť anketu" subtitle="Načítavam anketu...">
        <AdminCard>Načítavam anketu...</AdminCard>
      </AdminPage>
    );
  }

  if (error) {
    return (
      <AdminPage title="Upraviť anketu" subtitle="Nepodarilo sa načítať dáta.">
        <AdminCard>{error}</AdminCard>
      </AdminPage>
    );
  }

  if (!poll || !poll.club) {
    return (
      <AdminPage title="Upraviť anketu" subtitle="Anketa neexistuje.">
        <AdminCard>Anketa neexistuje alebo nemá priradený klub.</AdminCard>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      title="Upraviť anketu"
      subtitle={`Upravujete anketu: ${poll.question}`}
    >
      <AdminCard>
        <PollForm
          initialValues={pollToFormValues(poll)}
          onSubmit={handleSubmit}
          submitLabel="Uložiť zmeny"
          clubId={poll.club}
        />
      </AdminCard>
    </AdminPage>
  );
}
