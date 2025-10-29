var x = { exports: {} }, d = {};
/**
 * @license React
 * react-jsx-runtime.production.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var w;
function R() {
  if (w) return d;
  w = 1;
  var r = Symbol.for("react.transitional.element"), i = Symbol.for("react.fragment");
  function c(a, t, n) {
    var l = null;
    if (n !== void 0 && (l = "" + n), t.key !== void 0 && (l = "" + t.key), "key" in t) {
      n = {};
      for (var o in t)
        o !== "key" && (n[o] = t[o]);
    } else n = t;
    return t = n.ref, {
      $$typeof: r,
      type: a,
      key: l,
      ref: t !== void 0 ? t : null,
      props: n
    };
  }
  return d.Fragment = i, d.jsx = c, d.jsxs = c, d;
}
var j;
function I() {
  return j || (j = 1, x.exports = R()), x.exports;
}
var e = I();
const u = window.React.useState, T = window.UIComponents.Button, U = window.UIComponents.Select, k = window.UIComponents.SelectContent, f = window.UIComponents.SelectItem, N = window.UIComponents.SelectTrigger, b = window.UIComponents.SelectValue, E = window.axios, L = window.UIComponents.Textarea, p = window.UIComponents.Label, _ = window.UIComponents.Checkbox, A = window.UIComponents.Toaster, v = window.sonner.toast, F = window.LucideReact;
function J({ data: r }) {
  var h;
  const [i, c] = u(""), [a, t] = u(""), [n, l] = u(!1), [o, C] = u(!1), S = async (s) => {
    s.preventDefault(), l(!0);
    try {
      const m = {
        message: a,
        ...o ? { sendToAll: !0 } : { userId: i }
      }, g = await E.post("", m);
      console.log(g.data), v.success("Сообщение успешно отправлено!");
    } catch (m) {
      console.error(m), v.error("Ошибка при отправке сообщения.");
    } finally {
      l(!1);
    }
  };
  return /* @__PURE__ */ e.jsxs(e.Fragment, { children: [
    /* @__PURE__ */ e.jsx(A, { position: "top-center", richColors: !0, closeButton: !0 }),
    /* @__PURE__ */ e.jsx("div", { className: "grid gap-4", children: /* @__PURE__ */ e.jsxs("form", { onSubmit: S, className: "flex flex-col gap-4 max-w-[400px]", children: [
      /* @__PURE__ */ e.jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ e.jsx(
          _,
          {
            id: "send-to-all",
            checked: o,
            onCheckedChange: (s) => {
              C(s), s && c("");
            }
          }
        ),
        /* @__PURE__ */ e.jsx(p, { htmlFor: "send-to-all", children: "Всем пользователям" })
      ] }),
      /* @__PURE__ */ e.jsxs("div", { children: [
        /* @__PURE__ */ e.jsx(p, { htmlFor: "user-select", className: "block mb-2 font-medium", children: "Выберите пользователя:" }),
        /* @__PURE__ */ e.jsxs(
          U,
          {
            onValueChange: (s) => c(s),
            value: i,
            disabled: o,
            children: [
              /* @__PURE__ */ e.jsx(N, { id: "user-select", className: "w-full", children: /* @__PURE__ */ e.jsx(b, { placeholder: "-- Выберите --" }) }),
              /* @__PURE__ */ e.jsx(k, { children: ((h = r == null ? void 0 : r.users) == null ? void 0 : h.length) > 0 ? r.users.map((s) => /* @__PURE__ */ e.jsx(f, { value: s.id.toString(), children: s.fullName }, s.id)) : /* @__PURE__ */ e.jsx(f, { value: "", disabled: !0, children: "Пользователей нет" }) })
            ]
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs("div", { children: [
        /* @__PURE__ */ e.jsx(p, { htmlFor: "message-input", className: "block mb-2 font-medium", children: "Сообщение:" }),
        /* @__PURE__ */ e.jsx(
          L,
          {
            id: "message-input",
            value: a,
            onChange: (s) => t(s.target.value),
            placeholder: "Введите сообщение..."
          }
        )
      ] }),
      /* @__PURE__ */ e.jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ e.jsx(
          T,
          {
            type: "submit",
            className: "w-fit",
            disabled: n || !o && !i || !a.trim(),
            children: n ? "Отправка..." : "Отправить"
          }
        ),
        n && /* @__PURE__ */ e.jsx(F.Loader2, { className: "w-6 h-6 animate-spin" })
      ] })
    ] }) })
  ] });
}
export {
  J as default
};
