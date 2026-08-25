// Supabase credentials for anonymous result sharing.
// Paste your Project URL + anon key here (Dashboard → Settings → API),
// or set SUPABASE_URL / SUPABASE_ANON_KEY environment variables instead
// (env vars take precedence). The anon key is safe to commit: the schema
// only allows it to insert runs, never read data back.
const SUPABASE_URL = "https://wxkrtjkmfavggratfpbg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Zm-XCzfe58IlHzugxx5cqw_4mk7hdo-";

module.exports = {
  url: (process.env.SUPABASE_URL || SUPABASE_URL).replace(/\/+$/, ""),
  anonKey: process.env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
};
