import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

interface BaseProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, required, children, className = "" }: BaseProps) {
  return (
    <label className={`field ${className}`}>
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

export function TextField({ label, required, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <Field label={label} required={required} className={className}>
      <input {...props} required={required} />
    </Field>
  );
}

export function TextAreaField({ label, required, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <Field label={label} required={required} className={className}>
      <textarea {...props} required={required} />
    </Field>
  );
}

export function SelectField({ label, required, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <Field label={label} required={required} className={className}>
      <select {...props} required={required}>
        {children}
      </select>
    </Field>
  );
}
