/*
 * Collabz mini runtime
 * --------------------
 * Renders the HTML template in index.html (<template id="app-template">) with React.
 * Template syntax:
 *   {{path.to.value}}            text or attribute hole (dotted lookup only)
 *   onClick="{{handler}}"        event handler (any on* attribute)
 *   <sc-if value="{{flag}}">     conditional block
 *   <sc-for list="{{items}}" as="item">   repeated block ($index available)
 * App logic lives in js/app.js as `class Component extends DCLogic` and exposes
 * everything the template needs from renderVals().
 */
(function () {
  'use strict';

  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch, cb) {
      const p = typeof patch === 'function' ? patch(this.state, this.props) : patch;
      this.state = Object.assign({}, this.state, p);
      if (this.__update) this.__update();
      if (typeof cb === 'function') setTimeout(cb, 0);
    }
    forceUpdate() { if (this.__update) this.__update(); }
  }
  window.DCLogic = DCLogic;

  const BOOL_ATTRS = new Set(['controls', 'playsinline', 'disabled', 'multiple', 'autoplay', 'muted', 'loop', 'required', 'checked', 'readonly', 'selected', 'hidden', 'open', 'novalidate']);
  const RENAME = { class: 'className', for: 'htmlFor', autocomplete: 'autoComplete', playsinline: 'playsInline', readonly: 'readOnly', tabindex: 'tabIndex', maxlength: 'maxLength', srcset: 'srcSet', crossorigin: 'crossOrigin', autofocus: 'autoFocus', novalidate: 'noValidate', inputmode: 'inputMode' };
  const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const WHOLE = /^\s*\{\{([\s\S]+?)\}\}\s*$/;
  const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    let v = scope;
    for (const k of path.split('.')) { if (v == null) return undefined; v = v[k]; }
    return v;
  }
  const str = (v) => (v == null ? '' : String(v));

  function evalAttr(s, scope) {
    const m = s.match(WHOLE);
    if (m) return lookup(scope, m[1]);
    if (s.indexOf('{{') < 0) return s;
    return s.split(/\{\{([\s\S]+?)\}\}/g).map((p, i) => (i % 2 ? str(lookup(scope, p)) : p)).join('');
  }

  function styleObj(s) {
    const o = {};
    String(s).split(';').forEach((d) => {
      const i = d.indexOf(':');
      if (i < 0) return;
      const k = d.slice(0, i).trim();
      if (!k) return;
      o[k.startsWith('--') ? k : camel(k)] = d.slice(i + 1).trim();
    });
    return o;
  }

  function propName(n) {
    if (n.length > 2 && n.startsWith('on')) return 'on' + n[2].toUpperCase() + n.slice(3);
    if (RENAME[n]) return RENAME[n];
    if (n.startsWith('aria-') || n.startsWith('data-')) return n;
    if (n.indexOf('-') >= 0 || n.indexOf(':') >= 0) return camel(n.replace(':', '-'));
    return n;
  }

  function kids(h, node, scope) {
    const out = [];
    node.childNodes.forEach((c, i) => { const r = render(h, c, scope, i); if (r !== null) out.push(r); });
    return out;
  }

  function render(h, node, scope, key) {
    if (node.nodeType === 3) {
      const t = node.nodeValue;
      if (!t.trim() && t.indexOf('\n') >= 0) return null;
      if (t.indexOf('{{') < 0) return t;
      return t.split(/\{\{([\s\S]+?)\}\}/g).map((p, i) => (i % 2 ? str(lookup(scope, p)) : p)).join('');
    }
    if (node.nodeType !== 1) return null;
    const tag = node.tagName.toLowerCase();
    const F = React.Fragment;
    if (tag === 'sc-if') {
      return evalAttr(node.getAttribute('value') || '', scope) ? h(F, { key: key }, kids(h, node, scope)) : null;
    }
    if (tag === 'sc-for') {
      const list = evalAttr(node.getAttribute('list') || '', scope);
      const as = node.getAttribute('as') || 'item';
      if (!Array.isArray(list)) return null;
      return h(F, { key: key }, list.map((it, i) => h(F, { key: i }, kids(h, node, Object.assign({}, scope, { [as]: it, $index: i })))));
    }
    const props = { key: key };
    for (const a of Array.from(node.attributes)) {
      const n = a.name;
      if (n.startsWith('hint-')) continue;
      let v = evalAttr(a.value, scope);
      const p = propName(n);
      if (p === 'style') v = typeof v === 'string' ? styleObj(v) : v;
      else if (BOOL_ATTRS.has(n.toLowerCase())) { if (v === '' || v === n) v = true; else if (v === 'false') v = false; }
      props[p] = v;
    }
    if (VOID.has(tag) || tag === 'textarea') return h(tag, props);
    const c = kids(h, node, scope);
    return c.length ? h(tag, props, ...c) : h(tag, props);
  }

  window.mountDC = function (Logic, rootEl, templateEl, props) {
    const h = React.createElement;
    const nodes = Array.from(templateEl.content.childNodes);
    function Host() {
      const [, force] = React.useReducer((x) => x + 1, 0);
      const ref = React.useRef(null);
      if (!ref.current) ref.current = new Logic(props || {});
      const logic = ref.current;
      logic.__update = force;
      React.useEffect(() => { if (logic.componentDidMount) logic.componentDidMount(); }, []);
      const vals = logic.renderVals();
      return h(React.Fragment, null, nodes.map((n, i) => render(h, n, vals, i)).filter((x) => x !== null));
    }
    ReactDOM.createRoot(rootEl).render(h(Host));
  };
})();
