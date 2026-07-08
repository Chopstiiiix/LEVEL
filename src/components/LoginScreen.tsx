"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

const DEMO = [
  { role: "admin", email: "admin@level.africa", who: "Ada Okoro · Level Control", desc: "Full access + all data entry" },
  { role: "ops", email: "ops@level.africa", who: "Emeka Balogun · Apapa Desk", desc: "Readings, berths, alerts" },
  { role: "trader", email: "trader@level.africa", who: "Ngozi Ade · Sahara Trading", desc: "Prices, alerts" },
  { role: "exec", email: "exec@level.africa", who: "Tunde Bello · Board", desc: "Read-only overview" },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true); setErr("");
    const { error } = await signIn(email.trim(), password);
    if (error) { setErr(error); setBusy(false); }
    // on success, AuthProvider flips session → Shell renders the app
  };

  const quick = (em: string) => { setEmail(em); setPassword("level2026"); };

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4">
      <div className="w-full max-w-[880px] grid md:grid-cols-2 gap-0 panel overflow-hidden">
        {/* left — brand */}
        <div className="relative p-7 sm:p-8 flex flex-col justify-between gap-6 border-b md:border-b-0 md:border-r border-line bg-base-2/40 md:min-h-[440px]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 grid place-items-center">
                <div className="absolute inset-0 rounded-[3px] bg-amber/15 border border-amber/40" />
                <div className="w-3 h-3 bg-amber rounded-[1px]" />
              </div>
              <div className="leading-none">
                <div className="font-black text-[22px] tracking-[0.14em]">LEVEL</div>
                <div className="eyebrow !text-[8.5px] mt-0.5">Delivery Intelligence</div>
              </div>
            </div>
            <h2 className="mt-8 text-[19px] font-bold leading-snug tracking-tight">
              Real-time oil &amp; gas<br />delivery intelligence
            </h2>
            <p className="text-ink-mute text-[12.5px] mt-3 leading-relaxed max-w-[280px]">
              Live vessel tracking, tank-farm levels, Dangote output, pricing and alerts
              across Nigeria &amp; West Africa — one verified feed.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] num text-ink-mute">
            <span className="livedot" /> SECURE TERMINAL · ROLE-BASED ACCESS
          </div>
        </div>

        {/* right — form */}
        <div className="p-8 flex flex-col justify-center">
          <div className="eyebrow mb-1">Sign in</div>
          <h3 className="text-[16px] font-bold tracking-tight mb-5">Access your terminal</h3>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="eyebrow block mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                autoComplete="username" required
                className="w-full bg-base border border-line rounded-sm px-3 py-2.5 text-[13px] num
                  focus:border-amber/60 focus:outline-none transition-colors" placeholder="you@company.com" />
            </div>
            <div>
              <label className="eyebrow block mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password" required
                className="w-full bg-base border border-line rounded-sm px-3 py-2.5 text-[13px] num
                  focus:border-amber/60 focus:outline-none transition-colors" placeholder="••••••••" />
            </div>
            {err && <div className="text-[11.5px] text-red num">{err}</div>}
            <button type="submit" disabled={busy}
              className="w-full bg-amber text-base font-bold text-[13px] rounded-sm py-2.5 tracking-wide
                hover:bg-amber/90 disabled:opacity-60 transition-colors">
              {busy ? "AUTHENTICATING…" : "SIGN IN"}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_SHOW_DEMO === "true" && (
          <div className="mt-6">
            <div className="eyebrow mb-2">Demo accounts · click to fill (pw: level2026)</div>
            <div className="space-y-1">
              {DEMO.map((d) => (
                <button key={d.email} onClick={() => quick(d.email)}
                  className="w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-sm
                    hover:bg-panel-2 border border-transparent hover:border-line transition-colors group">
                  <span className="num text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-amber/12 text-amber w-14 text-center">
                    {d.role}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[11.5px] text-ink-dim truncate">{d.who}</span>
                    <span className="block text-[10px] text-ink-mute truncate">{d.desc}</span>
                  </span>
                  <span className="text-ink-mute text-[10px] num opacity-0 group-hover:opacity-100">→ fill</span>
                </button>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
