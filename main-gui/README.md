# 📘 README – PMC Tester (Electron + React + Vite + SQLite)

## 🏭 Overview

PMC Tester es una aplicación industrial para:

* Conectar con el PMC vía MQTT
* Visualizar resultados en tiempo real
* Guardar resultados en base SQLite local
* Exportar CSV y JSON
* Ejecutar pasos manuales de prueba
* Operar en modo pantalla completa en paneles industriales

El frontend está hecho con **React + Vite**, y el backend con **Electron (main + preload + IPC)**.
Los datos se almacenan en **SQLite (better-sqlite3)**.

---

## 📂 Estructura del Proyecto

```
project-root/
├─ electron/
│   ├─ main.ts                # Proceso principal de Electron
│   ├─ preload.ts             # API expuesta a frontend
│   ├─ ipc/                   # Handlers IPC (results, logs, etc.)
│   ├─ db/                    # SQLite wrapper (better-sqlite3)
│   ├─ utils/                 # Servicios auxiliares (logs)
│   └─ types/                 # Tipos compartidos para Electron
│
├─ electron-build/            # Código JS compilado de Electron (output)
│
├─ src/                       # React + Vite frontend
│
├─ build/                     # Build final de React
│
├─ dist/                      # Output final electron-builder (.exe)
│
├─ package.json               # Configuración general + electron-builder
└─ vite.config.ts
```

---

## 🚀 Desarrollo

Para desarrollo, React se ejecuta con Vite y Electron se conecta a él.

### 📌 Iniciar entorno de desarrollo

```
npm run dev
```

Esto lanza:

* Vite en: `http://localhost:5173`
* Electron apuntando a ese servidor
* Auto-refresh del frontend
* Auto-reload de Electron

---

## 🛠 Build para producción (sin empaquetado)

Antes de empaquetar, compila ambos runtimes.

### 1) Compilar Electron (TS → JS)

```
tsc -b electron
```

Genera:

```
electron-build/main.js
electron-build/preload.js
...
```

### 2) Compilar React

```
vite build
```

Genera:

```
build/index.html
```

### 📌 Atajo

```
npm run build
```

---

## 📦 Empaquetado Windows (.exe)

Usamos **electron-builder**.

### 🚀 Generar instalador:

```
npm run dist
```

Esto crea:

```
dist/PMC Tester Setup 1.0.0.exe
```

---

## 💾 Base de Datos SQLite

La base local se almacena en:

```
%APPDATA%/PMC Tester/pmc_results.db
```

Esto asegura:

* Persistencia
* No requiere permisos de administrador
* Es estándar en Electron apps

---

## 🔌 API entre Renderer y Main (Preload)

APIs disponibles:

```
window.resultsApi.saveResult()
window.resultsApi.getRecent()
window.resultsApi.exportCsv()
window.resultsApi.exportJson()
window.electronAPI.cleanupLogs()
```

Seguras bajo `contextIsolation: true`.

---

## 🧱 Componentes Clave

* **main.ts** – crea ventana, carga Vite/Build, registra IPC.
* **preload.ts** – expone APIs al frontend.
* **resultsIpc.ts** – opera SQLite, exporta CSV/JSON.
* **testResultsDb.ts** – acceso a SQLite (WAL mode).

---

## 🪛 Scripts del Proyecto

| Script            | Acción                      |
| ----------------- | --------------------------- |
| `npm run dev`     | Dev mode: Vite + Electron   |
| `npm run build`   | Compila frontend + electron |
| `npm run dist`    | Genera instalador Windows   |
| `npm run preview` | Vista previa del build Vite |

---

## 🔐 Seguridad

* `contextIsolation: true`
* `nodeIntegration: false`
* Preload seguro
* IPC controlado
* DB en `userData/`

---

## 🧰 Rebuild de módulos nativos

```
npx electron-builder install-app-deps
```

---

## 🆘 Troubleshooting

* Si la app arranca en blanco:

  1. Verifica `electron-build/main.js`
  2. Revisa rutas de preload
  3. Revisa `loadFile(__dirname + "../build/index.html")`
  4. Borra DB y logs de `%APPDATA%/PMC Tester/`

---

## 🏁 Deploy / Entrega

Tras ejecutar:

```
npm run dist
```

Entrega:

```
dist/PMC Tester Setup X.X.X.exe
```

Listo para instalar en cualquier PC Windows.

---

## 👨‍💼 Contribución

1. Crear nueva rama
2. `npm run dev`
3. Hacer cambios en React o Electron
4. `npm run build`
5. Subir PR

---

📄 Licencia de Uso Comercial

Este software es propiedad exclusiva de Guillermo Guereque y OPTIMATIKS SA DE CV.
Se concede permiso para su uso comercial, instalación y operación en entornos industriales únicamente a clientes autorizados.

Está estrictamente prohibido:

Redistribuir, revender o sublicenciar el software sin autorización escrita.

Realizar ingeniería inversa, descompilar o modificar el código.

Integrar partes del sistema en otros productos sin permiso.

Utilizar el software fuera del alcance del proyecto contratado.

El uso de este software implica aceptación total de estos términos.
Para licencias extendidas, soporte premium o despliegues masivos, contactar a la empresa propietaria.
