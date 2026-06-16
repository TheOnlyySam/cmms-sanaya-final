"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { Children, isValidElement, useMemo, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const EMPTY_VALUE = "__empty_select_value__";

interface BaseProps {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
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

export function SelectField({
  label,
  required,
  className,
  children,
  value,
  defaultValue,
  onChange,
  name,
  disabled,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const options = useMemo(() => optionChildrenToOptions(children), [children]);
  const isControlled = value !== undefined;
  const nativeValue = String(isControlled ? value ?? "" : defaultValue ?? options[0]?.value ?? "");
  const [internalValue, setInternalValue] = useState(nativeValue);
  const currentValue = isControlled ? nativeValue : internalValue;
  const radixValue = currentValue === "" ? EMPTY_VALUE : currentValue;

  function updateValue(nextRadixValue: string) {
    const nextValue = nextRadixValue === EMPTY_VALUE ? "" : nextRadixValue;
    if (!isControlled) setInternalValue(nextValue);
    onChange?.({ target: { value: nextValue }, currentTarget: { value: nextValue } } as ChangeEvent<HTMLSelectElement>);
  }

  return (
    <Field label={label} required={required} className={className}>
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <Select.Root value={radixValue} onValueChange={updateValue} disabled={disabled}>
        <Select.Trigger className="form-select-trigger" aria-label={label} id={props.id}>
          <Select.Value placeholder="Select..." />
          <Select.Icon>
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="form-select-content" position="popper" sideOffset={6}>
            <Select.Viewport className="form-select-viewport">
              {options.map((option) => (
                <Select.Item className="form-select-item" disabled={option.disabled} key={`${option.value}-${option.label}`} value={option.value === "" ? EMPTY_VALUE : option.value}>
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator className="form-select-check">
                    <Check size={14} />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </Field>
  );
}

function optionChildrenToOptions(children: ReactNode): SelectOption[] {
  const options: SelectOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) return;
    const label = String(child.props.children ?? child.props.value ?? "");
    const value = child.props.value !== undefined ? String(child.props.value) : label;
    options.push({ value, label, disabled: child.props.disabled });
  });
  return options;
}
