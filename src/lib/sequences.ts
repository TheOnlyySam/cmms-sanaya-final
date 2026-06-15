import type { CmmsState } from "./types";

const pad = (value: number, size = 4) => String(value).padStart(size, "0");

export function nextSequence(state: CmmsState, key: string): [string, CmmsState] {
  const nextValue = (state.sequences[key] ?? 0) + 1;
  const year = new Date().getFullYear();
  const prefixes: Record<string, string> = {
    employee: "EMP",
    client: "CL",
    workOrder: "WO",
    report: "RPT"
  };
  const prefix = prefixes[key] ?? key.toUpperCase();
  return [`${prefix}-${year}-${pad(nextValue)}`, { ...state, sequences: { ...state.sequences, [key]: nextValue } }];
}

export function referenceForReport(kind: string, state: CmmsState): [string, CmmsState] {
  const [base, nextState] = nextSequence(state, "report");
  const prefix = kind === "Installation" ? "INST" : kind;
  return [`${prefix}-${base.replace("RPT-", "")}`, nextState];
}
