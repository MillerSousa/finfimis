import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!);
  const { data: { user: caller } } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

  const body = await req.json();
  const { action } = body;

  try {
    if (action === "create") {
      const { email, password, name, color } = body;
      if (!email || !password || !name) {
        return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
      }

      // Create auth user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders });

      // Create profile
      const { error: profileError } = await adminClient.from("profiles").insert({
        name,
        color: color || "#3B82F6",
        auth_user_id: authData.user.id,
      });
      if (profileError) {
        // Rollback: delete auth user
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: profileError.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true, userId: authData.user.id }), { headers: corsHeaders });
    }

    if (action === "update") {
      const { profileId, name, color, newPassword } = body;
      if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: corsHeaders });

      // Get the profile to find auth_user_id
      const { data: profile } = await adminClient.from("profiles").select("auth_user_id").eq("id", profileId).single();
      if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });

      // Update profile
      const updates: Record<string, unknown> = {};
      if (name) updates.name = name;
      if (color) updates.color = color;
      if (Object.keys(updates).length > 0) {
        await adminClient.from("profiles").update(updates).eq("id", profileId);
      }

      // Update password if provided
      if (newPassword && profile.auth_user_id) {
        const { error } = await adminClient.auth.admin.updateUserById(profile.auth_user_id, { password: newPassword });
        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "delete") {
      const { profileId } = body;
      if (!profileId) return new Response(JSON.stringify({ error: "Missing profileId" }), { status: 400, headers: corsHeaders });

      // Prevent self-deletion
      const { data: profile } = await adminClient.from("profiles").select("auth_user_id").eq("id", profileId).single();
      if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: corsHeaders });
      if (profile.auth_user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Você não pode excluir sua própria conta enquanto estiver logado." }), { status: 400, headers: corsHeaders });
      }

      // Delete profile (cascade deletes related data)
      await adminClient.from("profiles").delete().eq("id", profileId);

      // Delete auth user
      if (profile.auth_user_id) {
        await adminClient.auth.admin.deleteUser(profile.auth_user_id);
      }

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (action === "list") {
      // List all profiles (admin view)
      const { data, error } = await adminClient.from("profiles").select("*").order("created_at");
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      return new Response(JSON.stringify({ profiles: data }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
