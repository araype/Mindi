/* @ds-bundle: {"format":4,"namespace":"MindiDesignSystem_ef6b32","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"Badge","sourcePath":"components/feedback/Badge.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Tag","sourcePath":"components/feedback/Tag.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"GuidanceCard","sourcePath":"components/trust/GuidanceCard.jsx"},{"name":"ReviewedBy","sourcePath":"components/trust/ReviewedBy.jsx"},{"name":"SensitiveQuestion","sourcePath":"components/trust/SensitiveQuestion.jsx"},{"name":"SourceList","sourcePath":"components/trust/SourceList.jsx"},{"name":"TrustPanel","sourcePath":"components/trust/TrustPanel.jsx"}],"sourceHashes":{"components/core/Button.jsx":"4c480b0565ec","components/core/Card.jsx":"bc0f16023b20","components/core/Icon.jsx":"d85e67ecaa47","components/feedback/Badge.jsx":"e705149b278e","components/feedback/Dialog.jsx":"a5c51f275215","components/feedback/Tag.jsx":"8e10c7431d94","components/feedback/Toast.jsx":"76303c2608bc","components/feedback/Tooltip.jsx":"3f15144731f5","components/forms/Checkbox.jsx":"937cd45edac4","components/forms/Input.jsx":"c0c52d23e7b6","components/forms/Radio.jsx":"c481fb5f7477","components/forms/Select.jsx":"92d93afabeb8","components/forms/Switch.jsx":"0145d0bfdd6c","components/navigation/Tabs.jsx":"30fbb4b35f9e","components/trust/GuidanceCard.jsx":"f0eda3230645","components/trust/ReviewedBy.jsx":"f784ee1c8075","components/trust/SensitiveQuestion.jsx":"220127b464bf","components/trust/SourceList.jsx":"8ce624832914","components/trust/TrustPanel.jsx":"17bc6ac9f4cf","ui_kits/app/AskMindiScreen.jsx":"da543297ccd3","ui_kits/app/CheckinScreen.jsx":"335b5efeec08","ui_kits/app/HomeScreen.jsx":"c405eeb0df28","ui_kits/app/OnboardingScreen.jsx":"14f5ccae06b5","ui_kits/app/ProfileScreen.jsx":"0d80691dc408","ui_kits/app/ResourcesScreen.jsx":"cb56ecb4cf0b","ui_kits/app/Shell.jsx":"b6b71f6fe135"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.MindiDesignSystem_ef6b32 = window.MindiDesignSystem_ef6b32 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
function Button({
  variant = 'primary',
  size = 'm',
  disabled,
  icon,
  children,
  style: styleProp,
  ...rest
}) {
  const pad = size === 's' ? '10px 18px' : size === 'l' ? '16px 28px' : '13px 22px';
  const font = size === 's' ? 'var(--text-body-s)' : 'var(--text-body-m)';
  const minH = size === 's' ? '40px' : '44px';
  const base = {
    fontFamily: 'var(--font-ui)',
    fontSize: font,
    fontWeight: 600,
    border: '1px solid transparent',
    borderRadius: 'var(--radius-pill)',
    padding: pad,
    minHeight: minH,
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
    opacity: disabled ? 0.5 : 1,
    WebkitTapHighlightColor: 'transparent'
  };
  const variants = {
    primary: {
      background: 'var(--action-primary)',
      color: 'var(--text-on-brand)'
    },
    secondary: {
      background: 'var(--brand-secondary)',
      color: 'var(--text-on-brand)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--brand-secondary)',
      borderColor: 'var(--border-strong)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--brand-secondary)'
    }
  };
  const style = {
    ...base,
    ...variants[variant],
    ...styleProp
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: style,
    disabled: disabled,
    "aria-disabled": disabled || undefined,
    onPointerDown: e => {
      if (!disabled) e.currentTarget.style.transform = 'scale(0.97)';
    },
    onPointerUp: e => {
      e.currentTarget.style.transform = 'scale(1)';
    },
    onPointerLeave: e => {
      e.currentTarget.style.transform = 'scale(1)';
    }
  }, rest), icon, children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  children,
  padding = 'l'
}) {
  const pad = padding === 's' ? 'var(--space-m)' : padding === 'm' ? 'var(--space-l)' : 'var(--space-xl)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--shadow-card)',
      padding: pad,
      fontFamily: 'var(--font-body)'
    }
  }, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const PATHS = {
  chevronDown: 'M6 9l6 6 6-6',
  info: 'M12 16v-4M12 8h.01M12 21a9 9 0 100-18 9 9 0 000 18z',
  check: 'M20 6L9 17l-5-5',
  close: 'M18 6L6 18M6 6l12 12',
  message: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  book: 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 016.5 22H20V4H6.5A2.5 2.5 0 004 6.5v13z',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  heart: 'M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 10-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.8z',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z',
  home: 'M3 11.5L12 4l9 7.5M5 10v10a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V10'
};
function Icon({
  name,
  size = 20,
  color = 'currentColor',
  label,
  ...rest
}) {
  const d = PATHS[name];
  if (!d) return null;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "1.75",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: label ? 'img' : 'presentation',
    "aria-label": label,
    "aria-hidden": label ? undefined : true
  }, rest), /*#__PURE__*/React.createElement("path", {
    d: d
  }));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Badge.jsx
