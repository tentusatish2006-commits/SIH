(function () {
  'use strict';
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function toast(msg, type) {
    if (window.SmartRoute && SmartRoute.showToast) SmartRoute.showToast(msg, type || 'info');
    else console.log('[auth]', msg);
  }
  function saveLocalSession(user) {
    try {
      localStorage.setItem('sr_session', JSON.stringify({ user: user, at: Date.now() }));
      localStorage.setItem('sr_logged_in', '1');
      if (user && user.email) localStorage.setItem('sr_user_email', user.email);
      if (user && user.user_metadata && user.user_metadata.role)
        localStorage.setItem('sr_user_role', user.user_metadata.role);
    } catch (e) {}
  }
  function clearLocalSession() {
    try { localStorage.removeItem('sr_session'); localStorage.removeItem('sr_logged_in'); } catch (e) {}
  }
  async function handleLogin(email, password) {
    if (window.SmartRouteSupabase) {
      var res = await SmartRouteSupabase.signIn(email, password);
      if (res && res.data && res.data.user) {
        saveLocalSession(res.data.user);
        toast('Signed in with Supabase', 'success');
        return { ok: true, user: res.data.user, source: 'supabase' };
      }
      if (res && res.error) console.warn('[auth] supabase login', res.error.message || res.error);
    }
    try {
      var users = JSON.parse(localStorage.getItem('sr_users') || '[]') || [];
      var found = users.find(function (u) {
        return (u.username === email || u.email === email) && u.password === password;
      });
      if (found) {
        saveLocalSession({ email: email, user_metadata: { role: found.role || 'Field Officer', full_name: found.username } });
        toast('Signed in (local)', 'success');
        return { ok: true, user: found, source: 'local' };
      }
    } catch (e) {}
    return { ok: false, error: 'Invalid credentials' };
  }
  async function handleSignup(email, password, meta) {
    if (window.SmartRouteSupabase) {
      var res = await SmartRouteSupabase.signUp(email, password, meta || {});
      if (res && res.data && res.data.user) {
        saveLocalSession(res.data.user);
        toast('Account created', 'success');
        return { ok: true, user: res.data.user, source: 'supabase' };
      }
      if (res && res.error) toast(String(res.error.message || res.error), 'warn');
    }
    try {
      var users = JSON.parse(localStorage.getItem('sr_users') || '[]') || [];
      users.push({ username: (meta && meta.full_name) || email.split('@')[0], email: email, password: password, role: (meta && meta.role) || 'Field Officer', createdAt: Date.now() });
      localStorage.setItem('sr_users', JSON.stringify(users));
      saveLocalSession({ email: email, user_metadata: meta || {} });
      toast('Account created (local fallback)', 'success');
      return { ok: true, source: 'local' };
    } catch (e) { return { ok: false, error: 'Signup failed' }; }
  }
  async function handleLogout() {
    if (window.SmartRouteSupabase) await SmartRouteSupabase.signOut();
    clearLocalSession();
    toast('Signed out', 'info');
    window.location.href = 'login.html';
  }
  function wireLoginPage() {
    var form = qs('#login-form') || qs('form'); if (!form) return;
    form.addEventListener('submit', async function (e) {
      var emailEl = qs('input[type="email"]', form) || qs('#email', form) || qs('input[name="email"]', form) || qs('input[name="username"]', form);
      var passEl = qs('input[type="password"]', form) || qs('#password', form);
      if (!emailEl || !passEl) return;
      var email = (emailEl.value || '').trim(), password = passEl.value || '';
      if (!email || !password) return;
      e.preventDefault(); e.stopPropagation();
      var result = await handleLogin(email, password);
      if (result.ok) setTimeout(function () { window.location.href = 'dashboard.html'; }, 400);
      else toast(result.error || 'Login failed', 'warn');
    }, true);
  }
  function wireSignupPage() {
    var form = qs('#signup-form') || qs('form'); if (!form) return;
    form.addEventListener('submit', async function (e) {
      var emailEl = qs('input[type="email"]', form) || qs('#email', form);
      var passEl = qs('input[type="password"]', form) || qs('#password', form);
      var nameEl = qs('#name', form) || qs('input[name="name"]', form);
      if (!emailEl || !passEl) return;
      e.preventDefault(); e.stopPropagation();
      var meta = { full_name: nameEl ? nameEl.value : '', role: 'Field Officer' };
      var result = await handleSignup((emailEl.value || '').trim(), passEl.value || '', meta);
      if (result.ok) setTimeout(function () { window.location.href = 'dashboard.html'; }, 500);
    }, true);
  }
  document.addEventListener('DOMContentLoaded', function () {
    var path = (location.pathname || '').toLowerCase();
    if (path.indexOf('login') >= 0) wireLoginPage();
    if (path.indexOf('signup') >= 0 || path.indexOf('sign-up') >= 0) wireSignupPage();
    var logoutBtn = qs('[data-action="logout"]') || qs('#btn-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', function (e) { e.preventDefault(); handleLogout(); });
  });
  window.SmartRouteAuthSupabase = { login: handleLogin, signup: handleSignup, logout: handleLogout };
})();
