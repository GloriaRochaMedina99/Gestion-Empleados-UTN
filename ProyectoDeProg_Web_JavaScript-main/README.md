# Panel de Administración de Empleados, Departamentos y Asistencias

**Metodología de Sistemas II**

Aplicación web para gestionar el personal de una organización: permite administrar departamentos, empleados y el registro diario de asistencias, con estadísticas claras por empleado. Funciona completamente en el navegador, sin necesidad de servidor ni base de datos externa.

---

## 🌐 Demo en línea

> 🔗 **GitHub Pages:** [https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/](https://TU-USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/)
>
> *(Reemplazar `TU-USUARIO` y `NOMBRE-DEL-REPOSITORIO` por los datos reales del repositorio.)*

---

## 📋 Descripción

El sistema permite al área de administración o Recursos Humanos:

- **Departamentos:** crear, editar y eliminar departamentos, indicando su responsable y viendo la cantidad de empleados de cada uno.
- **Empleados:** dar de alta, modificar y eliminar empleados (nombre, cargo, fecha de ingreso y departamento), con filtro por departamento.
- **Asistencias:** registrar por empleado y fecha si estuvo *Presente*, *Ausente* o con *Tardanza*, modificar el estado y consultar el historial.
- **Estadísticas:** resumen general con contadores y tabla por empleado con porcentaje de asistencia.

### Funcionalidades destacadas

- 💾 **Persistencia con `localStorage`:** los datos se conservan al recargar la página o cerrar el navegador.
- ✅ **Validaciones de formularios:** campos obligatorios, longitudes y caracteres permitidos, fechas válidas (no futuras ni anteriores al ingreso del empleado) y prevención de duplicados lógicos (departamentos repetidos, empleados repetidos en un mismo departamento, dos registros del mismo empleado en un mismo día).
- 🔗 **Borrado en cascada:** al eliminar un departamento se eliminan sus empleados y asistencias; al eliminar un empleado, sus asistencias.
- 🔒 **Código seguro y mantenible:** escape de HTML para evitar inyección de código, delegación de eventos y código organizado por secciones y comentado.

---

## 🛠️ Tecnologías utilizadas

| Tecnología | Uso |
|---|---|
| **HTML5** | Estructura semántica de la página y formularios |
| **CSS3** | Estilos, diseño responsive (Grid/Flexbox) y variables CSS |
| **JavaScript (vanilla)** | Lógica de la aplicación, validaciones y manejo del DOM |
| **localStorage (Web Storage API)** | Persistencia de datos en el navegador |

---

## 📁 Estructura del proyecto

```
├── index.html        # Estructura de la página
├── css/
│   └── estilo.css    # Estilos
├── js/
│   └── app.js        # Lógica: almacenamiento, validaciones, renderizado y estadísticas
├── db.json           # Datos de ejemplo de referencia (la app usa localStorage)
└── README.md
```

---

## 🚀 Cómo ejecutarlo localmente

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/TU-USUARIO/NOMBRE-DEL-REPOSITORIO.git
   ```
2. Abrir la carpeta del proyecto.
3. Abrir `index.html` en el navegador (o usar la extensión **Live Server** de VS Code).

No requiere instalar dependencias.

> **Nota:** la primera vez que se abre, la aplicación carga unos datos de ejemplo. Para volver a ese estado inicial, borrar los datos del sitio desde las herramientas del navegador (*Application → Local Storage*). Los datos se guardan por navegador y por dirección, por lo que cada usuario ve sus propios datos.

---

## 👥 Integrantes del equipo

- Gloria Rocha
- Lucía Rodríguez
- Camila Roldan

---

## 📄 Licencia

Proyecto académico desarrollado para la materia **Metodología de Sistemas II**.