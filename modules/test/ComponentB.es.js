var x = { exports: {} }, r = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var d;
function R() {
  if (d) return r;
  d = 1;
  var o = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
  function s(u, t, e) {
    var a = null;
    if (e !== void 0 && (a = "" + e), t.key !== void 0 && (a = "" + t.key), "key" in t) {
      e = {};
      for (var l in t)
        l !== "key" && (e[l] = t[l]);
    } else e = t;
    return t = e.ref, {
      $$typeof: o,
      type: u,
      key: a,
      ref: t !== void 0 ? t : null,
      props: e
    };
  }
  return r.Fragment = n, r.jsx = s, r.jsxs = s, r;
}
var c;
function p() {
  return c || (c = 1, x.exports = R()), x.exports;
}
var i = p();
const v = window.React.useState, h = window.UIComponents.Button;
function j({ message: o }) {
  const [n, s] = v(0), u = () => s(n + 1);
  return /* @__PURE__ */ i.jsxs("div", { className: "grid gap-4", children: [
    /* @__PURE__ */ i.jsx("h1", { children: o }),
    /* @__PURE__ */ i.jsx(h, { onClick: u, className: "w-fit", children: "Click me" }),
    /* @__PURE__ */ i.jsxs("h2", { children: [
      "State is ",
      n
    ] })
  ] });
}
export {
  j as default
};