try { (() => {
function Badge({
  tone = 'neutral',
  children
}) {
  const tones = {
    neutral: {
      background: 'var(--sand-200)',
      color: 'var(--text-secondary)'
    },
    brand: {
      background: 'var(--terracotta-100)',
      color: 'var(--action-primary)'
    },
    success: {
      background: 'var(--success-tint)',
      color: 'var(--success-text)'
    },
    warning: {
      background: 'var(--warning-tint)',
      color: 'var(--warning-text)'
    },
    danger: {
      background: 'var(--danger-tint)',
      color: 'var(--danger-text)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      ...tones[tone],
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-caption)',
      fontWeight: 600,
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      display: 'inline-flex',
      alignItems: 'center'
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Badge.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
const {
  useEffect,
  useRef
} = React;
function Dialog({
  open,
  title,
  children,
  onClose,
  titleId = 'dialog-title'
}) {
  const closeRef = useRef(null);
  const openerRef = useRef(null);
  useEffect(() => {
    if (open) {
      openerRef.current = document.activeElement;
      closeRef.current && closeRef.current.focus();
      const onKey = e => {
        if (e.key === 'Escape') onClose && onClose();
      };
      document.addEventListener('keydown', onKey);
      return () => {
        document.removeEventListener('keydown', onKey);
        openerRef.current && openerRef.current.focus && openerRef.current.focus();
      };
    }
  }, [open]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(58,42,42,0.35)',
      backdropFilter: 'blur(2px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 100,
      fontFamily: 'var(--font-ui)'
    },
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": title ? titleId : undefined,
    onClick: e => e.stopPropagation(),
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--shadow-raised)',
      padding: 'var(--space-xl)',
      maxWidth: '380px',
      width: '90%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    ref: closeRef,
    type: "button",
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '36px',
      height: '36px',
      border: 'none',
      background: 'transparent',
      color: 'var(--text-muted)',
      fontSize: '18px',
      cursor: 'pointer',
      borderRadius: '50%'
    }
  }, "\u2715"), title && /*#__PURE__*/React.createElement("h3", {
    id: titleId,
    style: {
      fontSize: 'var(--text-heading-l)',
      marginBottom: 'var(--space-s)',
      color: 'var(--text-primary)',
      paddingRight: '28px'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-body-m)',
      lineHeight: 'var(--lh-body)'
    }
  }, children)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tag.jsx
try { (() => {
function Tag({
  selected,
  onClick,
  children
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-pressed": !!selected,
    onClick: onClick,
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-s)',
      fontWeight: 500,
      minHeight: '44px',
      padding: '10px 18px',
      borderRadius: 'var(--radius-pill)',
      cursor: 'pointer',
      border: `1.5px solid ${selected ? 'var(--action-primary)' : 'var(--border-default)'}`,
      background: selected ? 'var(--terracotta-100)' : 'var(--surface-card)',
      color: selected ? 'var(--action-primary)' : 'var(--text-secondary)',
      transition: 'background var(--duration-fast) var(--ease-standard)'
    }
  }, selected && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      marginRight: '6px'
    }
  }, "\u2713"), children);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function Toast({
  tone = 'brand',
  urgent,
  children
}) {
  const tones = {
    brand: {
      background: 'var(--brand-secondary)',
      color: '#fff'
    },
    success: {
      background: 'var(--success-text)',
      color: '#fff'
    },
    danger: {
      background: 'var(--danger-text)',
      color: '#fff'
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    role: urgent ? 'alert' : 'status',
    "aria-live": urgent ? 'assertive' : 'polite',
    style: {
      ...tones[tone],
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      fontWeight: 500,
      padding: '14px 20px',
      borderRadius: 'var(--radius-m)',
      boxShadow: 'var(--shadow-raised)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, children);
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
const {
  useState,
  useId
} = React;
function Tooltip({
  label,
  children
}) {
  const [show, setShow] = useState(false);
  const id = useId ? useId() : 'tooltip';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-block'
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, React.cloneElement(children, {
    'aria-describedby': id,
    tabIndex: children.props.tabIndex ?? 0
  }), show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    id: id,
    style: {
      position: 'absolute',
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%) translateY(-6px)',
      background: 'var(--ink-900)',
      color: '#fff',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-caption)',
      padding: '6px 10px',
      borderRadius: 'var(--radius-s)',
      whiteSpace: 'nowrap',
      boxShadow: 'var(--shadow-card)'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}
function Checkbox({
  label,
  checked,
  onChange,
  id
}) {
  const inputId = id || nextId('checkbox');
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      minHeight: '44px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "checkbox",
    checked: !!checked,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      width: '20px',
      height: '20px',
      flexShrink: 0,
      accentColor: 'var(--action-primary)',
      cursor: 'pointer'
    }
  }), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}
