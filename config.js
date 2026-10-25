/* Cross-device sync configuration (optional).
 *
 * To enable login + progress sync:
 *   1. Create a free project at https://supabase.com
 *   2. Run the SQL in README.md ("Progress sync setup") in the SQL editor
 *   3. Fill in the two values below from Project Settings → API
 *
 * With CCARF_CONFIG = null the app works fully, storing progress in this
 * browser only.
 */
window.CCARF_CONFIG = null;
// window.CCARF_CONFIG = {
//   supabaseUrl: "https://YOUR-PROJECT-ref.supabase.co",
//   supabaseAnonKey: "YOUR-ANON-PUBLIC-KEY",
// };
