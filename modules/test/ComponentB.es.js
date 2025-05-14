var x = { exports: {} }, e = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var l;
function p() {
  if (l) return e;
  l = 1;
  var u = Symbol.for("react.transitional.element"), n = Symbol.for("react.fragment");
  function s(o, r, t) {
    var a = null;
    if (t !== void 0 && (a = "" + t), r.key !== void 0 && (a = "" + r.key), "key" in r) {
      t = {};
      for (var d in r)
        d !== "key" && (t[d] = r[d]);
    } else t = r;
    return r = t.ref, {
      $$typeof: u,
      type: o,
      key: a,
      ref: r !== void 0 ? r : null,
      props: t
    };
  }
  return e.Fragment = n, e.jsx = s, e.jsxs = s, e;
}
var c;
function R() {
  return c || (c = 1, x.exports = p()), x.exports;
}
var i = R();
const v = window.React.useState;
function m({ message: u }) {
  const [n, s] = v(0), o = () => s(n + 1);
  return /* @__PURE__ */ i.jsxs("div", { className: "grid gap-4", children: [
    /* @__PURE__ */ i.jsx("h1", { children: u }),
    /* @__PURE__ */ i.jsx("button", { onClick: o, className: "rounded-md bg-primary px-4 py-2 w-fit text-primary-foreground hover:bg-primary/90 cursor-pointer", children: "Click me" }),
    /* @__PURE__ */ i.jsxs("h2", { children: [
      "State is ",
      n
    ] })
  ] });
}
export {
  m as default
};
