## Zoom transition

> Use the zoom transition when the next section is a closer look at one detail of the last slide.

- The camera dived into the "Documents read" counter on the last slide, and this section grew in.
- section.ts { transition: "zoom", zoomTarget: "countsAim" } — zoomTarget names a ref on the old canvas: an element or a rect.
