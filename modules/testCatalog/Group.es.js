import { j as r, L as C, I as x, B as b, a as p } from "./button-Dk9HuYNn.js";
/**
 * @license lucide-react v0.485.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const j = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), R = (t) => t.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (a, e, s) => s ? s.toUpperCase() : e.toLowerCase()
), w = (t) => {
  const a = R(t);
  return a.charAt(0).toUpperCase() + a.slice(1);
}, g = (...t) => t.filter((a, e, s) => !!a && a.trim() !== "" && s.indexOf(a) === e).join(" ").trim();
/**
 * @license lucide-react v0.485.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var v = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.485.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const y = window.React.forwardRef, f = window.React.createElement, L = y(
  ({
    color: t = "currentColor",
    size: a = 24,
    strokeWidth: e = 2,
    absoluteStrokeWidth: s,
    className: n = "",
    children: o,
    iconNode: l,
    ...m
  }, u) => f(
    "svg",
    {
      ref: u,
      ...v,
      width: a,
      height: a,
      stroke: t,
      strokeWidth: s ? Number(e) * 24 / Number(a) : e,
      className: g("lucide", n),
      ...m
    },
    [
      ...l.map(([c, i]) => f(c, i)),
      ...Array.isArray(o) ? o : [o]
    ]
  )
);
/**
 * @license lucide-react v0.485.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const k = window.React.forwardRef, I = window.React.createElement, N = (t, a) => {
  const e = k(
    ({ className: s, ...n }, o) => I(L, {
      ref: o,
      iconNode: a,
      className: g(
        `lucide-${j(w(t))}`,
        `lucide-${t}`,
        s
      ),
      ...n
    })
  );
  return e.displayName = w(t), e;
};
/**
 * @license lucide-react v0.485.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const E = [["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]], A = N("loader-circle", E), h = window.React.useState, $ = window.React.useEffect, _ = ({ update: t = !1, parentId: a, ...e }) => {
  const [s, n] = h(""), [o, l] = h(!1);
  $(() => {
    e.item && n(e.item.title);
  }, []);
  const m = (c) => {
    n(c.target.value);
  }, u = async (c) => {
    var i;
    c.preventDefault(), l(!0);
    try {
      let d = null;
      t ? (d = await p.put("", {
        type: "group",
        modelId: (i = e.item) == null ? void 0 : i.id,
        data: {
          ...e.item,
          name: s,
          title: s
        },
        _method: "updateItem"
      }), e.callback(d.data.data)) : (await p.post("", {
        data: {
          title: s,
          parentId: a,
          type: "group"
        },
        _method: "createItem"
      }), e.callback(null));
    } catch (d) {
      console.error(d);
    } finally {
      l(!1);
    }
  };
  return /* @__PURE__ */ r.jsxs("div", { className: "p-8", children: [
    /* @__PURE__ */ r.jsx("form", { className: "grid gap-6", id: "group-add", onSubmit: u, children: /* @__PURE__ */ r.jsxs("div", { className: "grid gap-4", children: [
      /* @__PURE__ */ r.jsx(C, { htmlFor: "name", children: "Name" }),
      /* @__PURE__ */ r.jsx(
        x,
        {
          required: !0,
          value: s,
          name: "title",
          placeholder: "Title",
          onChange: m
        }
      )
    ] }) }),
    /* @__PURE__ */ r.jsxs(b, { className: "mt-8 w-fit", form: "group-add", type: "submit", disabled: o, children: [
      "Save",
      o && /* @__PURE__ */ r.jsx(A, { className: "h-4 w-4 animate-spin ml-2" })
    ] })
  ] });
};
export {
  _ as default
};
