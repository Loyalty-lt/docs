/*!
 * Loyalty.lt address widget
 *
 * Turns one text input into an address field backed by the Lithuanian address
 * register: suggestions as you type, and the postal code, city and registry code
 * filled in from the chosen address rather than typed by the customer.
 *
 * No dependencies, no build step, ~6 KB. Drop the script on the page and point it
 * at your own endpoint — the widget never carries an API key, because anything a
 * browser holds is public. Your server proxies to Loyalty.lt with the credentials.
 *
 *   <script src="https://docs.loyalty.lt/widget/loyalty-address.js"></script>
 *   <script>
 *     LoyaltyAddress.attach('#address', {
 *       endpoint: '/api/address-search',   // your proxy
 *       fields: { city: '#city', postalCode: '#postal_code' },
 *       onSelect: (address) => console.log(address.code, address.postal_code),
 *     });
 *   </script>
 */
(function (global) {
  'use strict';

  var DEFAULTS = {
    endpoint: 'https://api.loyalty.lt/lt/addresses/search',
    minLength: 3,
    debounce: 250,
    limit: 8,
    locale: 'lt',
    labels: {
      searching: 'Ieškoma…',
      empty: 'Tokio adreso registre nėra',
      error: 'Paieška laikinai neveikia',
    },
  };

  var STYLE_ID = 'loyalty-address-style';
  var CSS = [
    '.la-wrap{position:relative}',
    '.la-list{position:absolute;z-index:9999;left:0;right:0;margin:4px 0 0;padding:4px 0;list-style:none;',
    'background:#fff;border:1px solid #e3e3e0;border-radius:10px;box-shadow:0 12px 28px -12px rgba(20,40,25,.35);',
    'max-height:280px;overflow:auto;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
    '.la-item{display:block;width:100%;text-align:left;border:0;background:none;padding:8px 12px;cursor:pointer;color:#19352d}',
    '.la-item:hover,.la-item[aria-selected="true"]{background:#f1f5f2}',
    '.la-main{display:block;font-weight:600}',
    '.la-sub{display:block;font-size:12px;color:#6b7280;margin-top:1px}',
    '.la-note{padding:8px 12px;color:#6b7280;font:13px system-ui,sans-serif}',
    '@media (prefers-color-scheme:dark){',
    '.la-list{background:#19352d;border-color:#29594b;box-shadow:0 12px 28px -12px rgba(0,0,0,.6)}',
    '.la-item{color:#ebf3ee}.la-item:hover,.la-item[aria-selected="true"]{background:#29594b}',
    '.la-sub,.la-note{color:#a7bdb2}}',
  ].join('');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function resolve(target) {
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  /** „Gedimino pr. 9" — gatvė su numeriu, be miesto: miestas eina į savo lauką. */
  function streetLine(row) {
    if (!row.street) return row.full_address;
    return ((row.street.display_name || row.street.name) + ' ' + (row.number || '')).trim();
  }

  function Widget(input, options) {
    var opts = Object.assign({}, DEFAULTS, options || {});
    opts.labels = Object.assign({}, DEFAULTS.labels, (options || {}).labels || {});

    var wrap = el('div', 'la-wrap');
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);

    var list = el('ul', 'la-list');
    list.hidden = true;
    list.setAttribute('role', 'listbox');
    wrap.appendChild(list);

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');

    var rows = [];
    var active = -1;
    var timer = null;
    var seq = 0;

    function close() {
      list.hidden = true;
      list.innerHTML = '';
      input.setAttribute('aria-expanded', 'false');
      rows = [];
      active = -1;
    }

    function note(text) {
      list.innerHTML = '';
      list.appendChild(el('li', 'la-note', text));
      list.hidden = false;
    }

    function highlight(index) {
      var items = list.querySelectorAll('.la-item');
      for (var i = 0; i < items.length; i++) {
        items[i].setAttribute('aria-selected', i === index ? 'true' : 'false');
      }
      active = index;
    }

    function choose(row) {
      input.value = streetLine(row);
      close();

      var f = opts.fields || {};
      var map = {
        city: row.locality ? row.locality.name : '',
        postalCode: row.postal_code || '',
        municipality: row.municipality ? row.municipality.name : '',
        country: 'Lietuva',
        code: row.code,
      };

      Object.keys(map).forEach(function (key) {
        var field = f[key] && resolve(f[key]);
        if (!field) return;
        field.value = map[key];
        // Karkasai (React, Vue) klauso `input`, ne tiesioginio `value` priskyrimo.
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });

      if (typeof opts.onSelect === 'function') opts.onSelect(row);
    }

    function render(data) {
      rows = data;
      list.innerHTML = '';

      if (!rows.length) {
        note(opts.labels.empty);
        return;
      }

      rows.forEach(function (row, i) {
        var li = el('li');
        var button = el('button', 'la-item');
        button.type = 'button';
        button.setAttribute('role', 'option');
        button.appendChild(el('span', 'la-main', streetLine(row)));
        button.appendChild(el('span', 'la-sub',
          [row.locality && row.locality.name, row.postal_code].filter(Boolean).join(', ')));
        button.addEventListener('mousedown', function (e) { e.preventDefault(); choose(row); });
        button.addEventListener('mouseenter', function () { highlight(i); });
        li.appendChild(button);
        list.appendChild(li);
      });

      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      highlight(-1);
    }

    function search(value) {
      var mine = ++seq;
      var url = opts.endpoint + (opts.endpoint.indexOf('?') === -1 ? '?' : '&') +
        'q=' + encodeURIComponent(value) + '&limit=' + opts.limit;

      note(opts.labels.searching);

      fetch(url, { headers: { Accept: 'application/json' }, credentials: opts.credentials || 'same-origin' })
        .then(function (res) { return res.ok ? res.json() : Promise.reject(res.status); })
        .then(function (body) {
          // Vėlavusio atsakymo nerodom: kol jis grįžo, vartotojas jau rašo kitą žodį.
          if (mine !== seq) return;
          var data = (body && body.data && body.data.results) || body.results || [];
          render(data);
        })
        .catch(function () {
          if (mine === seq) note(opts.labels.error);
        });
    }

    input.addEventListener('input', function () {
      var value = input.value.trim();
      if (timer) clearTimeout(timer);

      if (value.length < opts.minLength) {
        close();
        return;
      }

      timer = setTimeout(function () { search(value); }, opts.debounce);
    });

    input.addEventListener('keydown', function (e) {
      if (list.hidden || !rows.length) return;

      if (e.key === 'ArrowDown') { e.preventDefault(); highlight((active + 1) % rows.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight((active - 1 + rows.length) % rows.length); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(rows[active]); }
      else if (e.key === 'Escape') { close(); }
    });

    document.addEventListener('mousedown', function (e) {
      if (!wrap.contains(e.target)) close();
    });

    return { destroy: close, search: search };
  }

  var LoyaltyAddress = {
    attach: function (target, options) {
      injectStyle();
      var input = resolve(target);
      if (!input) throw new Error('LoyaltyAddress: input not found: ' + target);
      return Widget(input, options);
    },
  };

  if (typeof module === 'object' && module.exports) module.exports = LoyaltyAddress;
  global.LoyaltyAddress = LoyaltyAddress;
})(typeof window !== 'undefined' ? window : this);
