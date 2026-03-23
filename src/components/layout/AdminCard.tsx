import type { ReactNode } from "react";
import styles from "./AdminCard.module.css";

type AdminCardProps = {
  children: ReactNode;
};

export default function AdminCard({ children }: AdminCardProps) {
  return <div className={styles.card}>{children}</div>;
}