Centered modal with soft scrim, used sparingly — for confirmations, not interruptions. `role="dialog"` + `aria-modal`, closes on Escape or the close button, traps focus on open and returns it to the trigger on close.

```jsx
<Dialog open title="¿Guardar tu registro?" onClose={() => {}}>
  Puedes editarlo después.
</Dialog>
```