function Input({
  label,
  placeholder,
  type = 'text',
  helperText,
  error,
  id,
  ...rest
}) {
  const inputId = id || nextId('input');
  const helperId = helperText ? `${inputId}-helper` : undefined;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-ui)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-secondary)',
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    type: type,
    placeholder: placeholder,
    "aria-invalid": error || undefined,
    "aria-describedby": helperId,
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      padding: '13px 16px',
      minHeight: '44px',
      borderRadius: 'var(--radius-m)',
      border: `1.5px solid ${error ? 'var(--danger-500)' : 'var(--border-default)'}`,
      background: 'var(--surface-card)',
      color: 'var(--text-primary)',
      outline: 'none'
    }
  }, rest)), helperText && /*#__PURE__*/React.createElement("span", {
    id: helperId,
    style: {
      fontSize: 'var(--text-caption)',
      color: error ? 'var(--danger-text)' : 'var(--text-muted)'
    }
  }, helperText));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}
function Radio({
  label,
  checked,
  onChange,
  name,
  id
}) {
  const inputId = id || nextId('radio');
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      minHeight: '44px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "radio",
    name: name,
    checked: !!checked,
    onChange: () => onChange && onChange(true),
    style: {
      width: '20px',
      height: '20px',
      flexShrink: 0,
      accentColor: 'var(--action-primary)',
      cursor: 'pointer'
    }
  }), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}
function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Elige una opción',
  id
}) {
  const selectId = id || nextId('select');
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      fontFamily: 'var(--font-ui)',
      width: '100%'
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selectId,
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-secondary)',
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("select", {
    id: selectId,
    value: value ?? '',
    onChange: e => onChange && onChange(e.target.value),
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      padding: '13px 16px',
      minHeight: '44px',
      borderRadius: 'var(--radius-m)',
      border: '1.5px solid var(--border-default)',
      background: 'var(--surface-card)',
      color: value ? 'var(--text-primary)' : 'var(--text-muted)',
      appearance: 'none'
    }
  }, /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true,
    hidden: true
  }, placeholder), options.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt,
    value: opt
  }, opt))));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
let uid = 0;
function nextId(prefix) {
  uid += 1;
  return `${prefix}-${uid}`;
}
function Switch({
  checked,
  onChange,
  label,
  id
}) {
  const inputId = id || nextId('switch');
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-primary)',
      cursor: 'pointer',
      minHeight: '44px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      width: '44px',
      height: '26px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "checkbox",
    role: "switch",
    "aria-checked": !!checked,
    checked: !!checked,
    onChange: e => onChange && onChange(e.target.checked),
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0,
      cursor: 'pointer',
      width: '100%',
      height: '100%',
      margin: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--action-primary)' : 'var(--ink-200)',
      transition: 'background var(--duration-base) var(--ease-standard)',
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: '3px',
      left: checked ? '21px' : '3px',
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      background: '#fff',
      boxShadow: 'var(--shadow-card)',
      transition: 'left var(--duration-base) var(--ease-gentle)'
    }
  }))), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
