var N = { exports: {} }, w = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var T;
function A() {
  if (T) return w;
  T = 1;
  var t = Symbol.for("react.transitional.element"), e = Symbol.for("react.fragment");
  function r(o, a, l) {
    var u = null;
    if (l !== void 0 && (u = "" + l), a.key !== void 0 && (u = "" + a.key), "key" in a) {
      l = {};
      for (var c in a)
        c !== "key" && (l[c] = a[c]);
    } else l = a;
    return a = l.ref, {
      $$typeof: t,
      type: o,
      key: u,
      ref: a !== void 0 ? a : null,
      props: l
    };
  }
  return w.Fragment = e, w.jsx = r, w.jsxs = r, w;
}
var H;
function I() {
  return H || (H = 1, N.exports = A()), N.exports;
}
var P = I();
const n = window.React;
var d = function() {
  return d = Object.assign || function(e) {
    for (var r, o = 1, a = arguments.length; o < a; o++) {
      r = arguments[o];
      for (var l in r) Object.prototype.hasOwnProperty.call(r, l) && (e[l] = r[l]);
    }
    return e;
  }, d.apply(this, arguments);
};
function R(t, e) {
  var r = {};
  for (var o in t) Object.prototype.hasOwnProperty.call(t, o) && e.indexOf(o) < 0 && (r[o] = t[o]);
  if (t != null && typeof Object.getOwnPropertySymbols == "function")
    for (var a = 0, o = Object.getOwnPropertySymbols(t); a < o.length; a++)
      e.indexOf(o[a]) < 0 && Object.prototype.propertyIsEnumerable.call(t, o[a]) && (r[o[a]] = t[o[a]]);
  return r;
}
function F(t) {
  if (t) {
    var e = t.textContent, r = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/;
    t.style.direction = e && r.test(e[0]) ? "rtl" : "ltr";
  }
}
function O() {
  for (var t = [], e = 0; e < arguments.length; e++)
    t[e] = arguments[e];
  return t.filter(Boolean).join(" ");
}
function $() {
  if (document.selection)
    return document.selection.createRange().parentElement();
  var t = window.getSelection();
  if (t && t.rangeCount > 0)
    return t.getRangeAt(0).startContainer.parentNode || void 0;
}
function L(t) {
  return t ? t.replace(/&nbsp;|\u202F|\u00A0/g, " ").replace(/<br \/>/g, "<br>") : "";
}
function U(t) {
  var e = document.createTextNode("");
  t.appendChild(e);
  var r = document.activeElement === t;
  if (e !== null && e.nodeValue !== null && r) {
    var o = window.getSelection();
    if (o !== null) {
      var a = document.createRange();
      a.setStart(e, e.nodeValue.length), a.collapse(!0), o.removeAllRanges(), o.addRange(a);
    }
    t instanceof HTMLElement && t.focus();
  }
}
function j(t, e) {
  typeof e == "function" ? e(t) : typeof e == "object" && e && (e.current = t);
}
var _ = n.memo(n.forwardRef(function(e, r) {
  var o = e.className, a = e.disabled, l = e.tagName, u = e.value, c = u === void 0 ? "" : u, i = e.placeholder, m = R(e, ["className", "disabled", "tagName", "value", "placeholder"]), s = n.useRef(null), p = n.useRef(c), h = n.useRef(m);
  return n.useEffect(function() {
    h.current = m;
    var f = s.current;
    f && L(p.current) !== L(c) && (p.current = c, f.innerHTML = c, U(f));
  }), n.useMemo(function() {
    function f(v) {
      s.current = v, F(v), j(v, r);
    }
    function E(v) {
      var M, S, k = s.current;
      if (k) {
        var B = k.innerHTML;
        B !== p.current && ((S = (M = h.current).onChange) === null || S === void 0 || S.call(M, d(d({}, v), { target: {
          value: B,
          name: m.name
        } }))), F(k), p.current = B;
      }
    }
    var b = O("rsw-ce", o);
    return n.createElement(l || "div", d(d({}, m), { className: b, contentEditable: !a, dangerouslySetInnerHTML: { __html: c }, onBlur: function(v) {
      return (h.current.onBlur || E)(v);
    }, onInput: E, onKeyDown: function(v) {
      return (h.current.onKeyDown || E)(v);
    }, onKeyUp: function(v) {
      return (h.current.onKeyUp || E)(v);
    }, placeholder: i, ref: f }));
  }, [o, a, i, l]);
})), z = n.createContext(void 0);
function q(t) {
  var e = t.children, r = n.useState({
    htmlMode: !1,
    update: l
  }), o = r[0], a = r[1];
  function l(u) {
    a(function(c) {
      return d(d({}, c), u);
    });
  }
  return n.createElement(z.Provider, { value: o }, e);
}
function y() {
  var t = n.useContext(z);
  if (!t)
    throw new Error("You should wrap your component by EditorProvider");
  return t;
}
var D = [], x = [];
function J(t, e) {
  if (t && typeof document < "u") {
    var r, o = e.prepend === !0 ? "prepend" : "append", a = e.singleTag === !0, l = typeof e.container == "string" ? document.querySelector(e.container) : document.getElementsByTagName("head")[0];
    if (a) {
      var u = D.indexOf(l);
      u === -1 && (u = D.push(l) - 1, x[u] = {}), r = x[u] && x[u][o] ? x[u][o] : x[u][o] = c();
    } else r = c();
    t.charCodeAt(0) === 65279 && (t = t.substring(1)), r.styleSheet ? r.styleSheet.cssText += t : r.appendChild(document.createTextNode(t));
  }
  function c() {
    var i = document.createElement("style");
    if (i.setAttribute("type", "text/css"), e.attributes) for (var m = Object.keys(e.attributes), s = 0; s < m.length; s++) i.setAttribute(m[s], e.attributes[m[s]]);
    var p = o === "prepend" ? "afterbegin" : "beforeend";
    return l.insertAdjacentElement(p, i), i;
  }
}
var V = ".rsw-editor{border:1px solid #ddd;border-radius:.375rem;display:flex;flex-direction:column;min-height:100px;overflow:hidden}.rsw-ce{flex:1 0 auto;padding:.5rem}.rsw-ce:focus{outline:1px solid #668}.rsw-ce[contentEditable=true]:empty:not(:focus):before{color:grey;content:attr(placeholder);pointer-events:none}.rsw-html{background:transparent;border:none;font-family:monospace,Courier New}.rsw-separator{align-self:stretch;border-right:1px solid #ddd;display:flex;margin:0 3px}.rsw-dd{box-sizing:border-box;outline:none}.rsw-btn{background:transparent;border:0;color:#222;cursor:pointer;font-size:1em;height:2em;outline:none;padding:0;width:2em}.rsw-btn:hover{background:#eaeaea}.rsw-btn[data-active=true]{background:#e0e0e0}.rsw-toolbar{align-items:center;background-color:#f5f5f5;border-bottom:1px solid #ddd;display:flex}";
J(V, {});
var Y = n.forwardRef(function(e, r) {
  var o = e.autoFocus, a = e.children, l = e.containerProps, u = e.onSelect, c = R(e, ["autoFocus", "children", "containerProps", "onSelect"]), i = y();
  n.useEffect(function() {
    return document.addEventListener("click", m), function() {
      return document.removeEventListener("click", m);
    };
  });
  function m(f) {
    var E;
    f.target !== i.$el && (!((E = i.$el) === null || E === void 0) && E.contains(f.target) || i.update({ $selection: void 0 }));
  }
  function s(f) {
    u == null || u(f), i.update({ $selection: $() });
  }
  function p(f) {
    i.update({ $el: f }), j(f, r), o && f && i.$el === void 0 && f.focus();
  }
  var h = O("rsw-editor", l == null ? void 0 : l.className);
  return i.htmlMode ? n.createElement(
    "div",
    d({}, l, { className: h }),
    a,
    n.createElement("textarea", d({}, c, { className: "rsw-ce rsw-html" }))
  ) : n.createElement(
    "div",
    d({}, l, { className: h }),
    a,
    n.createElement(_, d({}, c, { ref: p, onSelect: s }))
  );
});
function G() {
  return n.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", style: { verticalAlign: "text-top" } },
    n.createElement("path", { fill: "currentColor", d: "M6.99938 12.998v-2H20.9994v2H6.99938zm0 6.0001v-2H20.9994v2H6.99938zm0-12.00001v-2H20.9994v2H6.99938zm-4 1v-3h-1v-1h2v4h-1zm-1 9.00001v-1h3v4h-3v-1h2v-.5h-1v-1h1v-.5h-2zM4.25 10c.41421 0 .75.3358.75.75 0 .2024-.08017.3861-.2105.521L3.11983 13H5v1H2v-.9218L4 11H2v-1h2.25z" })
  );
}
function Q() {
  return n.createElement(
    "svg",
    { xmlns: "http://www.w3.org/2000/svg", width: "20", height: "20", viewBox: "0 0 24 24", style: { verticalAlign: "text-top" } },
    n.createElement("path", { fill: "currentColor", d: "M7 5h14v2H7V5zm0 8v-2h14v2H7zM4 4.50001c.83 0 1.5.66992 1.5 1.5 0 .83007-.67 1.5-1.5 1.5s-1.5-.66993-1.5-1.5c0-.83008.67-1.5 1.5-1.5zM4 10.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM7 19v-2h14v2H7zm-3-2.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z" })
  );
}
var W = g("Bold", "𝐁", "bold"), X = g("Bullet list", n.createElement(Q, null), "insertUnorderedList"), Z = g("Clear formatting", "T̲ₓ", "removeFormat"), K = g("Italic", "𝑰", "italic"), ee = g("Strike through", n.createElement("s", null, "ab"), "strikeThrough"), te = g("Link", "🔗", function(t) {
  var e = t.$selection;
  (e == null ? void 0 : e.nodeName) === "A" ? document.execCommand("unlink") : document.execCommand("createLink", !1, prompt("URL", "") || void 0);
}), ne = g("Numbered list", n.createElement(G, null), "insertOrderedList"), re = g("Redo", "↷", "redo"), oe = g("Underline", n.createElement("span", { style: { textDecoration: "underline" } }, "𝐔"), "underline"), ae = g("Undo", "↶", "undo");
function g(t, e, r) {
  return o.displayName = t.replace(/\s/g, ""), o;
  function o(a) {
    var l = y(), u = l.$el, c = l.$selection, i = !1;
    typeof r == "string" && (i = !!c && document.queryCommandState(r));
    function m(s) {
      s.preventDefault(), document.activeElement !== u && (u == null || u.focus()), typeof r == "function" ? r(l) : document.execCommand(r);
    }
    return l.htmlMode ? null : n.createElement("button", d({ className: "rsw-btn", "data-active": i, onMouseDown: m, tabIndex: -1, title: t, type: "button" }, a), e);
  }
}
var le = ue("Styles", [
  ["Normal", "formatBlock", "DIV"],
  ["𝗛𝗲𝗮𝗱𝗲𝗿 𝟭", "formatBlock", "H1"],
  ["Header 2", "formatBlock", "H2"],
  ["𝙲𝚘𝚍𝚎", "formatBlock", "PRE"]
]);
function ue(t, e) {
  return r.displayName = t, r;
  function r(o) {
    var a = y(), l = a.$el, u = a.$selection, c = a.htmlMode;
    if (c)
      return null;
    var i = e.findIndex(function(s) {
      return s[1] === "formatBlock" && (u == null ? void 0 : u.nodeName) === s[2];
    });
    return n.createElement(ce, d({}, o, { items: e, onChange: m, selected: i, tabIndex: -1, title: t }));
    function m(s) {
      var p = s.target, h = p.value, f = parseInt(h, 10), E = e[f] || [], b = E[1], v = E[2];
      s.preventDefault(), document.activeElement !== l && (l == null || l.focus()), typeof b == "function" ? b(a) : b && document.execCommand(b, !1, v), setTimeout(function() {
        return p.value = h;
      }, 10);
    }
  }
}
function ce(t) {
  var e = t.items, r = t.selected, o = R(t, ["items", "selected"]);
  return n.createElement(
    "select",
    d({ className: "rsw-dd" }, o, { value: r }),
    n.createElement("option", { hidden: !0 }, o.title),
    e.map(function(a, l) {
      return n.createElement("option", { key: a[2], value: l }, a[0]);
    })
  );
}
function ie(t) {
  var e = R(t, []), r = y();
  function o() {
    r.update({
      htmlMode: !r.htmlMode
    });
  }
  return n.createElement("button", d({ className: "rsw-btn", "data-active": r.htmlMode, onClick: o, tabIndex: -1, title: "HTML mode", type: "button" }, e), "</>");
}
function C(t) {
  var e = y();
  return e.htmlMode ? null : n.createElement("div", d({ className: "rsw-separator" }, t));
}
function de(t) {
  return n.createElement("div", d({ className: "rsw-toolbar" }, t));
}
var se = n.forwardRef(function(e, r) {
  return n.createElement(
    q,
    null,
    n.createElement(Y, d({}, e, { ref: r }), e.children || n.createElement(
      de,
      null,
      n.createElement(ae, null),
      n.createElement(re, null),
      n.createElement(C, null),
      n.createElement(W, null),
      n.createElement(K, null),
      n.createElement(oe, null),
      n.createElement(ee, null),
      n.createElement(C, null),
      n.createElement(ne, null),
      n.createElement(X, null),
      n.createElement(C, null),
      n.createElement(te, null),
      n.createElement(Z, null),
      n.createElement(ie, null),
      n.createElement(C, null),
      n.createElement(le, null)
    ))
  );
});
const fe = window.React.useCallback;
function me({ initialValue: t, onChange: e }) {
  const r = fe((o) => {
    e(o.target.value);
  }, [t]);
  return /* @__PURE__ */ P.jsx(se, { value: t, onChange: r });
}
export {
  me as default
};
