/* Cross-device progress sync via Supabase (optional — see config.js).
 * Loaded as a module; exposes window.CCARF_SYNC when configured.
 *
 * This file is only the network adapter. The read → replay → compare-and-swap
 * algorithm lives in createSyncEngine() in app.js, where it is unit-tested. */

const cfg = window.CCARF_CONFIG;

if (cfg && cfg.supabaseUrl && cfg.supabaseAnonKey) {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const sb = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
    const Store = window.CCARF_STORE;

    let user = null;
    let debounceTimer = null;
    let inFlight = null;
    let rerun = false;
    let status = "idle"; // idle | syncing | synced | offline | error
    let lastError = "";

    const announce = () => window.dispatchEvent(new CustomEvent("ccarf:auth"));

    function setStatus(next, err) {
      status = next;
      lastError = err || "";
      announce();
    }

    const engine = window.createSyncEngine({
      store: Store,
      readRow: async () => {
        const { data, error } = await sb
          .from("progress")
          .select("data, updated_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        return data ? { data: data.data, stamp: data.updated_at } : null;
      },
      writeRow: async (state, expectedStamp) => {
        const now = new Date().toISOString();
        if (expectedStamp === null) {
          const { error } = await sb
            .from("progress")
            .insert({ user_id: user.id, data: state, updated_at: now });
          if (error) {
            if (error.code === "23505") return { ok: false }; // row exists; re-read
            throw error;
          }
          return { ok: true, stamp: now };
        }
        /* Only overwrite the row we actually read: if another device wrote in
         * the meantime, no row matches and the engine re-reads and replays. */
        const { data, error } = await sb
          .from("progress")
          .update({ data: state, updated_at: now })
          .eq("user_id", user.id)
          .eq("updated_at", expectedStamp)
          .select("updated_at");
        if (error) throw error;
        if (!data || !data.length) return { ok: false };
        return { ok: true, stamp: data[0].updated_at };
      },
    });

    function sync() {
      if (!user) return Promise.resolve();
      if (inFlight) { rerun = true; return inFlight; }
      setStatus("syncing");
      inFlight = engine
        .sync()
        .then(() => {
          localStorage.setItem("ccarf.syncedAt", String(Date.now()));
          setStatus("synced");
        })
        .catch((e) => {
          const offline = typeof navigator !== "undefined" && navigator.onLine === false;
          setStatus(offline ? "offline" : "error", e && e.message ? e.message : String(e));
        })
        .then(() => {
          inFlight = null;
          if (rerun) { rerun = false; return sync(); }
        });
      return inFlight;
    }

    window.CCARF_SYNC = {
      enabled: true,
      user: () => user,
      status: () => status,
      error: () => lastError,
      pendingCount: () => Store.pending.length,
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

      if (!user && previousId) {
        engine.forget();
        localStorage.removeItem("ccarf.uid");
        window.dispatchEvent(new CustomEvent("ccarf:signout"));
        setStatus("idle");
        return;
      }
      announce();
      if (user && user.id !== previousId) {
        engine.forget();
        /* Progress cached for another account must never be folded into this
         * one; only anonymous work on this device carries over. */
        const cachedUid = localStorage.getItem("ccarf.uid");
        if (cachedUid && cachedUid !== user.id) Store.reset();
        localStorage.setItem("ccarf.uid", user.id);
        sync();
      }
    });

    /* Debounced, but never postponed indefinitely: a steady stream of answers
     * must still reach the server during a long exam. */
    let firstPendingAt = 0;
    const MAX_WAIT = 15000;
    window.addEventListener("ccarf:changed", () => {
      if (!user) return;
      if (!firstPendingAt) firstPendingAt = Date.now();
      clearTimeout(debounceTimer);
      const waited = Date.now() - firstPendingAt;
      const delay = waited >= MAX_WAIT ? 0 : Math.min(1200, MAX_WAIT - waited);
      debounceTimer = setTimeout(() => { firstPendingAt = 0; sync(); }, delay);
    });

    const flush = () => {
      if (user && Store.pending.length) { clearTimeout(debounceTimer); sync(); }
    };
    const refresh = () => { if (user) sync(); };

    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flush();
      else refresh();
    });
    /* Another tab in this browser changed progress. */
    window.addEventListener("storage", (e) => {
      if (e.key === "ccarf.progress" && user) sync();
    });

    announce();
  } catch (e) {
    console.warn("Sync unavailable:", e);
    window.CCARF_SYNC = {
      enabled: true,
      unavailable: true,
      user: () => null,
      status: () => "error",
      error: () => "Sync could not start — the client library failed to load. Progress is saved on this device.",
      syncedAt: () => Number(localStorage.getItem("ccarf.syncedAt") || 0),
      pendingCount: () => 0,
      sendCode: async () => { throw new Error("Sync is unavailable right now."); },
      verify: async () => { throw new Error("Sync is unavailable right now."); },
      signOut: async () => {},
      syncNow: () => Promise.resolve(),
    };
    try { window.dispatchEvent(new CustomEvent("ccarf:auth")); } catch (_) {}
  }
}
