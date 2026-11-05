Chat del test (claro, 10.1) y chat con IA (oscuro, 10.5): `Chat`, `Bubble`, `Scale`, `AreaBar`.

```jsx
<Chat status="Pregunta 1 de 11">
  <Bubble example="Por ejemplo: oleadas de calor…">¿Qué tanto te han molestado los bochornos?</Bubble>
  <Scale labels={['No los noto','Los noto, pero sigo mi día','Me interrumpen un poco','Me cuesta seguir lo que hacía','Paro todo hasta que pasan']} />
  <Bubble from="me">3 · Me cuesta seguir lo que hacía</Bubble>
</Chat>
<Chat dark status="en línea"><Bubble dark>Cuéntame tu duda…</Bubble></Chat>
```

La burbuja de la usuaria va en `#C0128C` con texto blanco. En la escala, los niveles 3 y 4 llevan el fondo oscurecido y texto blanco. Las áreas se llaman Cuerpo, Ánimo y Vida íntima, nunca somático, psicológico o urogenital. El test y el chat con IA son sesiones separadas.
