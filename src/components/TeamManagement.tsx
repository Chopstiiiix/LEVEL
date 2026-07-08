"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth, type Role } from "@/lib/auth";

const ROLES: { value: Role; label: string; hint: string }[] = [
  { value: "admin", label: "Admin", hint: "Full access + user management" },
  { value: "ops", label: "Ops", hint: "Readings, berths, alerts" },
  { value: "trader", label: "Trader", hint: "Prices, alerts" },
  { value: "finance", label: "Finance", hint: "Pricing desk" },
  { value: "exec", label: "Exec", hint: "Read-only overview" },
  { value: "regulator", label: "Regulator", hint: "Read-only / compliance" },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

interface Row { id: string; email: string; full_name: string | null; org: string | null; role: Role; created_at: string; }

const label = "eyebrow block mb-1.5";
const field =
  "w-full bg-base border border-line rounded-sm px-2.5 py-2 text-[12.5px] num focus:border-amber/60 focus:outline-none transition-colors";

function genPassword() {
  const words = ["Level", "Delta", "Cargo", "Berth", "Crude", "Apapa", "Vessel", "Depot"];
  const w = words[Math.floor(Math.random() * words.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  const s = "!@#$%&".charAt(Math.floor(Math.random() * 6));
  return `${w}-${n}${s}`;
}

export default function TeamManagement() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ t: string; ok: boolean } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  // add-user form
  const [f, setF] = useState({ email: "", full_name: "", org: "", role: "ops" as Role, password: genPassword() });
  const [busy, setBusy] = useState(false);

  const toast = (t: string, ok = true) => { setMsg({ t, ok }); setTimeout(() => setMsg(null), 4000); };

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_users");
    if (error) toast(error.message, false);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const invoke = async (body: Record<string, unknown>) =>
    supabase.functions.invoke("admin-users", { body });

  const createUser = async () => {
    if (!f.email || !f.password) return toast("Email and a password are required", false);
    setBusy(true);
    const { data, error } = await invoke({ action: "create", ...f });
    setBusy(false);
    const err = error?.message || (data as { error?: string })?.error;
    if (err) return toast(err, false);
    setCreated({ email: f.email, password: f.password });
    toast("User created — share the credentials below");
    setF({ email: "", full_name: "", org: "", role: "ops", password: genPassword() });
    load();
  };

  const setRole = async (id: string, role: string) => {
    const { error } = await supabase.rpc("admin_set_role", { p_user: id, p_role: role });
    if (error) return toast(error.message, false);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, role: role as Role } : r)));
    toast(`Role updated to ${ROLE_LABEL[role]}`);
  };

  const resetPw = async (id: string, email: string) => {
    const password = genPassword();
    const { data, error } = await invoke({ action: "resetPassword", id, password });
    const err = error?.message || (data as { error?: string })?.error;
    if (err) return toast(err, false);
    setCreated({ email, password });
    toast("Password reset — share the new credentials below");
  };

  const remove = async (id: string) => {
    const { data, error } = await invoke({ action: "delete", id });
    const err = error?.message || (data as { error?: string })?.error;
    if (err) return toast(err, false);
    setConfirmId(null);
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast("User removed");
  };

  return (
    <div className="relative">
      <div className="mb-3">
        <div className="eyebrow">Administration · Access Control</div>
        <h2 className="text-[17px] font-bold tracking-tight">Team Management</h2>
        <p className="text-ink-mute text-[11.5px] mt-0.5 max-w-[680px]">
          Create client accounts and assign each a role. Users sign in with their own email and password —
          the role is fixed to their account and controls what they can see and do.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Add user */}
        <div className="lg:col-span-4 panel p-4 flex flex-col self-start">
          <div className="eyebrow mb-3">Invite / Create User</div>
          <div className="space-y-2.5">
            <div>
              <label className={label}>Email</label>
              <input className={field} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="client@company.com" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className={label}>Full name</label>
                <input className={field} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div>
                <label className={label}>Organisation</label>
                <input className={field} value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} placeholder="Company Ltd" />
              </div>
            </div>
            <div>
              <label className={label}>Role</label>
              <select className={field} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label} — {r.hint}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Temporary password</label>
              <div className="flex gap-2">
                <input className={field} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
                <button onClick={() => setF({ ...f, password: genPassword() })}
                  className="shrink-0 px-2.5 rounded-sm border border-line text-ink-mute hover:text-ink hover:bg-panel-2 text-[11px] num transition-colors">
                  ↻
                </button>
              </div>
              <p className="text-[10px] text-ink-mute mt-1">The client changes this after first sign-in.</p>
            </div>
          </div>
          <button onClick={createUser} disabled={busy}
            className="mt-3 w-full bg-amber text-base font-bold text-[12px] rounded-sm py-2 tracking-wide hover:bg-amber/90 disabled:opacity-60 transition-colors">
            {busy ? "CREATING…" : "CREATE USER"}
          </button>

          {created && (
            <div className="mt-3 bg-teal/10 border border-teal/40 rounded-sm p-3">
              <div className="eyebrow !text-teal mb-1.5">Share these credentials</div>
              <div className="num text-[12px] text-ink break-all">{created.email}</div>
              <div className="num text-[13px] text-teal font-semibold mt-0.5">{created.password}</div>
              <button onClick={() => setCreated(null)} className="mt-2 text-[10px] num text-ink-mute hover:text-ink">dismiss</button>
            </div>
          )}
        </div>

        {/* User list */}
        <div className="lg:col-span-8 panel flex flex-col">
          <div className="px-4 pt-3 pb-2 border-b border-line flex items-center justify-between">
            <div>
              <div className="eyebrow">Accounts</div>
              <h3 className="font-bold text-[14px] tracking-tight mt-0.5">{rows.length} User{rows.length === 1 ? "" : "s"}</h3>
            </div>
            <button onClick={load} className="text-[10px] num text-ink-mute hover:text-ink">↻ refresh</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[11.5px]">
              <thead>
                <tr className="eyebrow text-ink-mute">
                  <th className="text-left font-normal px-4 py-2">User</th>
                  <th className="text-left font-normal py-2">Organisation</th>
                  <th className="text-left font-normal py-2">Role</th>
                  <th className="text-right font-normal px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-mute num">loading…</td></tr>}
                {!loading && rows.map((r) => {
                  const self = r.id === profile?.id;
                  return (
                    <tr key={r.id} className="border-t border-line/60 hover:bg-panel-2 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="text-ink">{r.full_name ?? "—"}{self && <span className="ml-1.5 num text-[8.5px] uppercase text-ink-mute">you</span>}</div>
                        <div className="num text-[10px] text-ink-mute">{r.email}</div>
                      </td>
                      <td className="text-ink-dim">{r.org ?? "—"}</td>
                      <td>
                        <select value={r.role} disabled={self}
                          onChange={(e) => setRole(r.id, e.target.value)}
                          className="bg-base border border-line rounded-sm px-2 py-1 text-[11px] num focus:border-amber/60 focus:outline-none disabled:opacity-50">
                          {ROLES.map((ro) => <option key={ro.value} value={ro.value}>{ro.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => resetPw(r.id, r.email)}
                            className="num text-[10px] px-2 py-1 rounded-sm border border-line text-ink-mute hover:text-ink hover:bg-panel-2 transition-colors">
                            reset pw
                          </button>
                          {self ? (
                            <span className="num text-[10px] text-ink-mute/50 px-2">—</span>
                          ) : confirmId === r.id ? (
                            <button onClick={() => remove(r.id)}
                              className="num text-[10px] px-2 py-1 rounded-sm bg-red/15 text-red border border-red/40">
                              confirm?
                            </button>
                          ) : (
                            <button onClick={() => setConfirmId(r.id)}
                              className="num text-[10px] px-2 py-1 rounded-sm border border-line text-ink-mute hover:text-red hover:border-red/40 transition-colors">
                              remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && rows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-mute num">no users</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-sm border num text-[12px] rise
          ${msg.ok ? "bg-teal/15 border-teal/40 text-teal" : "bg-red/15 border-red/40 text-red"}`}>
          {msg.ok ? "✓ " : "✕ "}{msg.t}
        </div>
      )}
    </div>
  );
}
