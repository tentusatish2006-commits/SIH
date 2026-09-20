/**
 * Supabase public configuration for SmartRoute NER
 * Publishable/anon key is safe for browser use (RLS enforces access).
 * Override via window.__SMARTROUTE_ENV__ before this script loads if needed.
 * Never put service_role / secret keys here.
 */
(function (w) {
  var env = w.__SMARTROUTE_ENV__ || {};
  w.SMARTROUTE_SUPABASE = {
    url: env.SUPABASE_URL || 'https://gndxlizvhsloebthjnow.supabase.co',
    anonKey: env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY ||
      'sb_publishable_GGzQ9xMvUL25ueGzJkTOwQ_fFBvN6jc',
    storageBucket: 'field-reports'
  };
})(window);
