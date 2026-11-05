/* @ds-bundle: {"format":4,"namespace":"MindiDesignSystem_ef6b32","components":[{"name":"Chat","sourcePath":"components/chat/Chat.jsx"},{"name":"Bubble","sourcePath":"components/chat/Chat.jsx"},{"name":"Scale","sourcePath":"components/chat/Chat.jsx"},{"name":"AreaBar","sourcePath":"components/chat/Chat.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Card.jsx"},{"name":"Notice","sourcePath":"components/feedback/Notice.jsx"},{"name":"Field","sourcePath":"components/forms/Field.jsx"},{"name":"Check","sourcePath":"components/forms/Field.jsx"}],"sourceHashes":{"components/chat/Chat.jsx":"f5f239b860d6","components/core/Button.jsx":"8968359cae92","components/core/Card.jsx":"148b58cae0e1","components/feedback/Notice.jsx":"b75e4cfe83ac","components/forms/Field.jsx":"865ec4ad4995","ui_kits/web/Screens.jsx":"442d534a4bf9"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MindiDesignSystem_ef6b32 = window.MindiDesignSystem_ef6b32 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/chat/Chat.jsx
try { (() => {
function Chat({ dark, status, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: dark ? "m-chat m-chat--dark" : "m-chat" }, /* @__PURE__ */ React.createElement("div", { className: "m-chat__head" }, /* @__PURE__ */ React.createElement("span", { className: "m-avatar", "aria-hidden": "true" }, "M"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("b", null, "Mindi"), status && /* @__PURE__ */ React.createElement("span", { className: "m-chat__status" }, status))), /* @__PURE__ */ React.createElement("div", { className: "m-chat__body" }, children));
}
function Bubble({ from = "bot", dark, example, children }) {
  if (dark) return /* @__PURE__ */ React.createElement("div", { className: from === "me" ? "m-msg m-msg--user" : "m-msg m-msg--bot" }, children);
  return /* @__PURE__ */ React.createElement("div", { className: from === "me" ? "m-bubble m-bubble--me" : "m-bubble m-bubble--bot" }, children, example && /* @__PURE__ */ React.createElement("small", null, example));
}
function Scale({ labels, onPick }) {
  return /* @__PURE__ */ React.createElement("div", { className: "m-scale m-scale--list", role: "group", "aria-label": "Intensidad de 0 a 4" }, labels.map((label, n) => /* @__PURE__ */ React.createElement("button", { type: "button", key: n, onClick: () => onPick && onPick(n, label) }, /* @__PURE__ */ React.createElement("b", { "aria-hidden": "true" }, n), /* @__PURE__ */ React.createElement("span", null, label))));
}
function AreaBar({ label, pct }) {
  return /* @__PURE__ */ React.createElement("div", { className: "m-bar is-on", style: { "--w": `${pct}%` } }, /* @__PURE__ */ React.createElement("span", { className: "m-bar__label" }, /* @__PURE__ */ React.createElement("span", null, label), /* @__PURE__ */ React.createElement("b", null, pct, "%")), /* @__PURE__ */ React.createElement("span", { className: "m-bar__track" }, /* @__PURE__ */ React.createElement("i", null)));
}
Object.assign(__ds_scope, { Chat, Bubble, Scale, AreaBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/chat/Chat.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({ variant = "primary", href, block, children, className = "", ...rest }) {
  const cls = ["m-btn", variant !== "primary" && `m-btn--${variant}`, block && "m-btn--block", className].filter(Boolean).join(" ");
  if (href) return /* @__PURE__ */ React.createElement("a", { className: cls, href, ...rest }, children);
  return /* @__PURE__ */ React.createElement("button", { type: "button", className: cls, ...rest }, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({ glass, eyebrow, title, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: glass ? "m-card m-card--glass" : "m-card" }, eyebrow && /* @__PURE__ */ React.createElement("p", { className: "m-eyebrow" }, eyebrow), title && /* @__PURE__ */ React.createElement("h3", { className: "m-h3" }, title), children);
}
function Eyebrow({ children }) {
  return /* @__PURE__ */ React.createElement("p", { className: "m-eyebrow" }, children);
}
function Chip({ sev, children }) {
  return /* @__PURE__ */ React.createElement("span", { className: sev ? "m-chip m-chip--sev" : "m-chip" }, children);
}
Object.assign(__ds_scope, { Card, Eyebrow, Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Notice.jsx
try { (() => {
function Notice({ kind = "eval", title, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: `m-notice m-notice--${kind}`, role: kind === "emergency" ? "alert" : "status" }, title && /* @__PURE__ */ React.createElement("p", { className: "m-notice__title" }, title), children);
}
Object.assign(__ds_scope, { Notice });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Notice.jsx", error: String((e && e.message) || e) }); }

// components/forms/Field.jsx
try { (() => {
function Field({ id, label, type = "text", ...rest }) {
  return /* @__PURE__ */ React.createElement("div", { className: "m-field" }, /* @__PURE__ */ React.createElement("label", { htmlFor: id }, label), /* @__PURE__ */ React.createElement("input", { className: "m-input", id, type, ...rest }));
}
function Check({ children, ...rest }) {
  return /* @__PURE__ */ React.createElement("label", { className: "m-check" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", ...rest }), /* @__PURE__ */ React.createElement("span", null, children));
}
Object.assign(__ds_scope, { Field, Check });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Field.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Screens.jsx
try { (() => {
function Phone({ children, dark }) {
  return /* @__PURE__ */ React.createElement("div", { style: {
    width: 300,
    height: 600,
    borderRadius: 34,
    overflow: "hidden",
    border: "8px solid var(--plum)",
    background: dark ? "var(--chat-bg)" : "var(--test-bg)",
    boxShadow: "var(--shadow-phone)",
    display: "flex",
    flexDirection: "column"
  } }, children);
}
function TestScreen() {
  const { Chat, Bubble, Scale } = window.MindiDesignSystem_ef6b32;
  return /* @__PURE__ */ React.createElement(Phone, null, /* @__PURE__ */ React.createElement(Chat, { status: "Pregunta 1 de 11" }, /* @__PURE__ */ React.createElement(Bubble, { example: "Por ejemplo: oleadas de calor en la cara, el cuello o el pecho." }, "\xBFQu\xE9 tanto te han molestado los bochornos, la sudoraci\xF3n o los calores repentinos?"), /* @__PURE__ */ React.createElement(Scale, { labels: ["No los noto", "Los noto, pero sigo mi d\xEDa", "Me interrumpen un poco", "Me cuesta seguir lo que hac\xEDa", "Paro todo hasta que pasan"] }), /* @__PURE__ */ React.createElement(Bubble, { from: "me" }, "3 \xB7 Me cuesta seguir lo que hac\xEDa")));
}
function ResultScreen() {
  const { Card, Chip, AreaBar, Button } = window.MindiDesignSystem_ef6b32;
  return /* @__PURE__ */ React.createElement(Phone, null, /* @__PURE__ */ React.createElement("div", { style: { padding: 14, display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement(Card, { title: "Tus s\xEDntomas hoy" }, /* @__PURE__ */ React.createElement(Chip, { sev: true }, "Conviene evaluarlo con tu m\xE9dico \xB7 Gu\xEDa HNHU"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gap: 10, marginTop: 12 } }, /* @__PURE__ */ React.createElement(AreaBar, { label: "Cuerpo", pct: 56 }), /* @__PURE__ */ React.createElement(AreaBar, { label: "\xC1nimo", pct: 44 }), /* @__PURE__ */ React.createElement(AreaBar, { label: "Vida \xEDntima", pct: 17 }))), /* @__PURE__ */ React.createElement(Button, { block: true }, "Descargar PDF"), /* @__PURE__ */ React.createElement(Button, { block: true, variant: "outline" }, "Compartir con mi m\xE9dico")));
}
function AlertScreen() {
  const { Notice } = window.MindiDesignSystem_ef6b32;
  return /* @__PURE__ */ React.createElement(Phone, null, /* @__PURE__ */ React.createElement("div", { style: { padding: 14, display: "grid", gap: 12 } }, /* @__PURE__ */ React.createElement(Notice, { kind: "emergency", title: "No est\xE1s sola en esto" }, "Marcaste algo que conviene revisar cuanto antes. Si en este momento tienes dolor de pecho intenso o te falta el aire de repente, acude a emergencias o llama al 106 (SAMU)."), /* @__PURE__ */ React.createElement(Notice, { kind: "eval", title: "No est\xE1s sola en esto" }, "Marcaste algo que vale la pena conversar con tu m\xE9dico antes de considerar cualquier tratamiento.")));
}
function AiChatScreen() {
  const { Chat, Bubble, Button } = window.MindiDesignSystem_ef6b32;
  return /* @__PURE__ */ React.createElement(Phone, { dark: true }, /* @__PURE__ */ React.createElement(Chat, { dark: true, status: "en l\xEDnea" }, /* @__PURE__ */ React.createElement(Bubble, { dark: true }, "Cu\xE9ntame tu duda sobre la perimenopausia o la menopausia."), /* @__PURE__ */ React.createElement(Bubble, { dark: true, from: "me" }, "\xBFEs normal tener bochornos a los 47?"), /* @__PURE__ */ React.createElement(Bubble, { dark: true }, "Son frecuentes en esta etapa. Para saber cu\xE1nto te est\xE1n afectando, te recomiendo hacer el test. Son 11 preguntas y al final tienes un reporte para llevar a tu m\xE9dico."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(Button, null, "Haz el test de 5 min \u2192"))));
}
Object.assign(__ds_scope, { Phone, TestScreen, ResultScreen, AlertScreen, AiChatScreen });
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Chat = __ds_scope.Chat;
__ds_ns.Bubble = __ds_scope.Bubble;
__ds_ns.Scale = __ds_scope.Scale;
__ds_ns.AreaBar = __ds_scope.AreaBar;
__ds_ns.Button = __ds_scope.Button;
__ds_ns.Card = __ds_scope.Card;
__ds_ns.Eyebrow = __ds_scope.Eyebrow;
__ds_ns.Chip = __ds_scope.Chip;
__ds_ns.Notice = __ds_scope.Notice;
__ds_ns.Field = __ds_scope.Field;
__ds_ns.Check = __ds_scope.Check;
__ds_ns.Phone = __ds_scope.Phone;
__ds_ns.TestScreen = __ds_scope.TestScreen;
__ds_ns.ResultScreen = __ds_scope.ResultScreen;
__ds_ns.AlertScreen = __ds_scope.AlertScreen;
__ds_ns.AiChatScreen = __ds_scope.AiChatScreen;

})();
