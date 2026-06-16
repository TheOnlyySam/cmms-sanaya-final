import type { CmmsState, Id, TeamMember } from "@/lib/types";
import { optionName } from "@/lib/utils";

const settingsRoles = new Set(["CMMS Admin", "Project Manager"]);

export function roleNameForMember(state: CmmsState, member?: TeamMember | null) {
  return member ? optionName(state.roles, member.roleId) : "";
}

export function canManageSettings(roleName: string) {
  return settingsRoles.has(roleName);
}

export function canManageSettingsForMember(state: CmmsState, member?: TeamMember | null) {
  return canManageSettings(roleNameForMember(state, member));
}

export function resolveCurrentMember(state: CmmsState, memberId?: Id | null) {
  const sessionMember = memberId ? state.teamMembers.find((member) => member.id === memberId) : undefined;
  if (sessionMember) return sessionMember;

  const configuredId = process.env.NEXT_PUBLIC_DEMO_MEMBER_ID as Id | undefined;
  const configuredMember = configuredId ? state.teamMembers.find((member) => member.id === configuredId) : undefined;
  if (configuredMember) return configuredMember;

  return state.teamMembers.find((member) => member.active) ?? state.teamMembers[0] ?? null;
}
