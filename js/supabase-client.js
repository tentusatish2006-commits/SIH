(function (w) {
  'use strict';
  var cfg = w.SMARTROUTE_SUPABASE || {};
  var client = null, readyPromise = null;
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) { resolve(); return; }
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { resolve(); }; s.onerror = function () { reject(new Error('load fail')); };
      document.head.appendChild(s);
    });
  }
  function ensureClient() {
    if (client) return Promise.resolve(client);
    if (readyPromise) return readyPromise;
    readyPromise = (async function () {
      if (!cfg.url || !cfg.anonKey) return null;
      try {
        if (!w.supabase || !w.supabase.createClient) {
          await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
        }
        if (!w.supabase || !w.supabase.createClient) return null;
        client = w.supabase.createClient(cfg.url, cfg.anonKey, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'sr_supabase_auth' }
        });
        return client;
      } catch (e) { console.warn('[SmartRoute] Supabase init failed', e); return null; }
    })();
    return readyPromise;
  }
  async function fromTable(table) { var c = await ensureClient(); return c ? c.from(table) : null; }
  async function selectAll(table, orderCol) {
    try {
      var q = await fromTable(table); if (!q) return null;
      var query = q.select('*'); if (orderCol) query = query.order(orderCol, { ascending: false });
      var res = await query; if (res.error) return null; return res.data || [];
    } catch (e) { return null; }
  }
  async function insertRow(table, row) {
    try {
      var q = await fromTable(table); if (!q) return null;
      var res = await q.insert(row).select().single();
      if (res.error) { console.warn('[SmartRoute] insert', table, res.error.message); return null; }
      return res.data;
    } catch (e) { return null; }
  }
  async function updateRow(table, match, patch) {
    try {
      var q = await fromTable(table); if (!q) return null;
      var query = q.update(patch);
      Object.keys(match || {}).forEach(function (k) { query = query.eq(k, match[k]); });
      var res = await query.select(); return res.error ? null : res.data;
    } catch (e) { return null; }
  }
  async function uploadFieldImage(file, pathHint) {
    var c = await ensureClient(); if (!c || !file) return null;
    var bucket = cfg.storageBucket || 'field-reports';
    var name = (pathHint || 'report') + '_' + Date.now() + '_' + (file.name || 'photo.jpg').replace(/[^\w.\-]/g, '_');
    var path = 'uploads/' + name;
    try {
      var up = await c.storage.from(bucket).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/jpeg' });
      if (up.error) { console.warn('[SmartRoute] storage', up.error.message); return null; }
      var pub = c.storage.from(bucket).getPublicUrl(path);
      return (pub && pub.data && pub.data.publicUrl) || null;
    } catch (e) { return null; }
  }
  async function signUp(email, password, meta) {
    var c = await ensureClient(); if (!c) return { error: 'Supabase unavailable' };
    return await c.auth.signUp({ email: email, password: password, options: { data: meta || {} } });
  }
  async function signIn(email, password) {
    var c = await ensureClient(); if (!c) return { error: 'Supabase unavailable' };
    return await c.auth.signInWithPassword({ email: email, password: password });
  }
  async function signOut() { var c = await ensureClient(); if (c) await c.auth.signOut(); }
  async function getSession() {
    var c = await ensureClient(); if (!c) return null;
    var res = await c.auth.getSession(); return res.data && res.data.session;
  }
  function subscribe(table, callback) {
    ensureClient().then(function (c) {
      if (!c) return;
      c.channel('sr_' + table).on('postgres_changes', { event: '*', schema: 'public', table: table }, function (payload) {
        try { callback(payload); } catch (e) {}
      }).subscribe();
    });
  }
  w.SmartRouteSupabase = {
    ensureClient: ensureClient, selectAll: selectAll, insertRow: insertRow, updateRow: updateRow,
    uploadFieldImage: uploadFieldImage, signUp: signUp, signIn: signIn, signOut: signOut,
    getSession: getSession, subscribe: subscribe, config: cfg
  };
})(window);
