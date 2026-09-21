Toggle switch for settings like reminders and notifications. Built on a real checkbox input (`role="switch"`, `aria-checked`) so it's keyboard-operable and announces state — the visible track/thumb is decorative and non-interactive. Default state should reflect the setting's real default (most Mindi settings that add data-sharing or daily obligation default OFF).

```jsx
<Switch label="Recordatorios diarios" checked={true} />
```
