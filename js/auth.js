/* ==========================================================================
   auth.js — demo sign up / sign in / account, stored in localStorage.
   This is a front-end demo: there is no server and passwords are NOT secure.
   ========================================================================== */
(function () {
  'use strict';
  var S = window.Sticky;
  var params = new URLSearchParams(window.location.search);

  function users() { return S.read(S.KEYS.users, []); }
  function currentUser() { return S.read(S.KEYS.user, null); }
  function findUser(email) {
    email = String(email).trim().toLowerCase();
    return users().filter(function (u) { return u.email === email; })[0] || null;
  }

  function signIn(email, password) {
    var u = findUser(email);
    if (!u || u.password !== password) return false;
    S.write(S.KEYS.user, { name: u.name, email: u.email, phone: u.phone || '' });
    return true;
  }

  /* Returns false when the email is already registered */
  function signUp(data) {
    if (findUser(data.email)) return false;
    var list = users();
    list.push({ name: data.name.trim(), email: data.email.trim().toLowerCase(), phone: data.phone || '', password: data.password, addresses: [] });
    S.write(S.KEYS.users, list);
    S.write(S.KEYS.user, { name: data.name.trim(), email: data.email.trim().toLowerCase(), phone: data.phone || '' });
    return true;
  }

  function updateUser(email, changes) {
    var list = users();
    list.forEach(function (u) { if (u.email === email) Object.keys(changes).forEach(function (k) { u[k] = changes[k]; }); });
    S.write(S.KEYS.users, list);
  }

  function signOut() { S.write(S.KEYS.user, null); }

  S.auth = { current: currentUser, find: findUser, signIn: signIn, signUp: signUp, signOut: signOut, update: updateUser };

  /* ---------- Sign in page ---------- */
  var signinForm = document.getElementById('signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var error = signinForm.querySelector('[data-form-error]');
      error.hidden = true;
      if (!S.validate(signinForm)) return;
      if (signIn(signinForm.email.value, signinForm.password.value)) {
        window.location.href = params.get('next') || 'account.html';
      } else {
        error.hidden = false;
      }
    });
    var forgot = document.querySelector('[data-forgot]');
    if (forgot) forgot.addEventListener('click', function () {
      document.querySelector('[data-forgot-note]').hidden = false;
    });
  }

  /* ---------- Sign up page ---------- */
  var signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var error = signupForm.querySelector('[data-form-error]');
      error.hidden = true;
      if (!S.validate(signupForm)) return;
      var ok = signUp({
        name: signupForm.elements.name.value, email: signupForm.email.value,
        phone: signupForm.phone.value, password: signupForm.password.value
      });
      if (!ok) { error.hidden = false; return; }
      /* show the "account created" state written in the HTML */
      document.querySelector('[data-signup-form]').hidden = true;
      var done = document.querySelector('[data-signup-done]');
      done.hidden = false;
      S.fill(done, { name: signupForm.elements.name.value.trim().split(' ')[0] });
      done.querySelector('a').focus();
    });
  }

  /* ---------- Account page ---------- */
  var account = document.querySelector('[data-account]');
  if (account) {
    var user = currentUser();
    document.querySelector('[data-account-guest]').hidden = !!user;
    account.hidden = !user;

    if (user) {
      var record = findUser(user.email) || user;
      S.fill(document.querySelector('[data-account-hello]'), { name: user.name.split(' ')[0], email: user.email });

      /* Tabs (also reachable by hash, e.g. account.html#orders) */
      var tabs = account.querySelectorAll('[role="tab"]');
      var showTab = function (id) {
        var found = false;
        tabs.forEach(function (t) { if (t.dataset.tab === id) found = true; });
        if (!found) id = tabs[0].dataset.tab;
        tabs.forEach(function (t) {
          var on = t.dataset.tab === id;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });
        account.querySelectorAll('[role="tabpanel"]').forEach(function (p) { p.hidden = p.id !== 'tab-' + id; });
      };
      tabs.forEach(function (t) {
        t.addEventListener('click', function () { showTab(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); });
      });
      account.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var list = Array.prototype.slice.call(tabs);
        var i = list.indexOf(document.activeElement);
        var next = list[(i + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + list.length) % list.length];
        next.focus(); next.click(); e.preventDefault();
      });
      showTab(window.location.hash.slice(1));

      /* Profile */
      var profile = document.getElementById('profile-form');
      profile.elements.name.value = user.name;
      profile.email.value = user.email;
      profile.phone.value = user.phone || '';
      profile.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!S.validate(profile)) return;
        var changes = { name: profile.elements.name.value.trim(), phone: profile.phone.value.trim() };
        updateUser(user.email, changes);
        S.write(S.KEYS.user, { name: changes.name, email: user.email, phone: changes.phone });
        S.toast('saved');
      });

      /* Orders placed with this email */
      var orderList = document.querySelector('[data-order-list]');
      var orders = S.read(S.KEYS.orders, []).filter(function (o) { return o.customer.email === user.email; }).reverse();
      orders.forEach(function (o) {
        var node = S.stamp('tpl-order', {
          id: o.id, date: o.dateText, total: S.money(o.totals.total), eta: o.eta,
          count: o.items.reduce(function (n, i) { return n + i.qty; }, 0),
          items: o.items.map(function (i) { return i.name + ' x ' + i.qty; }).join(', '),
          href: 'order-success.html?order=' + o.id
        });
        orderList.appendChild(node);
      });
      document.querySelector('[data-orders-empty]').hidden = orders.length > 0;

      /* Saved addresses */
      var addressList = document.querySelector('[data-address-list]');
      var renderAddresses = function () {
        var list = (findUser(user.email) || {}).addresses || [];
        addressList.textContent = '';
        list.forEach(function (a, i) {
          var node = S.stamp('tpl-address', { label: a.label, lines: [a.address, a.city, a.state, a.pin].filter(Boolean).join(', ') });
          node.dataset.index = i;
          addressList.appendChild(node);
        });
        document.querySelector('[data-addresses-empty]').hidden = list.length > 0;
      };
      var addressForm = document.getElementById('address-form');
      addressForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!S.validate(addressForm)) return;
        var list = (findUser(user.email) || record).addresses || [];
        list.push({ label: addressForm.label.value.trim(), address: addressForm.address.value.trim(), city: addressForm.city.value.trim(), state: addressForm.state.value.trim(), pin: addressForm.pin.value.trim() });
        updateUser(user.email, { addresses: list });
        addressForm.reset();
        renderAddresses();
        S.toast('saved');
      });
      addressList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-remove-address]');
        if (!btn) return;
        var list = (findUser(user.email) || {}).addresses || [];
        list.splice(Number(btn.closest('[data-index]').dataset.index), 1);
        updateUser(user.email, { addresses: list });
        renderAddresses();
      });
      renderAddresses();
    }
  }

  /* Log out buttons (account page, mobile menu) */
  document.addEventListener('click', function (e) {
    if (!e.target.closest('[data-logout]')) return;
    signOut();
    window.location.href = 'signin.html';
  });
})();
