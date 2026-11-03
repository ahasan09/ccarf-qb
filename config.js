/* Cross-device sync configuration (optional).
 *
 * To enable login + progress sync:
 *   1. Create a free project at https://supabase.com
 *   2. Run the SQL in README.md ("Progress sync setup") in the SQL editor
 *   3. Fill in the two values below from Project Settings → API
 *
 * With CCARF_CONFIG = null the app works fully, storing progress in this
 * browser only.
 *
 * emailCode: set to true only once the sign-in e-mail contains a code. Supabase's
 * built-in mailer always sends its default template (link only); editing the
 * template to add {{ .Token }} needs custom SMTP. While false, sign-in is by
 * the e-mailed link and the app shows no code box.
 */
window.CCARF_CONFIG = {
  supabaseUrl: "https://nwceurthutlovstthseh.supabase.co",
  emailCode: false,
  supabaseAnonKey: "sb_publishable_76I4KuIZn-Ou2Ocsfj8rew_IOh6-q_Z",
};