const {
  useState,
  useRef
} = React;
function Tabs({
  items = [],
  defaultActive = 0,
  onChange,
  label = 'Secciones'
}) {
  const [active, setActive] = useState(defaultActive);
  const refs = useRef([]);
  const select = i => {
    setActive(i);
    onChange && onChange(i);
  };
  const onKeyDown = (e, i) => {
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % items.length;
    if (e.key === 'ArrowLeft') next = (i - 1 + items.length) % items.length;
    if (next !== null) {
      e.preventDefault();
      select(next);
      refs.current[next] && refs.current[next].focus();
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    "aria-label": label,
    style: {
      display: 'flex',
      gap: '4px',
      background: 'var(--sand-200)',
      borderRadius: 'var(--radius-pill)',
      padding: '4px',
      fontFamily: 'var(--font-ui)',
      width: 'fit-content'
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement("button", {
    key: item,
    ref: el => refs.current[i] = el,
    role: "tab",
    type: "button",
    "aria-selected": active === i,
    tabIndex: active === i ? 0 : -1,
    onKeyDown: e => onKeyDown(e, i),
    onClick: () => select(i),
    style: {
      padding: '10px 18px',
      minHeight: '40px',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--text-body-s)',
      fontWeight: 600,
      background: active === i ? 'var(--surface-card)' : 'transparent',
      color: active === i ? 'var(--action-primary)' : 'var(--text-secondary)',
      boxShadow: active === i ? 'var(--shadow-card)' : 'none'
    }
  }, item)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/trust/GuidanceCard.jsx
try { (() => {
function GuidanceCard({
  title,
  children,
  limits
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-l)',
      fontFamily: 'var(--font-ui)'
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--text-heading-m)',
      color: 'var(--text-primary)',
      marginBottom: 'var(--space-s)'
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-body-m)',
      lineHeight: 'var(--lh-body)'
    }
  }, children), limits && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 'var(--space-m)',
      paddingTop: 'var(--space-m)',
      borderTop: '1px solid var(--border-default)',
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-muted)'
    }
  }, limits));
}
Object.assign(__ds_scope, { GuidanceCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/GuidanceCard.jsx", error: String((e && e.message) || e) }); }

// components/trust/ReviewedBy.jsx
try { (() => {
function ReviewedBy({
  name,
  role,
  date,
  isPlaceholder = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      background: 'var(--sand-200)',
      flexShrink: 0
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", null, "Revisado por ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: 'var(--text-secondary)'
    }
  }, name), role ? `, ${role}` : '', date ? ` · ${date}` : '', isPlaceholder && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--warning-text)',
      fontSize: 'var(--text-caption)'
    }
  }, "Marcador de posici\xF3n \u2014 pendiente de revisi\xF3n cl\xEDnica real")));
}
Object.assign(__ds_scope, { ReviewedBy });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/ReviewedBy.jsx", error: String((e && e.message) || e) }); }

