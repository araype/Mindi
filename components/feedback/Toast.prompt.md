Brief bottom-of-screen confirmation, e.g. after saving a check-in. `role="status"`/`aria-live="polite"` by default so screen readers announce it without interrupting; pass `urgent` only for something genuinely time-critical (switches to `role="alert"`).

```jsx
<Toast tone="success">Registro guardado ✓</Toast>
```
