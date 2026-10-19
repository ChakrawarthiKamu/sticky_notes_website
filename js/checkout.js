/* ==========================================================================
   checkout.js — checkout form, demo payment, order creation, success page.
   No real payment is taken. Card details are validated and then discarded.
   ========================================================================== */
(function () {
  'use strict';
  var S = window.Sticky;

  /* ======================= CHECKOUT PAGE ======================= */
  var form = document.getElementById('checkout-form');
  if (form) {
    var modeBox = document.querySelector('[data-checkout-modes]');
    var signedBox = document.querySelector('[data-signed-in]');
    var signinForm = document.getElementById('checkout-signin');
    var accountFields = form.querySelector('[data-create-fields]');

    /* Guest / create account / sign in */
    var setMode = function (mode) {
      signinForm.hidden = mode !== 'signin';
      accountFields.hidden = mode !== 'create';
      form.dataset.mode = mode;
    };

    var prefill = function () {
      var user = S.auth.current();
      modeBox.hidden = !!user;
      signedBox.hidden = !user;
      if (!user) return;
      setMode('user');
      S.fill(signedBox, { name: user.name, email: user.email });
      var parts = user.name.split(' ');
      form.firstName.value = form.firstName.value || parts[0];
      form.lastName.value = form.lastName.value || parts.slice(1).join(' ');
      form.email.value = user.email;
      form.phone.value = form.phone.value || user.phone || '';
      var saved = ((S.auth.find(user.email) || {}).addresses || [])[0];
      if (saved && !form.address.value) {
        form.address.value = saved.address; form.city.value = saved.city;
        form.state.value = saved.state; form.pin.value = saved.pin;
      }
    };

    modeBox.addEventListener('change', function (e) { if (e.target.name === 'mode') setMode(e.target.value); });
    setMode('guest');
    prefill();

    signinForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var error = signinForm.querySelector('[data-form-error]');
      error.hidden = true;
      if (!S.validate(signinForm)) return;
      if (S.auth.signIn(signinForm.email.value, signinForm.password.value)) { signinForm.hidden = true; prefill(); }
      else error.hidden = false;
    });

    /* Delivery method changes the shipping line in the summary */
    var setDelivery = function () {
      var chosen = form.querySelector('[name="delivery"]:checked');
      S.deliveryFee = chosen.dataset.fee === 'auto' ? null : Number(chosen.dataset.fee);
      S.cart.render();
    };
    form.querySelectorAll('[name="delivery"]').forEach(function (r) { r.addEventListener('change', setDelivery); });
    setDelivery();

    /* Payment method shows its own fields */
    var setPayment = function () {
      var chosen = form.querySelector('[name="payment"]:checked');
      form.querySelectorAll('[data-pay-panel]').forEach(function (p) { p.hidden = p.dataset.payPanel !== chosen.dataset.pay; });
    };
    form.querySelectorAll('[name="payment"]').forEach(function (r) { r.addEventListener('change', setPayment); });
    setPayment();

    /* Tidy card inputs as they are typed */
    form.addEventListener('input', function (e) {
      var el = e.target;
      if (el.name === 'cardNumber') el.value = el.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
      if (el.name === 'cardExpiry') el.value = el.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2');
      if (el.name === 'cardCvv' || el.name === 'pin') el.value = el.value.replace(/\D/g, '').slice(0, el.name === 'pin' ? 6 : 4);
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var items = S.cart.get();
      if (!items.length) return;
      var accountError = form.querySelector('[data-account-error]');
      accountError.hidden = true;
      if (!S.validate(form)) { S.toast('fix-form'); return; }

      var name = (form.firstName.value.trim() + ' ' + form.lastName.value.trim()).trim();

      /* Create the account first if that option was chosen */
      if (form.dataset.mode === 'create') {
        var made = S.auth.signUp({ name: name, email: form.email.value, phone: form.phone.value.trim(), password: form.newPassword.value });
        if (!made) { accountError.hidden = false; accountError.scrollIntoView({ block: 'center' }); return; }
      }

      var delivery = form.querySelector('[name="delivery"]:checked');
      var payment = form.querySelector('[name="payment"]:checked');
      var now = new Date();
      var arrive = new Date(now.getTime() + Number(delivery.dataset.days) * 86400000);
      var dateOpts = { day: 'numeric', month: 'short', year: 'numeric' };

      var order = {
        id: (document.body.dataset.orderPrefix || '') + String(now.getTime()).slice(-8),
        date: now.toISOString(),
        dateText: now.toLocaleDateString(S.settings.locale, dateOpts),
        eta: arrive.toLocaleDateString(S.settings.locale, { weekday: 'long', day: 'numeric', month: 'short' }),
        items: items,
        totals: S.cart.totals(),
        delivery: delivery.dataset.label,
        payment: payment.dataset.label, // method name only; no card details are stored
        customer: { name: name, email: form.email.value.trim().toLowerCase(), phone: form.phone.value.trim() },
        address: [form.address.value, form.city.value, form.state.value, form.pin.value, form.country.value].map(function (v) { return v.trim(); }).filter(Boolean).join(', ')
      };

      var orders = S.read(S.KEYS.orders, []);
      orders.push(order);
      S.write(S.KEYS.orders, orders);

      /* remember the address for signed-in customers who ask for it */
      var user = S.auth.current();
      if (user && form.saveAddress && form.saveAddress.checked) {
        var list = (S.auth.find(user.email) || {}).addresses || [];
        list.push({ label: form.city.value.trim(), address: form.address.value.trim(), city: form.city.value.trim(), state: form.state.value.trim(), pin: form.pin.value.trim() });
        S.auth.update(user.email, { addresses: list });
      }

      /* Simulated payment: short pause, then the confirmation page */
      var button = form.querySelector('[type="submit"]');
      button.disabled = true;
      button.querySelector('[data-pay-idle]').hidden = true;
      button.querySelector('[data-pay-busy]').hidden = false;
      setTimeout(function () {
        S.cart.clear();
        window.location.href = 'order-success.html?order=' + order.id;
      }, 900);
    });
  }

  /* ======================= ORDER SUCCESS PAGE ======================= */
  var success = document.querySelector('[data-success]');
  if (success) {
    var orders = S.read(S.KEYS.orders, []);
    var wanted = new URLSearchParams(window.location.search).get('order');
    var order = orders.filter(function (o) { return o.id === wanted; })[0] || orders[orders.length - 1];

    success.hidden = !order;
    document.querySelector('[data-success-none]').hidden = !!order;

    if (order) {
      S.fill(success, {
        id: order.id, eta: order.eta, date: order.dateText,
        name: order.customer.name.split(' ')[0], email: order.customer.email,
        address: order.address, delivery: order.delivery, payment: order.payment,
        subtotal: S.money(order.totals.subtotal),
        discount: '-' + S.money(order.totals.discount),
        shipping: order.totals.shipping === 0 ? (document.body.dataset.freeLabel || '') : S.money(order.totals.shipping),
        total: S.money(order.totals.total)
      });
      success.querySelectorAll('[data-order-discount]').forEach(function (el) { el.hidden = order.totals.discount === 0; });
      var list = success.querySelector('[data-order-lines]');
      order.items.forEach(function (i) {
        list.appendChild(S.stamp('tpl-order-line', {
          name: i.name, image: i.image, qty: i.qty,
          variant: [i.color, i.size].filter(Boolean).join(' / '),
          price: S.money(i.price * i.qty)
        }));
      });
    }
  }
})();