// components/trust/SensitiveQuestion.jsx
try { (() => {
const {
  useState
} = React;
function SensitiveQuestion({
  question,
  reason,
  onAnswer,
  onDecline
}) {
  const [declined, setDeclined] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-l)',
      fontFamily: 'var(--font-ui)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-l)',
      color: 'var(--text-primary)'
    }
  }, question), reason && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-muted)',
      marginTop: '8px'
    }
  }, "Te pregunto esto porque ", reason), declined ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-muted)',
      marginTop: '12px'
    }
  }, "Sin problema. Podemos seguir sin esa informaci\xF3n.") : /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      marginTop: '14px'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onAnswer,
    style: {
      fontFamily: 'var(--font-ui)',
      fontWeight: 600,
      fontSize: 'var(--text-body-s)',
      minHeight: '44px',
      padding: '10px 20px',
      borderRadius: 'var(--radius-pill)',
      border: 'none',
      background: 'var(--action-primary)',
      color: '#fff',
      cursor: 'pointer'
    }
  }, "Responder"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setDeclined(true);
      onDecline && onDecline();
    },
    style: {
      fontFamily: 'var(--font-ui)',
      fontWeight: 600,
      fontSize: 'var(--text-body-s)',
      minHeight: '44px',
      padding: '10px 20px',
      borderRadius: 'var(--radius-pill)',
      border: '1.5px solid var(--border-strong)',
      background: 'transparent',
      color: 'var(--text-secondary)',
      cursor: 'pointer'
    }
  }, "Prefiero no responder")));
}
Object.assign(__ds_scope, { SensitiveQuestion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/SensitiveQuestion.jsx", error: String((e && e.message) || e) }); }

// components/trust/SourceList.jsx
try { (() => {
function SourceList({
  sources = []
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-caption)',
      fontWeight: 600,
      color: 'var(--text-muted)',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: 'var(--tracking-wide)'
    }
  }, "Fuentes"), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px'
    }
  }, sources.map((s, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-secondary)'
    }
  }, s.href ? /*#__PURE__*/React.createElement("a", {
    href: s.href,
    style: {
      color: 'var(--brand-secondary)'
    }
  }, s.label) : s.label))));
}
Object.assign(__ds_scope, { SourceList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/SourceList.jsx", error: String((e && e.message) || e) }); }

// components/trust/TrustPanel.jsx
try { (() => {
function TrustPanel({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--sand-200)',
      borderRadius: 'var(--radius-m)',
      padding: 'var(--space-m)',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-secondary)',
      lineHeight: 'var(--lh-body)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }
  }, children);
}
Object.assign(__ds_scope, { TrustPanel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/trust/TrustPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/AskMindiScreen.jsx
try { (() => {
function AskMindiScreen({
  Button,
  Icon,
  SensitiveQuestion,
  GuidanceCard,
  TrustPanel,
  ReviewedBy,
  SourceList
}) {
  const {
    useState,
    useRef
  } = React;
  const [messages, setMessages] = useState([{
    from: 'mindi',
    text: 'Cuéntame qué estás sintiendo o qué te preocupa.'
  }]);
  const [input, setInput] = useState('');
  const [stage, setStage] = useState('intro');
  const listRef = useRef(null);
  const send = text => {
    const value = (text ?? input).trim();
    if (!value) return;
    setMessages(m => [...m, {
      from: 'user',
      text: value
    }]);
    setInput('');
    if (stage === 'intro') {
      setTimeout(() => {
        setMessages(m => [...m, {
          from: 'mindi',
          text: 'Entiendo. Para ubicar mejor qué puede estar pasando, quisiera preguntarte algo. Tú decides cuánto quieres contarme.'
        }, {
          from: 'sensitive'
        }]);
        setStage('asked');
      }, 300);
    } else if (stage === 'asked' || stage === 'declined') {
      setTimeout(() => setMessages(m => [...m, {
        from: 'guidance'
      }]), 300);
      setStage('done');
    }
  };
  const onAnswerSensitive = () => {
    setMessages(m => [...m, {
      from: 'user',
      text: 'Desde hace un par de meses.'
    }, {
      from: 'mindi',
      text: 'Gracias por contarme. Esto es lo que puedo ofrecerte:'
    }, {
      from: 'guidance'
    }]);
    setStage('done');
  };
  const onDeclineSensitive = () => {
    setMessages(m => [...m, {
      from: 'mindi',
      text: 'Sin problema, sigamos sin eso. Con lo que me contaste, esto es lo que puedo ofrecerte:'
    }, {
      from: 'guidance'
    }]);
    setStage('done');
  };
  const suggestions = ['Sofocos', 'No puedo dormir bien', 'Cambios de ánimo'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 20px 10px',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontSize: 'var(--text-editorial-m)',
      color: 'var(--text-primary)'
    }
  }, "Hablar con Mindi")), /*#__PURE__*/React.createElement("div", {
    ref: listRef,
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, messages.map((m, i) => {
    if (m.from === 'sensitive') {
      return /*#__PURE__*/React.createElement(SensitiveQuestion, {
        key: i,
        question: "\xBFHace cu\xE1nto notas estos cambios?",
        reason: "puede ayudarme a entender mejor lo que est\xE1s viviendo.",
        onAnswer: onAnswerSensitive,
        onDecline: onDeclineSensitive
      });
    }
    if (m.from === 'guidance') {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }
      }, /*#__PURE__*/React.createElement(GuidanceCard, {
        title: "Sobre lo que me cuentas",
        limits: "Esto es orientaci\xF3n general, no un diagn\xF3stico. Si el malestar es fuerte, repentino o te preocupa, conviene hablar con un profesional de salud."
      }, "Lo que describes es algo que muchas mujeres notan en esta etapa. Puede ayudarte anotarlo unos d\xEDas para ver si sigue un patr\xF3n, y comentarlo con tu m\xE9dico si contin\xFAa o te incomoda.", /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: '10px',
          fontSize: 'var(--text-caption)',
          color: 'var(--text-muted)'
        }
      }, "Ejemplo de respuesta para este prototipo \u2014 el contenido cl\xEDnico real de Mindi todav\xEDa no est\xE1 definido.")), /*#__PURE__*/React.createElement(TrustPanel, null, /*#__PURE__*/React.createElement(ReviewedBy, {
        name: "Nombre del profesional / especialidad",
        date: "Ejemplo de fecha"
      }), /*#__PURE__*/React.createElement(SourceList, {
        sources: [{
          label: 'Ejemplo de fuente 1'
        }, {
          label: 'Ejemplo de fuente 2'
        }]
      })));
    }
    const isUser = m.from === 'user';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: '80%',
        padding: '12px 16px',
        borderRadius: 'var(--radius-m)',
        fontSize: 'var(--text-body-m)',
        lineHeight: 'var(--lh-body)',
        background: isUser ? 'var(--brand-secondary)' : 'var(--surface-card)',
        color: isUser ? '#fff' : 'var(--text-primary)',
        boxShadow: isUser ? 'none' : 'var(--shadow-card)'
      }
    }, m.text));
  })), stage === 'intro' && messages.length === 1 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      padding: '10px 20px',
      flexWrap: 'wrap',
      flexShrink: 0
    }
  }, suggestions.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    type: "button",
    onClick: () => send(s),
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-s)',
      padding: '10px 16px',
      minHeight: '40px',
      borderRadius: 'var(--radius-pill)',
      border: '1.5px solid var(--border-default)',
      background: 'var(--surface-card)',
      color: 'var(--text-secondary)',
      cursor: 'pointer'
    }
  }, s))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '8px',
      padding: '12px 20px 20px',
      borderTop: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "ask-mindi-input",
    style: {
      position: 'absolute',
      width: 1,
      height: 1,
      overflow: 'hidden',
      clip: 'rect(0 0 0 0)'
    }
  }, "Escribe tu mensaje"), /*#__PURE__*/React.createElement("input", {
    id: "ask-mindi-input",
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter') send();
    },
    placeholder: "Escribe aqu\xED",
    style: {
      flex: 1,
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      padding: '12px 16px',
      minHeight: '44px',
      borderRadius: 'var(--radius-pill)',
      border: '1.5px solid var(--border-default)'
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "m",
    onClick: () => send(),
    icon: /*#__PURE__*/React.createElement(Icon, {
      name: "send",
      size: 16
    })
  }, "Enviar")));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/AskMindiScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/CheckinScreen.jsx
