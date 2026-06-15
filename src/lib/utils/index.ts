import type { Id } from "@/lib/types";

export const uid = (prefix = "id"): Id =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const todayIso = () => new Date().toISOString().slice(0, 10);

export const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const formatDate = (value?: string) => {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "SS";

export const byId = <T extends { id: Id }>(records: T[], id?: Id) => records.find((record) => record.id === id);

export const optionName = <T extends { id: Id; name?: string; fullName?: string; assetName?: string; title?: string }>(
  records: T[],
  id?: Id
) => {
  const record = records.find((item) => item.id === id);
  return record?.name ?? record?.fullName ?? record?.assetName ?? record?.title ?? "Not selected";
};

export const countBy = <T,>(items: T[], getKey: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
