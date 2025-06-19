import { j as e, L as m, I as x, B as h, a as f } from "./button-Dk9HuYNn.js";
const t = window.React.useState, g = ({ items: c, callback: r }) => {
  const [n, d] = t(""), [o, l] = t(!1), [i, s] = t(""), u = async () => {
    l(!0), s("Отправка данных...");
    try {
      const a = {
        actionID: "external_action",
        items: c,
        data: { number: n }
      };
      (await f.put("", { data: a, _method: "handleAction" })).data.data === "ok" ? (s("Данные успешно отправлены."), setTimeout(() => {
        r();
      }, 500)) : s("Неверный ответ.");
    } catch (a) {
      console.log(a);
    } finally {
      l(!1);
    }
  };
  return /* @__PURE__ */ e.jsx("div", { className: "mt-4 px-8", children: /* @__PURE__ */ e.jsxs("div", { className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ e.jsx(m, { htmlFor: "name", children: "5 + 2 = ?" }),
    /* @__PURE__ */ e.jsx(
      x,
      {
        required: !0,
        value: n,
        type: "number",
        name: "number",
        placeholder: "number",
        onChange: (a) => d(a.target.value),
        disabled: o
      }
    ),
    /* @__PURE__ */ e.jsx(h, { variant: "default", className: "w-fit", onClick: u, disabled: o, children: "Отправить" }),
    i && /* @__PURE__ */ e.jsx("div", { children: i })
  ] }) });
};
export {
  g as default
};
