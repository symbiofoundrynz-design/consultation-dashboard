# AI EcoSphere V1.0.1

AI EcoSphere is an internal SymbioFoundry consultation and education tool. It presents a client-centred orbital map of AI providers and their products.

## Run

Because browsers block JSON `fetch()` from `file://` pages, start the included local server.

### Windows

Double-click:

```text
start-ai-ecosphere.bat
```

Then open the address shown in the terminal, normally:

```text
http://127.0.0.1:8765
```

### Linux / macOS

```bash
./start-ai-ecosphere.sh
```

### Existing web server

Serve this folder as ordinary static files and open `index.html`.

## Controls

- Drag background or a logo: rotate the cloud
- Mouse wheel or `+` / `-`: zoom
- Arrow keys: rotate and tilt
- Click: bring provider branch to the foreground
- Double-click: open placeholder information sheet
- `Tab`: move keyboard focus through nodes
- `Enter`: foreground focused node
- `Space`: open focused-node information sheet
- `Escape`: close panel or clear selection
- Client orb or reset button: neutral view

## Idle presentation

After 10 seconds without interaction, the unselected cloud begins a very slow horizontal rotation. The rotation pauses while a node is hovered, selected, dragged, or displayed in the information panel. Reduced-motion mode and the ambient-motion toggle disable it.

## Data contract

`data-loader.js` contains the only data-source function:

```js
loadMatrixData()
```

V1 loads `mock-registry-matrix.json`. A future Cdash build can replace the loader so it fetches `/api/registry-matrix`, provided that endpoint returns the same normalized object shape.

The renderer contains no SQL, database table names, or raw-row transformation logic.

## Debug mode

Open:

```text
http://127.0.0.1:8765/?debug=1
```

This displays runtime node IDs and depth values.

## Scope

V1 is read-only and uses a static fixture. It includes no authentication, editing, scoring, matching, recommendation logic, public release rail, or live Cdash integration.
