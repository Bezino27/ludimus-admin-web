import type { ReactNode } from "react";
import styles from "./AdminPage.module.css";

type AdminPageProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export default function AdminPage({
  title,
  subtitle,
  children,
}: AdminPageProps) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}