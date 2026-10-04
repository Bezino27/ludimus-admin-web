import { createContext, useContext } from "react";

export type ConfirmOptions = {
  title: string;
  message: string;
  subject?: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  requireSecondStep?: boolean;
};

export const ConfirmContext = createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) {
    throw new Error("useConfirm musí byť použitý v ConfirmProvider.");
  }
  return confirm;
}