try { (() => {
function CheckinScreen({
  Tag,
  Button,
  Radio,
  onDone
}) {
  const {
    useState
  } = React;
  const [selected, setSelected] = useState([]);
  const [unsure, setUnsure] = useState(false);
  const symptoms = ['Sofocos', 'Sueño irregular', 'Cambios de ánimo', 'Fatiga', 'Dolores', 'Otro'];
  const toggle = s => setSelected(selected.includes(s) ? selected.filter(x => x !== s) : [...selected, s]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontSize: 'var(--text-editorial-m)',
      color: 'var(--text-primary)'
    }
  }, "\xBFC\xF3mo te has sentido?"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-body-m)',
      marginTop: '6px'
    }
  }, "Esto es opcional. Elige lo que aplique, o nada si prefieres.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px'
    }
  }, symptoms.map(s => /*#__PURE__*/React.createElement(Tag, {
    key: s,
    selected: selected.includes(s),
    onClick: () => toggle(s)
  }, s))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-secondary)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: unsure,
    onChange: e => setUnsure(e.target.checked),
    style: {
      width: '20px',
      height: '20px',
      accentColor: 'var(--action-primary)'
    }
  }), "No s\xE9 c\xF3mo explicarlo"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "l",
    onClick: onDone
  }, "Guardar"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "m",
    onClick: onDone
  }, "Omitir por ahora"));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/CheckinScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/HomeScreen.jsx
