import React, { useState, useId } from 'react';

export function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  const id = useId ? useId() : 'tooltip';
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {React.cloneElement(children, { 'aria-describedby': id, tabIndex: children.props.tabIndex ?? 0 })}
      {show && (
        <span role="tooltip" id={id} style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-6px)',
          background: 'var(--ink-900)', color: '#fff', fontFamily: 'var(--font-ui)', fontSize: 'var(--text-caption)',
          padding: '6px 10px', borderRadius: 'var(--radius-s)', whiteSpace: 'nowrap', boxShadow: 'var(--shadow-card)',
        }}>
          {label}
        </span>
      )}
    </span>
  );
}
