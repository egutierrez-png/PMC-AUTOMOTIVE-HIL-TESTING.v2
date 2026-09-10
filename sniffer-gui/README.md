# 🧩 PMC Sniffer GUI v1.0.0

Aplicación de diagnóstico y monitoreo CAN desarrollada para el **Portenta Machine Control (PMC)**.  
Permite visualizar en tiempo real los mensajes CAN y el estado de conexión MQTT del firmware sniffer.

---

## 🚀 Características principales

- Visualización en tiempo real de tramas CAN recibidas por el PMC.
- Conexión MQTT sobre Ethernet (configurable).
- Filtros por ID, tipo de mensaje y contenido.
- Indicador de estado de conexión (Conectando / Conectado / Desconectado).
- Interfaz moderna y responsiva desarrollada con **React + TailwindCSS + Electron**.
- Modo de vista ajustable (tabla o lista).
- Configuración de broker y tópicos protegida por usuario y contraseña local.

---

## ⚙️ Requisitos

- **Windows 10 / 11 (x64)**  
- **Node.js 20+** (solo para desarrollo, no necesario para ejecución portable)  
- Conexión a red local con acceso al broker MQTT del PMC.  

---

## 🧰 Archivos incluidos

| Archivo | Descripción |
|----------|--------------|
| `PMC Sniffer GUI Setup 1.0.0.exe` | Instalador estándar con asistente NSIS. |
| `PMC Sniffer GUI 1.0.0.exe` | Versión portable, ejecutable directamente sin instalación. |
| `README.md` | Documento de referencia y uso. |

---

## 🪄 Instrucciones de instalación

1. Ejecute **`PMC Sniffer GUI Setup 1.0.0.exe`**.  
2. Siga los pasos del asistente de instalación (puede elegir la carpeta destino).  
3. Al finalizar, encontrará un acceso directo en el Escritorio o en el Menú Inicio.  
4. Si prefiere usar la versión portable, simplemente ejecute  
   **`PMC Sniffer GUI 1.0.0.exe`** directamente.

---

## 🔧 Configuración de conexión MQTT

Desde el menú **Configuración → Conexión**, puede ajustar:
- **Host del broker**
- **Puerto**
- **Usuario y contraseña**
- **Tópicos de control y status**

Los cambios se guardan localmente y no requieren conexión a internet.

---

## 🔒 Seguridad

- La autenticación es local, sin conexión externa.  
- El formato de comandos MQTT está humanizado para impedir acceso directo a payloads JSON.  
- No se exponen credenciales ni configuración sensible fuera del entorno local.

---

## 🧑‍💻 Créditos

**Autor:** Guillermo Guereque  
**Versión:** 1.0.0  
**Tecnologías:** Electron, React, TailwindCSS, MQTT, Recharts  
**Licencia interna:** Uso exclusivo para desarrollo y pruebas en línea de producción PMC.

---

> © 2025 Guillermo Guereque. Todos los derechos reservados.