try { (() => {
function HomeScreen({
  Card,
  Badge,
  Button,
  Icon,
  onOpenAsk,
  onOpenCheckin
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '22px',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-muted)'
    }
  }, "Hola, Andrea"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontSize: 'var(--text-editorial-l)',
      color: 'var(--text-primary)',
      marginTop: '4px'
    }
  }, "\xBFEn qu\xE9 podemos acompa\xF1arte hoy?")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenAsk,
    style: {
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      background: 'var(--surface-card)',
      borderRadius: 'var(--radius-l)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-l)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      color: 'var(--action-primary)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "message",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 'var(--text-body-m)'
    }
  }, "Hablar con Mindi")), /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-body-m)'
    }
  }, "Cu\xE9ntame qu\xE9 est\xE1s sintiendo o qu\xE9 te preocupa.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--text-heading-m)',
      color: 'var(--text-primary)',
      marginBottom: '10px'
    }
  }, "Para ti"), /*#__PURE__*/React.createElement(Card, {
    padding: "m"
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, "S\xEDntomas"), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: '10px',
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-primary)'
    }
  }, "Los sofocos, explicados con calma"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--text-heading-m)',
      color: 'var(--text-primary)',
      marginBottom: '10px'
    }
  }, "A otras mujeres tambi\xE9n les pasa"), /*#__PURE__*/React.createElement(Card, {
    padding: "m"
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-secondary)'
    }
  }, "\"Pens\xE9 que era la \xFAnica a la que le costaba dormir as\xED. Ayuda saber que no es raro.\""), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)',
      marginTop: '8px'
    }
  }, "Ejemplo de historia para prototipo \u2014 no representa un testimonio real."))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onOpenCheckin,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      textAlign: 'left',
      border: '1px solid var(--border-default)',
      borderRadius: 'var(--radius-m)',
      background: 'transparent',
      padding: '14px 16px',
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      minHeight: '44px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-secondary)'
    }
  }, "\xBFQuieres registrar c\xF3mo te sientes hoy? Es opcional."), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown",
    size: 16,
    style: {
      transform: 'rotate(-90deg)',
      color: 'var(--text-muted)'
    }
  })));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/OnboardingScreen.jsx
try { (() => {
function OnboardingScreen({
  Button,
  Input,
  onDone
}) {
  const {
    useState
  } = React;
  const [step, setStep] = useState(0);
  const steps = [{
    title: 'Bienvenida a Mindi',
    body: 'Un espacio cercano para entender lo que estás viviendo, cuando tú quieras.'
  }, {
    title: 'Empecemos con lo básico',
    form: true
  }, {
    title: 'Tú decides qué compartir',
    body: 'Puedes elegir qué contarle a Mindi. Siempre queremos que entiendas cómo usamos tu información y puedas ajustar tus preferencias cuando quieras.'
  }];
  const current = steps[step];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '40px 28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      height: '100%',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '6px'
    }
  }, steps.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: '4px',
      flex: 1,
      borderRadius: '2px',
      background: i <= step ? 'var(--action-primary)' : 'var(--sand-200)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontSize: 'var(--text-editorial-l)',
      color: 'var(--text-primary)',
      lineHeight: 'var(--lh-editorial)'
    }
  }, current.title), current.body && /*#__PURE__*/React.createElement("p", {
    style: {
      color: 'var(--text-secondary)',
      fontSize: 'var(--text-body-l)'
    }
  }, current.body), current.form && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "\xBFC\xF3mo te llamamos?",
    placeholder: "Tu nombre"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Correo (para guardar tu espacio)",
    placeholder: "tucorreo@ejemplo.com",
    type: "email",
    helperText: "Lo usamos solo para que puedas volver a tu cuenta."
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "l",
    onClick: () => step < steps.length - 1 ? setStep(step + 1) : onDone()
  }, step < steps.length - 1 ? 'Continuar' : 'Empezar'));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/OnboardingScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ProfileScreen.jsx
try { (() => {
function ProfileScreen({
  Card,
  Switch,
  Button,
  Icon
}) {
  const {
    useState
  } = React;
  const [reminders, setReminders] = useState(false);
  const [shareAnon, setShareAnon] = useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: 'var(--terracotta-100)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--action-primary)',
      fontFamily: 'var(--font-editorial)',
      fontSize: '22px'
    }
  }, "A"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-heading-l)',
      fontFamily: 'var(--font-editorial)',
      color: 'var(--text-primary)'
    }
  }, "Andrea"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-muted)'
    }
  }, "andrea@ejemplo.com"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--text-heading-m)',
      color: 'var(--text-primary)',
      marginBottom: '10px'
    }
  }, "Recordatorios"), /*#__PURE__*/React.createElement(Card, {
    padding: "m"
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Recibir un recordatorio ocasional",
    checked: reminders,
    onChange: setReminders
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)',
      marginTop: '8px'
    }
  }, "Apagado por defecto. Si lo activas, puedes elegir cu\xE1ndo y con qu\xE9 frecuencia."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 'var(--text-heading-m)',
      color: 'var(--text-primary)',
      marginBottom: '10px'
    }
  }, "Privacidad y datos"), /*#__PURE__*/React.createElement(Card, {
    padding: "m"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }
  }, /*#__PURE__*/React.createElement(Switch, {
    label: "Compartir datos an\xF3nimos para mejorar Mindi",
    checked: shareAnon,
    onChange: setShareAnon
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, "Apagado por defecto. Nunca incluye tu nombre ni datos de contacto."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      border: 'none',
      background: 'transparent',
      padding: 0,
      cursor: 'pointer',
      minHeight: '44px',
      fontFamily: 'var(--font-ui)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-body-s)',
      color: 'var(--text-secondary)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 16
  }), "Ver qu\xE9 comparto y por qu\xE9"), /*#__PURE__*/React.createElement(Icon, {
    name: "chevronDown",
    size: 16,
    style: {
      transform: 'rotate(-90deg)',
      color: 'var(--text-muted)'
    }
  }))))), /*#__PURE__*/React.createElement(Button, {
    variant: "outline"
  }, "Cerrar sesi\xF3n"));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ProfileScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/ResourcesScreen.jsx
