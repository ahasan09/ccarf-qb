/* Cross-device progress sync via Supabase (optional — see config.js).
 * Loaded as a module; exposes window.CCARF_SYNC when configured.
 *
 * Every sync is fetch → merge → apply → push. Because the merge is
 * convergent, devices never overwrite each other: a device that has been
 * offline contributes its work on its next sync instead of erasing newer
 * progress (or being erased by it). */

const cfg = window.CCARF_CONFIG;
const SYNC_KEYS = ["ccarf.history", "ccarf.weak", "ccarf.correctEver", "ccarf.session"];

if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

    let user = null;
    let pushTimer = null;
    let inFlight = null; // serializes overlapping syncs
    let again = false; // a change arrived while a sync was running
    let status = "idle"; // idle | syncing | synced | error
    let lastError = "";

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

    /* Writes localStorage directly, never through the app's LS helper, so
     * applying a sync result cannot re-trigger a change event and loop. */
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

    function setStatus(next, err) {
      status = next;
      lastError = err || "";
      announce();
    }

    async function syncOnce() {
      if (!user) return;
      setStatus("syncing");

      const { data: row, error } = await sb
        .from("progress")
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return setStatus("error", error.message);

      const local = collect();
      const merged = window.mergeProgress(local, (row && row.data) || {});

      apply(merged);

      const { error: writeError } = await sb.from("progress").upsert({
        user_id: user.id,
        data: merged,
        updated_at: new Date().toISOString(),
      });
      if (writeError) return setStatus("error", writeError.message);

      localStorage.setItem("ccarf.syncedAt", String(Date.now()));
      setStatus("synced");
    }

    /* One sync at a time; a request arriving mid-flight runs once after. */
    function sync() {
      if (inFlight) { again = true; return inFlight; }
      inFlight = syncOnce()
        .catch((e) => setStatus("error", e && e.message ? e.message : String(e)))
        .then(() => {
          inFlight = null;
          if (again) { again = false; return sync(); }
        });
      return inFlight;
    }

    window.CCARF_SYNC = {
      enabled: true,
      user: () => user,
      status: () => status,
      error: () => lastError,
      syncedAt: () => Number(localStorage.getItem("ccarf.syncedAt") || 0),
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
      syncNow: () => sync(),
    };

    sb.auth.onAuthStateChange((_event, session) => {
      const previousId = user && user.id;
      user = session ? session.user : null;
      announce();
      if (user && user.id !== previousId) sync();
    });

    window.addEventListener("ccarf:changed", () => {
      if (!user) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(sync, 1500);
    });

    /* Pick up a sibling tab's or another device's work when returning. */
    window.addEventListener("focus", () => {
      if (user && status !== "syncing") sync();
    });

    announce();
  } catch (e) {
    console.warn("Sync unavailable:", e);
  }
}
