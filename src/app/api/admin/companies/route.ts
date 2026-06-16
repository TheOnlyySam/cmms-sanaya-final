import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseAdminClient } from "@/lib/supabase/server";
import { slugifyCompanyName } from "@/lib/tenancy";

interface CreateCompanyPayload {
  companyName?: string;
  companyType?: string;
}

interface DeleteCompanyPayload {
  companyId?: string;
  confirmCompanyName?: string;
  confirmSubdomain?: string;
  confirmPhrase?: string;
}

async function assertCmmsAdmin(request: NextRequest, supabase: any) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false as const, response: NextResponse.json({ message: "Missing authorization token." }, { status: 401 }) };

  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return { ok: false as const, response: NextResponse.json({ message: "Invalid admin session." }, { status: 401 }) };

  const { data: profile, error: profileError } = await supabase.from("users").select("id,company_id,roles(name)").eq("id", authData.user.id).maybeSingle();
  const role = Array.isArray(profile?.roles) ? profile.roles[0] : profile?.roles;
  if (profileError || role?.name !== "CMMS Admin") {
    return { ok: false as const, response: NextResponse.json({ message: "Only CMMS Admin users can manage companies." }, { status: 403 }) };
  }

  return { ok: true as const, profile };
}

async function nextAvailableSubdomain(supabase: any, companyName: string) {
  const base = slugifyCompanyName(companyName);
  if (!base) return null;

  for (let index = 1; index <= 50; index += 1) {
    const candidate = index === 1 ? base : `${base}-${index}`;
    const { data, error } = await supabase.from("company_settings").select("id").eq("company_subdomain", candidate).maybeSingle();
    if (error) throw error;
    if (!data) return candidate;
  }

  return null;
}

export async function POST(request: NextRequest) {
  let supabase;
  try {
    supabase = createServerSupabaseAdminClient() as any;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin client is not configured.";
    return NextResponse.json({ message }, { status: 500 });
  }

  const admin = await assertCmmsAdmin(request, supabase);
  if (!admin.ok) return admin.response;

  const payload = (await request.json()) as CreateCompanyPayload;
  const companyName = payload.companyName?.trim();
  const companyType = payload.companyType?.trim() || null;

  if (!companyName) {
    return NextResponse.json({ message: "Company name is required." }, { status: 400 });
  }

  const companySubdomain = await nextAvailableSubdomain(supabase, companyName);
  if (!companySubdomain) {
    return NextResponse.json({ message: "Company name must include letters or numbers." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("company_settings")
    .insert({
      company_name: companyName,
      company_type: companyType,
      company_subdomain: companySubdomain
    })
    .select("id,company_name,company_type,company_subdomain")
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 });
  }

  return NextResponse.json({ company: data });
}

export async function DELETE(request: NextRequest) {
  let supabase;
  try {
    supabase = createServerSupabaseAdminClient() as any;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase admin client is not configured.";
    return NextResponse.json({ message }, { status: 500 });
  }

  const admin = await assertCmmsAdmin(request, supabase);
  if (!admin.ok) return admin.response;

  const payload = (await request.json()) as DeleteCompanyPayload;
  const companyId = payload.companyId;
  if (!companyId) {
    return NextResponse.json({ message: "Company id is required." }, { status: 400 });
  }

  const { data: company, error: companyError } = await supabase
    .from("company_settings")
    .select("id,company_name,company_subdomain")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) return NextResponse.json({ message: companyError.message }, { status: 400 });
  if (!company) return NextResponse.json({ message: "Company not found." }, { status: 404 });

  if (admin.profile?.company_id === company.id) {
    return NextResponse.json({ message: "You cannot delete the company assigned to your own admin account." }, { status: 400 });
  }

  const expectedPhrase = `DELETE ${company.company_name}`;
  const expectedSubdomain = company.company_subdomain ?? "";
  if (
    payload.confirmCompanyName?.trim() !== company.company_name ||
    payload.confirmSubdomain?.trim() !== expectedSubdomain ||
    payload.confirmPhrase?.trim() !== expectedPhrase
  ) {
    return NextResponse.json({ message: "Deletion confirmation did not match this company exactly." }, { status: 400 });
  }

  const { error } = await supabase.from("company_settings").delete().eq("id", company.id);
  if (error) return NextResponse.json({ message: error.message }, { status: 400 });

  return NextResponse.json({ deleted: true, companyId: company.id });
}
