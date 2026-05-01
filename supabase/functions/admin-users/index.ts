import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error("Missing required env vars");
      return json({ error: "Server misconfigured" }, 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await anonClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error("Auth error:", userErr?.message);
      return json({ error: "Unauthorized" }, 401);
    }
    const caller = userData.user;

    const body = await req.json().catch(() => ({}));
    const { action } = body ?? {};

    if (action === "create") {
      const { email, password, name, color } = body;
      if (!email || !password || !name) {
        return json({ error: "Email, senha e nome são obrigatórios" }, 400);
      }

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError || !authData.user) {
        console.error("createUser error:", authError?.message);
        return json({ error: authError?.message ?? "Falha ao criar usuário" }, 400);
      }

      const { error: profileError } = await adminClient.from("profiles").insert({
        name,
        color: color || "#3B82F6",
        auth_user_id: authData.user.id,
      });
      if (profileError) {
        console.error("profile insert error:", profileError.message);
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return json({ error: profileError.message }, 400);
      }

      return json({ success: true, userId: authData.user.id });
    }

    if (action === "update") {
      const { profileId, name, color, newPassword } = body;
      if (!profileId) return json({ error: "Missing profileId" }, 400);

      const { data: profile } = await adminClient
        .from("profiles").select("auth_user_id").eq("id", profileId).maybeSingle();
      if (!profile) return json({ error: "Profile not found" }, 404);

      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (color) updates.color = color;
      if (Object.keys(updates).length > 0) {
        const { error } = await adminClient.from("profiles").update(updates).eq("id", profileId);
        if (error) return json({ error: error.message }, 400);
      }

      if (newPassword && profile.auth_user_id) {
        const { error } = await adminClient.auth.admin.updateUserById(
          profile.auth_user_id, { password: newPassword }
        );
        if (error) return json({ error: error.message }, 400);
      }

      return json({ success: true });
    }

    if (action === "delete") {
      const { profileId } = body;
      if (!profileId) return json({ error: "Missing profileId" }, 400);

      const { data: profile } = await adminClient
        .from("profiles").select("auth_user_id").eq("id", profileId).maybeSingle();
      if (!profile) return json({ error: "Profile not found" }, 404);
      if (profile.auth_user_id === caller.id) {
        return json({ error: "Você não pode excluir sua própria conta enquanto estiver logado." }, 400);
      }

      const { error: delErr } = await adminClient.from("profiles").delete().eq("id", profileId);
      if (delErr) return json({ error: delErr.message }, 400);

      if (profile.auth_user_id) {
        await adminClient.auth.admin.deleteUser(profile.auth_user_id);
      }

      return json({ success: true });
    }

    if (action === "list") {
      const { data, error } = await adminClient.from("profiles").select("*").order("created_at");
      if (error) return json({ error: error.message }, 400);
      return json({ profiles: data });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Unhandled error:", msg);
    return json({ error: msg }, 500);
  }
});
