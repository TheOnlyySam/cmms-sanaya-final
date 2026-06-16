import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";

interface CreateUserPayload {
  email?: string;
  password?: string;
  displayName?: string;
  roleId?: string;
  companyId?: string;
}

export async function POST(request: NextRequest) {
  let supabase;
  try {
    supabase = createServerSupabaseAdminClient() as any;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin client is not configured.";
    return NextResponse.json({ message }, { status: 500 });
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ message: "Missing authorization token." }, { status: 401 });

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ message: "Invalid admin session." }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id,roles(name)")
    .eq("id", authData.user.id)
    .maybeSingle();

  const role = Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
  if (profileError || role?.name !== "CMMS Admin") {
    return NextResponse.json({ message: "Only CMMS Admin users can create system users." }, { status: 403 });
  }

  const payload = (await request.json()) as CreateUserPayload;
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password ?? "";
  const displayName = payload.displayName?.trim() || email;
  const roleId = payload.roleId;
  const companyId = payload.companyId || null;

  if (!email || !password || !roleId) {
    return NextResponse.json({ message: "Email, password, and role are required." }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 });
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName }
  });

  if (createError || !created.user) {
    return NextResponse.json({ message: createError?.message ?? "Could not create Supabase Auth user." }, { status: 400 });
  }

  const { error: insertError } = await supabase.from("users").upsert({
    id: created.user.id,
    email,
    display_name: displayName,
    role_id: roleId,
    company_id: companyId,
    status: "active"
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ message: insertError.message }, { status: 400 });
  }

  return NextResponse.json({
    user: {
      id: created.user.id,
      email,
      displayName,
      roleId,
      companyId
    }
  });
}
