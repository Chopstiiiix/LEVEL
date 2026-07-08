// LEVEL — admin user management.
// Creates / deletes users and resets passwords via the GoTrue admin API
// (service role). Every call is gated: the caller's JWT must belong to an
// admin (checked through the public.is_level_admin() RPC). The new user's
// role/name/org ride in user_metadata and the on_auth_user_created trigger
// writes the level.profiles row.
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["admin", "ops", "trader", "finance", "exec", "regulator"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // 1) verify the caller is a LEVEL admin (runs the RPC as the caller)
    const caller = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin, error: adminErr } = await caller.rpc("is_level_admin");
    if (adminErr) return json({ error: adminErr.message }, 400);
    if (!isAdmin) return json({ error: "Not authorized — admin only." }, 403);

    // 2) perform the privileged action with the service role
    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "create") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      const role = String(body.role ?? "trader");
      if (!email || !password) return json({ error: "Email and password are required." }, 400);
      if (password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
      if (!ROLES.includes(role)) return json({ error: `Invalid role: ${role}` }, 400);

      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: String(body.full_name ?? "").trim() || null,
          org: String(body.org ?? "").trim() || null,
          role,
        },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, id: data.user?.id, email });
    }

    if (action === "delete") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "Missing user id." }, 400);
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "resetPassword") {
      const id = String(body.id ?? "");
      const password = String(body.password ?? "");
      if (!id || password.length < 8) return json({ error: "Missing id or password too short." }, 400);
      const { error } = await admin.auth.admin.updateUserById(id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
