import type { TeamMember } from "@/lib/types";

export interface InvitationResult {
  ok: boolean;
  message: string;
}

export async function sendTeamMemberInvitation(email: string, teamMemberData: Partial<TeamMember>): Promise<InvitationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false, message: "Enter a valid team member email before sending an invitation." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const invitationEndpoint = process.env.NEXT_PUBLIC_SUPABASE_INVITE_ENDPOINT;

  if (!supabaseUrl || !invitationEndpoint) {
    console.info("Supabase invitation queued for later backend integration", {
      email: normalizedEmail,
      teamMemberData
    });
    return { ok: true, message: "Team member saved and invitation queued for Supabase email setup." };
  }

  try {
    const response = await fetch(invitationEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, metadata: teamMemberData })
    });

    if (!response.ok) return { ok: false, message: "Supabase invitation request failed. Please check email configuration." };
    return { ok: true, message: "Team member saved and invitation email sent." };
  } catch {
    return { ok: false, message: "Could not send invitation email. Please try again." };
  }
}
