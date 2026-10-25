/* Cross-device progress sync via Supabase (optional — see config.js).
 * Loaded as a module; exposes window.CCARF_SYNC when configured. */

const cfg = window.CCARF_CONFIG;
const SYNC_KEYS = ["ccarf.history", "ccarf.weak", "ccarf.correctEver", "ccarf.session"];

if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    let user = null;
    let pushTimer = null;
    let status = "idle"; // idle | syncing | synced | error

    const localStamp = () => Number(localStorage.getItem("ccarf.syncUpdatedAt") || 0);

    function collect() {
      const data = {};
      for (const key of SYNC_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try { data[key] = JSON.parse(raw); } catch (e) { /* skip corrupt */ }
        }
      }
      return data;
    }

    function apply(data) {
      for (const key of SYNC_KEYS) {
        if (key in data && data[key] !== null) {
          localStorage.setItem(key, JSON.stringify(data[key]));
        } else {
          localStorage.removeItem(key);
        }
      }
    }

    function announce() {
      window.dispatchEvent(new CustomEvent("ccarf:auth"));
    }

    async function push() {
      if (!user) return;
      status = "syncing"; announce();
      const { error } = await sb.from("progress").upsert({
        user_id: user.id,
        data: collect(),
        updated_at: new Date(localStamp() || Date.now()).toISOString(),
      });
      status = error ? "error" : "synced";
      announce();
    }

    async function pull() {
      if (!user) return;
      status = "syncing"; announce();
      const { data: row, error } = await sb
        .from("progress")
        .select("data, updated_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) { status = "error"; announce(); return; }
      if (row && new Date(row.updated_at).getTime() > localStamp()) {
        apply(row.data || {});
        localStorage.setItem("ccarf.syncUpdatedAt", String(new Date(row.updated_at).getTime()));
        status = "synced"; announce();
      } else {
        await push();
      }
    }

    window.CCARF_SYNC = {
      enabled: true,
      user: () => user,
      status: () => status,
      sendCode: async (email) => {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: location.origin + location.pathname },
        });
        if (error) throw error;
      },
      verify: async (email, code) => {
        const { error } = await sb.auth.verifyOtp({ email, token: code, type: "email" });
        if (error) throw error;
      },
      signOut: async () => { await sb.auth.signOut(); },
      syncNow: () => pull(),
    };

    sb.auth.onAuthStateChange((_event, session) => {
      const wasUser = user && user.id;
      user = session ? session.user : null;
      announce();
      if (user && user.id !== wasUser) pull();
    });

    window.addEventListener("ccarf:changed", () => {
      if (!user) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 1500);
    });

    announce();
  } catch (e) {
    console.warn("Sync unavailable:", e);
  }
}