try { (() => {
function ResourcesScreen({
  Card,
  Badge,
  Tabs,
  Icon
}) {
  const ARTICLES = [{
    title: 'Los sofocos, explicados con calma',
    tag: 'Síntomas',
    read: '4 min',
    reviewed: true
  }, {
    title: 'Dormir mejor durante la perimenopausia',
    tag: 'Sueño',
    read: '5 min',
    reviewed: true
  }, {
    title: 'Hablar con tu médico sin sentirte apurada',
    tag: 'Guías',
    read: '3 min',
    reviewed: false
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-editorial)',
      fontSize: 'var(--text-editorial-m)',
      color: 'var(--text-primary)'
    }
  }, "Recursos"), /*#__PURE__*/React.createElement(Tabs, {
    items: ['Todos', 'Guardados']
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }
  }, ARTICLES.map(a => /*#__PURE__*/React.createElement(Card, {
    key: a.title,
    padding: "m"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral"
  }, a.tag), /*#__PURE__*/React.createElement("p", {
    style: {
      marginTop: '10px',
      fontSize: 'var(--text-body-m)',
      color: 'var(--text-primary)'
    }
  }, a.title)), /*#__PURE__*/React.createElement(Icon, {
    name: "bookmark",
    size: 18,
    style: {
      color: 'var(--text-muted)',
      flexShrink: 0
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: '10px',
      marginTop: '10px',
      fontSize: 'var(--text-caption)',
      color: 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement("span", null, a.read, " de lectura"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", null, a.reviewed ? 'Revisado — ejemplo de fuente' : 'Aún sin revisión clínica'))))));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/ResourcesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/app/Shell.jsx
try { (() => {
function PhoneFrame({
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '380px',
      height: '760px',
      background: 'var(--surface-page)',
      borderRadius: '36px',
      boxShadow: 'var(--shadow-raised)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-ui)',
      border: '8px solid var(--ink-900)'
    }
  }, children);
}
function BottomNav({
  active,
  onSelect,
  Icon
}) {
  const items = [{
    key: 'home',
    label: 'Inicio',
    icon: 'home'
  }, {
    key: 'mindi',
    label: 'Mindi',
    icon: 'message'
  }, {
    key: 'resources',
    label: 'Recursos',
    icon: 'book'
  }, {
    key: 'profile',
    label: 'Perfil',
    icon: 'user'
  }];
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Navegaci\xF3n principal",
    style: {
      display: 'flex',
      borderTop: '1px solid var(--border-default)',
      background: 'var(--surface-card)',
      padding: '8px 8px 16px',
      flexShrink: 0
    }
  }, items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.key,
    type: "button",
    "aria-current": active === it.key ? 'page' : undefined,
    onClick: () => onSelect(it.key),
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      minHeight: '44px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      fontSize: 'var(--text-caption)',
      fontWeight: 600,
      padding: '6px 4px',
      color: active === it.key ? 'var(--action-primary)' : 'var(--text-muted)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon,
    size: 20
  }), it.label)));
}
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/app/Shell.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.GuidanceCard = __ds_scope.GuidanceCard;

__ds_ns.ReviewedBy = __ds_scope.ReviewedBy;

__ds_ns.SensitiveQuestion = __ds_scope.SensitiveQuestion;

__ds_ns.SourceList = __ds_scope.SourceList;

__ds_ns.TrustPanel = __ds_scope.TrustPanel;

})();
