import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function Card({ title, action, children, className = "", ...props }: CardProps) {
  return (
    <section className={`card ${className}`} {...props}>
      {title ? (
        <div className="card-header">
          <h3>{title}</h3>
          {action ? <div className="card-action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
