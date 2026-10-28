// Gemeinsame Bausteine des Prototyps (Layout, Formatierung, Dialog) – genutzt von app.js, admin.js und member.js.
window.GKGUI = (function () {
  var React = window.React;
  var h = React.createElement, useEffect = React.useEffect, useRef = React.useRef;

  function chf(n) {
    var s = Number(n || 0).toFixed(2).split('.');
    return s[0].replace(/\B(?=(\d{3})+(?!\d))/g, '’') + '.' + s[1];
  }
  function initials(name) {
    return String(name || '').split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join('');
  }
  function date(iso) {
    if (!iso) return '–';
    var p = String(iso).slice(0, 10).split('-');
    return p.length === 3 ? p[2] + '.' + p[1] + '.' + p[0] : iso;
  }
  function go(name) { location.hash = name; }
  function ext(href, text) { return h('a', { href: href, target: '_blank', rel: 'noopener' }, text); }

  function Wrap(p) { return h('div', { className: 'pt-wrap' + (p.className ? ' ' + p.className : '') }, p.children); }

  function PageHead(p) {
    return h('header', { className: 'pt-page-head' }, h(Wrap, null,
      p.crumb && h('p', { className: 'pt-crumb' }, p.crumb),
      p.eyebrow && h('p', { className: 'pt-eyebrow' }, p.eyebrow),
      h('h1', { className: 'pt-h1' }, p.title),
      p.lead && h('p', { className: 'pt-lead' }, p.lead),
      p.children));
  }

  function Section(p) {
    return h('section', { className: 'pt-section', id: p.id, 'aria-labelledby': p.id ? p.id + '-t' : undefined }, h(Wrap, null,
      (p.title || p.aside) && h('div', { className: 'pt-section-head' },
        h('div', null,
          p.title && h('h2', { className: 'pt-h2', id: p.id ? p.id + '-t' : undefined }, p.title),
          p.sub && h('p', { className: 'pt-muted' }, p.sub)),
        p.aside),
      p.children));
  }

  function Block(p) {
    if (!p.items || !p.items.length) return null;
    return h('div', { className: 'pt-block' + (p.warn ? ' pt-block-warn' : '') },
      h('h2', null, p.title),
      h('ul', null, p.items.map(function (t, i) { return h('li', { key: i }, t); })));
  }

  function Avatar(p) {
    return h('div', { className: 'pt-avatar' + (p.large ? ' pt-avatar-lg' : ''), 'aria-hidden': p.photo ? undefined : true },
      p.photo ? h('img', { src: p.photo, alt: 'Foto ' + p.name }) : initials(p.name));
  }

  // Modaler Dialog auf Basis von <dialog>: Esc und Klick neben den Dialog schliessen ihn.
  function Dialog(p) {
    var ref = useRef(null), onClose = useRef(p.onClose);
    onClose.current = p.onClose;
    useEffect(function () {
      var d = ref.current;
      if (!d) return;
      if (p.open && !d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
      if (!p.open && d.open) d.close();
    }, [p.open]);
    useEffect(function () {
      var d = ref.current;
      function closed() { if (onClose.current) onClose.current(); }
      d.addEventListener('close', closed);
      return function () { d.removeEventListener('close', closed); };
    }, []);
    function close() { if (ref.current && ref.current.open) ref.current.close(); }
    return h('dialog', {
      ref: ref, className: 'pt-dialog' + (p.wide ? ' is-wide' : ''), 'aria-labelledby': p.id + '-t',
      onClick: function (e) { if (e.target === ref.current) close(); }
    },
      p.open && h('div', { className: 'pt-dialog-inner' },
        h('header', { className: 'pt-dialog-head' },
          h('div', null,
            p.eyebrow && h('p', { className: 'pt-eyebrow' }, p.eyebrow),
            h('h2', { id: p.id + '-t', className: 'pt-h3' }, p.title)),
          h('button', { type: 'button', className: 'pt-dialog-x', onClick: close, 'aria-label': 'Schliessen' }, '×')),
        h('div', { className: 'pt-dialog-body' }, p.children),
        p.footer && h('footer', { className: 'pt-dialog-foot' }, typeof p.footer === 'function' ? p.footer(close) : p.footer)));
  }

  // Ein Formularfeld mit Label darüber, optionalem Hinweis und Fehler
  function Field(p) {
    var id = p.id;
    var input = p.children || h(p.as || 'input', Object.assign({ id: id, 'aria-invalid': p.error ? 'true' : undefined, 'aria-describedby': p.error ? id + '-err' : undefined }, p.input));
    return h('div', { className: 'pt-field' + (p.className ? ' ' + p.className : '') },
      h('label', { htmlFor: id }, p.label),
      input,
      p.hint && h('p', { className: 'pt-hint' }, p.hint),
      p.error && h('p', { className: 'pt-error', id: id + '-err' }, p.error));
  }

  // Formular im Dialog: onSubmit(event, close) prüft selbst und schliesst den Dialog mit close()
  function DialogForm(p) {
    var ref = useRef(null);
    function close() { var d = ref.current && ref.current.closest('dialog'); if (d && d.open) d.close(); }
    return h('form', { ref: ref, className: 'pt-form', noValidate: true, onSubmit: function (ev) { ev.preventDefault(); p.onSubmit(ev, close); } },
      p.children,
      h('div', { className: 'pt-actions' },
        h(window.GKG.Button, { variant: p.variant || 'primary', type: 'submit' }, p.submit),
        p.cancel !== false && h(window.GKG.Button, { variant: 'ghost', onClick: close }, p.cancel || 'Abbrechen')));
  }

  // Rückfrage vor Aktionen mit Folgen (Mahnung, Austritt, Sperre, Zurücksetzen)
  function Confirm(p) {
    return h(Dialog, {
      open: p.open, id: p.id, title: p.title, onClose: p.onClose,
      footer: function (close) {
        return h('div', { className: 'pt-actions' },
          h(window.GKG.Button, { variant: 'primary', onClick: function () { p.onConfirm(); close(); } }, p.confirm),
          h(window.GKG.Button, { variant: 'ghost', onClick: close }, p.cancel || 'Abbrechen'));
      }
    }, p.children);
  }

  function Tabs(p) {
    return h('div', { className: 'pt-tabs', role: 'tablist', 'aria-label': p.label },
      p.items.map(function (it) {
        return h('button', { key: it.id, type: 'button', role: 'tab', className: 'pt-tab', 'aria-selected': p.value === it.id, onClick: function () { p.onChange(it.id); } }, it.label);
      }));
  }

  return { chf: chf, initials: initials, date: date, go: go, ext: ext, Wrap: Wrap, PageHead: PageHead, Section: Section, Block: Block, Avatar: Avatar, Dialog: Dialog, DialogForm: DialogForm, Confirm: Confirm, Field: Field, Tabs: Tabs };
})();
