"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

const field =
  "w-full bg-base border border-line rounded-sm px-3 py-2.5 text-[13px] num focus:border-amber/60 focus:outline-none transition-colors";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw !== pw2) return setErr("Passwords do not match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(onClose, 1400);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[380px] panel rise p-5">
        <div className="eyebrow">Account</div>
        <h3 className="text-[16px] font-bold tracking-tight mb-4">Change Password</h3>
        {done ? (
          <div className="text-[13px] text-teal num py-4 text-center">✓ Password updated</div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="eyebrow block mb-1.5">New password</label>
              <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus
                className={field} placeholder="at least 8 characters" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Confirm password</label>
              <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} className={field} placeholder="repeat" />
            </div>
            {err && <div className="text-[11.5px] text-red num">{err}</div>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 border border-line text-ink-dim font-bold text-[12px] rounded-sm py-2.5 hover:bg-panel-2 transition-colors">
                CANCEL
              </button>
              <button type="submit" disabled={busy}
                className="flex-1 bg-amber text-base font-bold text-[12px] rounded-sm py-2.5 tracking-wide hover:bg-amber/90 disabled:opacity-60 transition-colors">
                {busy ? "SAVING…" : "UPDATE"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
