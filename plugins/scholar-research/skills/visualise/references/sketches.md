# Sketch templates

Concept sketches are not results. Caption them as sketches and give the sidecar `evidence_class: concept`.

## Mermaid method diagram
Save as `visuals/<name>.mmd`. Dotted arrows mean planned or hypothetical; solid arrows mean a step that is done or
a documented relationship. Keep node text short; put detail in the caption.
```
flowchart TD
  A["Data supplied by the scholar"] --> B["Inspect: schema, counts, gaps"]
  P["Planned sample (not observed)"] -.-> B
  B --> C{"Enough rows in each cell?"}
  C -->|yes| D["Analyse"]
  C -->|no| E["Gate: say what is missing"]
  D --> F["Figure, caption, sidecar"]
  E --> F
```
Mermaid renders natively in GitHub, GitLab and Quarto (a `{mermaid}` code block). For an SVG, the scholar can use
the Mermaid CLI or the live editor; do not claim an SVG you did not make.

## Excalidraw concept sketch (written by the agent, finished by the scholar)
Save as `<name>.excalidraw`. Excalidraw fills in missing element fields when it loads a file, but this minimal
form was not opened in Excalidraw by the author of this skill. Say so, and ask the scholar to open it, move
things, and export SVG or PNG. Never overwrite the scholar's existing `.excalidraw` boards; write a new file or
ask first. Uncertain links use `"strokeStyle": "dashed"`; links the scholar has confirmed use `"solid"`.
```
{
  "type": "excalidraw", "version": 2, "source": "scholar-method", "appState": {}, "files": {},
  "elements": [
    { "id": "a", "type": "rectangle", "x": 0, "y": 0, "width": 160, "height": 60, "strokeColor": "#1e1e1e", "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "solid", "roughness": 1, "opacity": 100, "angle": 0, "groupIds": [], "seed": 1, "version": 1, "versionNonce": 1, "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false },
    { "id": "ta", "type": "text", "x": 12, "y": 20, "width": 136, "height": 20, "text": "Idea A", "fontSize": 16, "fontFamily": 1, "textAlign": "center", "verticalAlign": "top", "strokeColor": "#1e1e1e", "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 1, "strokeStyle": "solid", "roughness": 1, "opacity": 100, "angle": 0, "groupIds": [], "seed": 2, "version": 1, "versionNonce": 2, "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false, "containerId": null, "originalText": "Idea A", "lineHeight": 1.25 },
    { "id": "ar", "type": "arrow", "x": 160, "y": 30, "width": 120, "height": 0, "points": [[0, 0], [120, 0]], "strokeColor": "#1e1e1e", "backgroundColor": "transparent", "fillStyle": "solid", "strokeWidth": 2, "strokeStyle": "dashed", "roughness": 1, "opacity": 100, "angle": 0, "groupIds": [], "seed": 3, "version": 1, "versionNonce": 3, "isDeleted": false, "boundElements": null, "updated": 1, "link": null, "locked": false, "startBinding": null, "endBinding": null, "startArrowhead": null, "endArrowhead": "arrow" }
  ]
}
```
Add a text element next to the arrow saying "hypothesis, unverified". Do not label any arrow "caused" or
"influenced" without a recorded source.
