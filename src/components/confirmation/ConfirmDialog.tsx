import {
  useCallback,
  useState,
  type ReactNode,
} from "react";
import styles from "./ConfirmDialog.module.css";
import { ConfirmContext, type ConfirmOptions } from "./useConfirm";

type PendingConfirmation = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

function getQuestion(pending: PendingConfirmation) {
  const action = pending.title.replace(/\?$/, "");
  const normalizedAction = `${action.charAt(0).toLowerCase()}${action.slice(1)}`;
  return `Chceš naozaj ${normalizedAction}${
    pending.subject ? ` „${pending.subject}“` : ""
  }?`;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <div
          className={styles.backdrop}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close(false);
          }}
        >
          <div
            className={`${styles.dialog} ${
              pending.variant === "warning" ? styles.warning : ""
            }`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
          >
            <div className={styles.accent} />
            <div className={styles.content}>
              <h2 id="confirm-dialog-title" className={styles.title}>
                {getQuestion(pending)}
              </h2>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.cancel}`}
                onClick={() => close(false)}
              >
                Zrušiť
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.confirm}`}
                onClick={() => close(true)}
                autoFocus
              >
                {pending.confirmLabel || "Áno"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
