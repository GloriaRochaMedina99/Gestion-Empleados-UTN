/* ==========================================================
   Panel de Administración de Empleados
   - Persistencia con localStorage
   - Validaciones de formularios
   - Estadísticas de asistencia
   Estructura:
     1. Constantes y estado
     2. Utilidades
     3. Capa de almacenamiento (localStorage)
     4. Validaciones
     5. Departamentos
     6. Empleados
     7. Asistencias y estadísticas
     8. Renderizado de selects
     9. Inicialización
   ========================================================== */
"use strict";

/* ==========================================================
   1. CONSTANTES Y ESTADO
   ========================================================== */

const CLAVES = {
    departamentos: "panel.departamentos",
    empleados: "panel.empleados",
    asistencias: "panel.asistencias",
};

const ESTADOS_ASISTENCIA = ["Presente", "Ausente", "Tardanza"];

// Datos iniciales (solo se usan la primera vez que se abre la app)
const DATOS_INICIALES = {
    departamentos: [
        { id: 1, nombre: "Sistemas", responsable: "Ing. Carlos Pérez" },
        { id: 2, nombre: "Recursos Humanos", responsable: "Lic. Ana Gómez" },
    ],
    empleados: [
        { id: 1, departamentoId: 1, nombre: "Laura Martínez", cargo: "Desarrolladora", fechaIngreso: "2024-03-01" },
        { id: 2, departamentoId: 2, nombre: "Pedro Ramírez", cargo: "Analista RRHH", fechaIngreso: "2024-05-10" },
    ],
    asistencias: [
        { id: 1, empleadoId: 1, fecha: "2025-06-15", estado: "Ausente" },
        { id: 2, empleadoId: 1, fecha: "2026-06-29", estado: "Tardanza" },
    ],
};

// Única fuente de verdad en memoria; se sincroniza con localStorage
const estado = {
    departamentos: [],
    empleados: [],
    asistencias: [],
};

// Patrones de validación
const PATRON_NOMBRE_PERSONA = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ.' -]*$/;
const PATRON_TEXTO_GENERAL = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,&' -]*$/;
const FECHA_MINIMA = "1950-01-01";

/* ==========================================================
   2. REFERENCIAS AL DOM Y UTILIDADES
   ========================================================== */

const $ = (id) => document.getElementById(id);

const el = {
    // Departamentos
    formDepartamento: $("form-departamento"),
    depId: $("departamento-id"),
    depNombre: $("departamento-nombre"),
    depResponsable: $("departamento-responsable"),
    btnGuardarDep: $("btn-guardar-departamento"),
    btnCancelarDep: $("btn-cancelar-departamento"),
    contenedorDeps: $("contenedor-departamentos"),

    // Empleados
    formEmpleado: $("form-empleado"),
    empId: $("empleado-id"),
    empNombre: $("empleado-nombre"),
    empCargo: $("empleado-cargo"),
    empFecha: $("empleado-fecha"),
    empDepartamento: $("empleado-departamento"),
    btnGuardarEmp: $("btn-guardar-empleado"),
    btnCancelarEmp: $("btn-cancelar-empleado"),
    filtroDepartamento: $("filtro-departamento"),
    contenedorEmps: $("contenedor-empleados"),

    // Asistencias
    formAsistencia: $("form-asistencia"),
    asisEmpleado: $("asistencia-empleado"),
    asisFecha: $("asistencia-fecha"),
    asisEstado: $("asistencia-estado"),
    filtroEmpleadoAsis: $("filtro-empleado-asistencia"),
    contenedorAsis: $("contenedor-asistencias"),
    resumen: $("resumen-asistencias"),
    cuerpoEstadisticas: $("cuerpo-estadisticas"),

    toast: $("toast"),
};

/** Escapa HTML para evitar inyección (XSS) al usar innerHTML con datos del usuario. */
function escaparHtml(texto) {
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

/** Normaliza texto para comparar duplicados: minúsculas, sin tildes, sin espacios repetidos. */
function normalizar(texto) {
    return texto
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

/** Colapsa espacios repetidos y recorta extremos. */
function limpiarTexto(texto) {
    return texto.trim().replace(/\s+/g, " ");
}

/** Fecha de hoy en formato ISO (YYYY-MM-DD) según la hora LOCAL (no UTC). */
function hoyISO() {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    return `${ahora.getFullYear()}-${mes}-${dia}`;
}

/** Comprueba que un string sea una fecha ISO real (rechaza 2025-02-31, por ejemplo). */
function esFechaValida(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [anio, mes, dia] = iso.split("-").map(Number);
    const fecha = new Date(anio, mes - 1, dia);
    return fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
}

/** Convierte 2026-06-29 en 29/06/2026 para mostrar. */
function formatearFecha(iso) {
    if (!esFechaValida(iso)) return iso;
    const [anio, mes, dia] = iso.split("-");
    return `${dia}/${mes}/${anio}`;
}

let temporizadorToast = null;
/** Muestra un mensaje temporal (reemplaza a alert). */
function mostrarToast(mensaje, esError = false) {
    el.toast.textContent = mensaje;
    el.toast.classList.toggle("toast-error", esError);
    el.toast.classList.add("visible");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => el.toast.classList.remove("visible"), 3000);
}

/* ==========================================================
   3. CAPA DE ALMACENAMIENTO (localStorage)
   ========================================================== */

const Almacen = {
    /** Lee y parsea una clave. Devuelve null si no existe o está corrupta. */
    leer(clave) {
        try {
            const crudo = localStorage.getItem(clave);
            return crudo ? JSON.parse(crudo) : null;
        } catch (error) {
            console.error(`No se pudo leer "${clave}":`, error);
            return null;
        }
    },

    /** Guarda un valor serializado. Devuelve true si tuvo éxito. */
    guardar(clave, datos) {
        try {
            localStorage.setItem(clave, JSON.stringify(datos));
            return true;
        } catch (error) {
            console.error(`No se pudo guardar "${clave}":`, error);
            mostrarToast("No se pudo guardar en el navegador (¿almacenamiento lleno o bloqueado?).", true);
            return false;
        }
    },

    /** Siguiente ID autoincremental para una lista. */
    siguienteId(lista) {
        return lista.reduce((max, item) => Math.max(max, item.id), 0) + 1;
    },
};

/** Carga el estado desde localStorage; si no hay datos, siembra los iniciales. */
function cargarEstado() {
    Object.keys(CLAVES).forEach((entidad) => {
        const guardado = Almacen.leer(CLAVES[entidad]);
        if (Array.isArray(guardado)) {
            estado[entidad] = guardado;
        } else {
            estado[entidad] = structuredClone(DATOS_INICIALES[entidad]);
            Almacen.guardar(CLAVES[entidad], estado[entidad]);
        }
    });
    sanearAsistencias();
}

/** Convierte "29/6/2026" (formato legado de db.json) a "2026-06-29". Si no coincide, devuelve el valor original. */
function convertirFechaLegada(fecha) {
    const coincidencia = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(fecha);
    if (!coincidencia) return fecha;
    const [, dia, mes, anio] = coincidencia;
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
}

/**
 * Sanea las asistencias guardadas (compatibilidad con datos viejos o importados de db.json):
 * convierte fechas legadas a ISO y descarta duplicados (empleado + fecha),
 * registros huérfanos, estados inválidos y fechas inexistentes.
 */
function sanearAsistencias() {
    const idsEmpleados = new Set(estado.empleados.map((e) => e.id));
    const vistos = new Set();
    const saneadas = [];

    estado.asistencias.forEach((asis) => {
        const fecha = convertirFechaLegada(asis.fecha);
        const clave = `${asis.empleadoId}|${fecha}`;
        const descartar =
            !idsEmpleados.has(asis.empleadoId) ||
            !esFechaValida(fecha) ||
            !ESTADOS_ASISTENCIA.includes(asis.estado) ||
            vistos.has(clave);
        if (descartar) return;

        vistos.add(clave);
        saneadas.push({ ...asis, fecha });
    });

    const huboCambios =
        saneadas.length !== estado.asistencias.length ||
        saneadas.some((asis, i) => asis.fecha !== estado.asistencias[i].fecha);

    if (huboCambios) {
        estado.asistencias = saneadas;
        persistir("asistencias");
    }
}

/** Persiste una o más entidades. Ej: persistir("empleados", "asistencias"). */
function persistir(...entidades) {
    entidades.forEach((entidad) => Almacen.guardar(CLAVES[entidad], estado[entidad]));
}

/* ==========================================================
   4. VALIDACIONES
   Cada validador devuelve un string con el error ("" si es válido).
   ========================================================== */

function mostrarError(campo, mensaje) {
    campo.classList.add("invalid");
    campo.setAttribute("aria-invalid", "true");
    const span = $(`error-${campo.id}`);
    if (span) span.textContent = mensaje;
}

function limpiarError(campo) {
    campo.classList.remove("invalid");
    campo.removeAttribute("aria-invalid");
    const span = $(`error-${campo.id}`);
    if (span) span.textContent = "";
}

function limpiarErrores(formulario) {
    formulario.querySelectorAll("input, select").forEach(limpiarError);
}

/**
 * Aplica una lista de validaciones [[campo, mensaje], ...].
 * Muestra los errores, enfoca el primer campo inválido y devuelve true si todo es válido.
 */
function aplicarValidaciones(validaciones) {
    let primerInvalido = null;
    validaciones.forEach(([campo, mensaje]) => {
        if (mensaje) {
            mostrarError(campo, mensaje);
            if (!primerInvalido) primerInvalido = campo;
        } else {
            limpiarError(campo);
        }
    });
    if (primerInvalido) primerInvalido.focus();
    return primerInvalido === null;
}

/** Validador genérico de texto: obligatorio, largo mínimo/máximo y patrón. */
function validarTexto(valor, { etiqueta, min, max, patron, ayuda }) {
    if (valor === "") return `${etiqueta} es obligatorio.`;
    if (valor.length < min) return `${etiqueta} debe tener al menos ${min} caracteres.`;
    if (valor.length > max) return `${etiqueta} no puede superar ${max} caracteres.`;
    if (!patron.test(valor)) return `${etiqueta} contiene caracteres no permitidos (${ayuda}).`;
    return "";
}

function validarNombreDepartamento(nombre, idActual) {
    const error = validarTexto(nombre, {
        etiqueta: "El nombre del departamento",
        min: 2,
        max: 40,
        patron: PATRON_TEXTO_GENERAL,
        ayuda: "solo letras, números y espacios",
    });
    if (error) return error;

    const duplicado = estado.departamentos.some(
        (d) => d.id !== idActual && normalizar(d.nombre) === normalizar(nombre)
    );
    return duplicado ? "Ya existe un departamento con ese nombre." : "";
}

function validarResponsable(responsable) {
    return validarTexto(responsable, {
        etiqueta: "El responsable",
        min: 3,
        max: 60,
        patron: PATRON_NOMBRE_PERSONA,
        ayuda: "solo letras, puntos y espacios",
    });
}

function validarNombreEmpleado(nombre, departamentoId, idActual) {
    const error = validarTexto(nombre, {
        etiqueta: "El nombre del empleado",
        min: 3,
        max: 60,
        patron: PATRON_NOMBRE_PERSONA,
        ayuda: "solo letras, puntos y espacios",
    });
    if (error) return error;

    // Duplicado lógico: mismo nombre dentro del mismo departamento
    const duplicado = estado.empleados.some(
        (e) =>
            e.id !== idActual &&
            e.departamentoId === departamentoId &&
            normalizar(e.nombre) === normalizar(nombre)
    );
    return duplicado ? "Ya existe un empleado con ese nombre en el departamento seleccionado." : "";
}

function validarCargo(cargo) {
    return validarTexto(cargo, {
        etiqueta: "El cargo",
        min: 2,
        max: 40,
        patron: PATRON_TEXTO_GENERAL,
        ayuda: "solo letras, números y espacios",
    });
}

function validarFechaIngreso(fecha) {
    if (fecha === "") return "La fecha de ingreso es obligatoria.";
    if (!esFechaValida(fecha)) return "La fecha de ingreso no es válida.";
    if (fecha > hoyISO()) return "La fecha de ingreso no puede ser futura.";
    if (fecha < FECHA_MINIMA) return `La fecha de ingreso no puede ser anterior a ${formatearFecha(FECHA_MINIMA)}.`;
    return "";
}

function validarDepartamentoSeleccionado(departamentoId) {
    if (!departamentoId) return "Seleccione un departamento.";
    if (!estado.departamentos.some((d) => d.id === departamentoId)) return "El departamento seleccionado no existe.";
    return "";
}

function validarAsistencia(empleadoId, fecha, estadoAsis) {
    const resultado = { empleado: "", fecha: "", estado: "" };

    const empleado = estado.empleados.find((e) => e.id === empleadoId);
    if (!empleadoId) resultado.empleado = "Seleccione un empleado.";
    else if (!empleado) resultado.empleado = "El empleado seleccionado no existe.";

    if (fecha === "") resultado.fecha = "La fecha es obligatoria.";
    else if (!esFechaValida(fecha)) resultado.fecha = "La fecha no es válida.";
    else if (fecha > hoyISO()) resultado.fecha = "No se puede registrar asistencia en una fecha futura.";
    else if (empleado && fecha < empleado.fechaIngreso)
        resultado.fecha = `La fecha es anterior al ingreso del empleado (${formatearFecha(empleado.fechaIngreso)}).`;
    else if (estado.asistencias.some((a) => a.empleadoId === empleadoId && a.fecha === fecha))
        resultado.fecha = "Ya existe un registro de asistencia de este empleado para esa fecha.";

    if (!ESTADOS_ASISTENCIA.includes(estadoAsis)) resultado.estado = "Seleccione un estado válido.";

    return resultado;
}

/* ==========================================================
   5. DEPARTAMENTOS
   ========================================================== */

function renderizarDepartamentos() {
    if (estado.departamentos.length === 0) {
        el.contenedorDeps.innerHTML = `<p class="vacio">No hay departamentos registrados.</p>`;
        return;
    }

    el.contenedorDeps.innerHTML = estado.departamentos
        .map((dep) => {
            const cantidad = estado.empleados.filter((e) => e.departamentoId === dep.id).length;
            return `
                <div class="card">
                    <h3>${escaparHtml(dep.nombre)}</h3>
                    <p>Responsable: ${escaparHtml(dep.responsable)}</p>
                    <p>Cantidad de empleados: ${cantidad}</p>
                    <button class="btn-edit" data-action="editar-departamento" data-id="${dep.id}">Editar</button>
                    <button class="btn-danger" data-action="eliminar-departamento" data-id="${dep.id}">Eliminar</button>
                </div>`;
        })
        .join("");
}

function guardarDepartamento(evento) {
    evento.preventDefault();

    const id = Number(el.depId.value) || null;
    const nombre = limpiarTexto(el.depNombre.value);
    const responsable = limpiarTexto(el.depResponsable.value);

    const valido = aplicarValidaciones([
        [el.depNombre, validarNombreDepartamento(nombre, id)],
        [el.depResponsable, validarResponsable(responsable)],
    ]);
    if (!valido) return;

    if (id === null) {
        estado.departamentos.push({ id: Almacen.siguienteId(estado.departamentos), nombre, responsable });
        mostrarToast("Departamento creado.");
    } else {
        const dep = estado.departamentos.find((d) => d.id === id);
        Object.assign(dep, { nombre, responsable });
        mostrarToast("Departamento actualizado.");
    }

    persistir("departamentos");
    cancelarEdicionDepartamento();
    renderizarTodo();
}

function editarDepartamento(id) {
    const dep = estado.departamentos.find((d) => d.id === id);
    if (!dep) return;

    limpiarErrores(el.formDepartamento);
    el.depId.value = dep.id;
    el.depNombre.value = dep.nombre;
    el.depResponsable.value = dep.responsable;
    el.btnGuardarDep.textContent = "Actualizar departamento";
    el.depNombre.focus();
}

function cancelarEdicionDepartamento() {
    el.formDepartamento.reset();
    el.depId.value = "";
    el.btnGuardarDep.textContent = "Guardar departamento";
    limpiarErrores(el.formDepartamento);
}

function eliminarDepartamento(id) {
    const dep = estado.departamentos.find((d) => d.id === id);
    if (!dep) return;

    const idsEmpleados = estado.empleados.filter((e) => e.departamentoId === id).map((e) => e.id);
    const mensaje = idsEmpleados.length
        ? `¿Eliminar "${dep.nombre}"? También se eliminarán ${idsEmpleados.length} empleado(s) y sus asistencias.`
        : `¿Eliminar el departamento "${dep.nombre}"?`;
    if (!confirm(mensaje)) return;

    // Borrado en cascada: asistencias -> empleados -> departamento
    estado.asistencias = estado.asistencias.filter((a) => !idsEmpleados.includes(a.empleadoId));
    estado.empleados = estado.empleados.filter((e) => e.departamentoId !== id);
    estado.departamentos = estado.departamentos.filter((d) => d.id !== id);

    persistir("asistencias", "empleados", "departamentos");

    // Si se estaba editando el departamento borrado, limpiar el formulario
    if (Number(el.depId.value) === id) cancelarEdicionDepartamento();
    if (idsEmpleados.includes(Number(el.empId.value))) cancelarEdicionEmpleado();
    renderizarTodo();
    mostrarToast("Departamento eliminado.");
}

/* ==========================================================
   6. EMPLEADOS
   ========================================================== */

function renderizarEmpleados() {
    const filtro = Number(el.filtroDepartamento.value) || null;
    const lista = filtro ? estado.empleados.filter((e) => e.departamentoId === filtro) : estado.empleados;

    if (lista.length === 0) {
        el.contenedorEmps.innerHTML = `<p class="vacio">No hay empleados para mostrar.</p>`;
        return;
    }

    el.contenedorEmps.innerHTML = lista
        .map((emp) => {
            const dep = estado.departamentos.find((d) => d.id === emp.departamentoId);
            return `
                <div class="card">
                    <h3>${escaparHtml(emp.nombre)}</h3>
                    <p>Cargo: ${escaparHtml(emp.cargo)}</p>
                    <p>Departamento: ${dep ? escaparHtml(dep.nombre) : "Sin departamento"}</p>
                    <p>Fecha de ingreso: ${formatearFecha(emp.fechaIngreso)}</p>
                    <button class="btn-edit" data-action="editar-empleado" data-id="${emp.id}">Editar</button>
                    <button class="btn-danger" data-action="eliminar-empleado" data-id="${emp.id}">Eliminar</button>
                </div>`;
        })
        .join("");
}

function guardarEmpleado(evento) {
    evento.preventDefault();

    const id = Number(el.empId.value) || null;
    const nombre = limpiarTexto(el.empNombre.value);
    const cargo = limpiarTexto(el.empCargo.value);
    const fechaIngreso = el.empFecha.value;
    const departamentoId = Number(el.empDepartamento.value) || null;

    const valido = aplicarValidaciones([
        [el.empNombre, validarNombreEmpleado(nombre, departamentoId, id)],
        [el.empCargo, validarCargo(cargo)],
        [el.empFecha, validarFechaIngreso(fechaIngreso)],
        [el.empDepartamento, validarDepartamentoSeleccionado(departamentoId)],
    ]);
    if (!valido) return;

    if (id === null) {
        estado.empleados.push({
            id: Almacen.siguienteId(estado.empleados),
            nombre,
            cargo,
            fechaIngreso,
            departamentoId,
        });
        mostrarToast("Empleado creado.");
    } else {
        const emp = estado.empleados.find((e) => e.id === id);
        Object.assign(emp, { nombre, cargo, fechaIngreso, departamentoId });
        mostrarToast("Empleado actualizado.");
    }

    persistir("empleados");
    cancelarEdicionEmpleado();
    renderizarTodo();
}

function editarEmpleado(id) {
    const emp = estado.empleados.find((e) => e.id === id);
    if (!emp) return;

    limpiarErrores(el.formEmpleado);
    el.empId.value = emp.id;
    el.empNombre.value = emp.nombre;
    el.empCargo.value = emp.cargo;
    el.empFecha.value = emp.fechaIngreso;
    el.empDepartamento.value = String(emp.departamentoId);
    el.btnGuardarEmp.textContent = "Actualizar empleado";
    el.empNombre.focus();
}

function cancelarEdicionEmpleado() {
    el.formEmpleado.reset();
    el.empId.value = "";
    el.btnGuardarEmp.textContent = "Guardar empleado";
    limpiarErrores(el.formEmpleado);
}

function eliminarEmpleado(id) {
    const emp = estado.empleados.find((e) => e.id === id);
    if (!emp) return;
    if (!confirm(`¿Eliminar a "${emp.nombre}" y todas sus asistencias?`)) return;

    estado.asistencias = estado.asistencias.filter((a) => a.empleadoId !== id);
    estado.empleados = estado.empleados.filter((e) => e.id !== id);
    persistir("asistencias", "empleados");

    if (Number(el.empId.value) === id) cancelarEdicionEmpleado();
    renderizarTodo();
    mostrarToast("Empleado eliminado.");
}

/* ==========================================================
   7. ASISTENCIAS Y ESTADÍSTICAS
   ========================================================== */

/** Cuenta presentes/ausentes/tardanzas de una lista de asistencias. */
function calcularEstadisticas(asistencias) {
    const conteo = { Presente: 0, Ausente: 0, Tardanza: 0 };
    asistencias.forEach((a) => {
        if (a.estado in conteo) conteo[a.estado]++;
    });
    const total = asistencias.length;
    // Se considera asistencia efectiva: Presente + Tardanza (llegó, aunque tarde)
    const porcentaje = total === 0 ? 0 : Math.round(((conteo.Presente + conteo.Tardanza) / total) * 100);
    return { presentes: conteo.Presente, ausentes: conteo.Ausente, tardanzas: conteo.Tardanza, total, porcentaje };
}

function renderizarResumen() {
    const s = calcularEstadisticas(estado.asistencias);
    el.resumen.innerHTML = `
        <div class="contador"><strong>${s.total}</strong><span>Registros</span></div>
        <div class="contador presente"><strong>${s.presentes}</strong><span>Presentes</span></div>
        <div class="contador ausente"><strong>${s.ausentes}</strong><span>Ausentes</span></div>
        <div class="contador tardanza"><strong>${s.tardanzas}</strong><span>Tardanzas</span></div>
        <div class="contador"><strong>${s.porcentaje}%</strong><span>Asistencia global</span></div>`;
}

function renderizarEstadisticas() {
    if (estado.empleados.length === 0) {
        el.cuerpoEstadisticas.innerHTML = `<tr><td colspan="6" class="vacio">No hay empleados para mostrar estadísticas.</td></tr>`;
        return;
    }

    el.cuerpoEstadisticas.innerHTML = estado.empleados
        .map((emp) => {
            const s = calcularEstadisticas(estado.asistencias.filter((a) => a.empleadoId === emp.id));
            return `
                <tr>
                    <td>${escaparHtml(emp.nombre)}</td>
                    <td>${s.presentes}</td>
                    <td>${s.ausentes}</td>
                    <td>${s.tardanzas}</td>
                    <td>${s.total}</td>
                    <td>
                        <div class="barra" title="${s.porcentaje}%">
                            <div class="barra-relleno" style="width:${s.porcentaje}%"></div>
                        </div>
                        <span class="porcentaje">${s.total === 0 ? "Sin registros" : s.porcentaje + "%"}</span>
                    </td>
                </tr>`;
        })
        .join("");
}

function renderizarAsistencias() {
    const filtro = Number(el.filtroEmpleadoAsis.value) || null;
    const lista = filtro ? estado.asistencias.filter((a) => a.empleadoId === filtro) : [...estado.asistencias];

    if (lista.length === 0) {
        el.contenedorAsis.innerHTML = `<p class="vacio">No hay registros de asistencia.</p>`;
        return;
    }

    // Más recientes primero (se ordena una COPIA para no mutar el estado)
    lista.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);

    el.contenedorAsis.innerHTML = lista
        .map((asis) => {
            const emp = estado.empleados.find((e) => e.id === asis.empleadoId);
            const claseBadge = `badge-${asis.estado.toLowerCase()}`;
            const botones = ESTADOS_ASISTENCIA.filter((e) => e !== asis.estado)
                .map(
                    (e) =>
                        `<button class="btn-edit" data-action="cambiar-estado" data-id="${asis.id}" data-estado="${e}">Marcar ${e}</button>`
                )
                .join("");

            return `
                <div class="card">
                    <h3>${emp ? escaparHtml(emp.nombre) : "Empleado eliminado"}</h3>
                    <p>Fecha: ${formatearFecha(asis.fecha)}</p>
                    <p>Estado: <span class="badge ${claseBadge}">${asis.estado}</span></p>
                    ${botones}
                    <button class="btn-danger" data-action="eliminar-asistencia" data-id="${asis.id}">Eliminar</button>
                </div>`;
        })
        .join("");
}

function registrarAsistencia(evento) {
    evento.preventDefault();

    const empleadoId = Number(el.asisEmpleado.value) || null;
    const fecha = el.asisFecha.value;
    const estadoAsis = el.asisEstado.value;

    const errores = validarAsistencia(empleadoId, fecha, estadoAsis);
    const valido = aplicarValidaciones([
        [el.asisEmpleado, errores.empleado],
        [el.asisFecha, errores.fecha],
        [el.asisEstado, errores.estado],
    ]);
    if (!valido) return;

    estado.asistencias.push({
        id: Almacen.siguienteId(estado.asistencias),
        empleadoId,
        fecha,
        estado: estadoAsis,
    });
    persistir("asistencias");

    prepararFormularioAsistencia();
    renderizarTodo();
    mostrarToast("Asistencia registrada.");
}

function cambiarEstadoAsistencia(id, nuevoEstado) {
    const asis = estado.asistencias.find((a) => a.id === id);
    if (!asis || !ESTADOS_ASISTENCIA.includes(nuevoEstado)) return;

    asis.estado = nuevoEstado;
    persistir("asistencias");
    renderizarTodo();
}

function eliminarAsistencia(id) {
    if (!confirm("¿Desea borrar este registro de asistencia?")) return;

    estado.asistencias = estado.asistencias.filter((a) => a.id !== id);
    persistir("asistencias");
    renderizarTodo();
    mostrarToast("Registro eliminado.");
}

/** Deja el formulario de asistencia listo: fecha de hoy y estado "Presente". */
function prepararFormularioAsistencia() {
    el.formAsistencia.reset();
    el.asisFecha.value = hoyISO();
    limpiarErrores(el.formAsistencia);
}

/* ==========================================================
   8. SELECTS DINÁMICOS
   ========================================================== */

/**
 * Rellena un <select> conservando la opción elegida si todavía existe.
 * Usa new Option(), que inserta texto plano (seguro frente a XSS).
 */
function llenarSelect(select, items, textoPlaceholder, obtenerEtiqueta) {
    const valorPrevio = select.value;
    select.innerHTML = "";
    select.append(new Option(textoPlaceholder, ""));
    items.forEach((item) => select.append(new Option(obtenerEtiqueta(item), String(item.id))));
    if ([...select.options].some((o) => o.value === valorPrevio)) select.value = valorPrevio;
}

function renderizarSelects() {
    llenarSelect(el.empDepartamento, estado.departamentos, "Seleccione departamento", (d) => d.nombre);
    llenarSelect(el.filtroDepartamento, estado.departamentos, "Todos los departamentos", (d) => d.nombre);
    llenarSelect(el.asisEmpleado, estado.empleados, "Seleccione empleado", (e) => e.nombre);
    llenarSelect(el.filtroEmpleadoAsis, estado.empleados, "Todos los empleados", (e) => e.nombre);
}

/* ==========================================================
   9. INICIALIZACIÓN Y EVENTOS
   ========================================================== */

/** Redibuja toda la interfaz a partir del estado. */
function renderizarTodo() {
    renderizarSelects();
    renderizarDepartamentos();
    renderizarEmpleados();
    renderizarResumen();
    renderizarEstadisticas();
    renderizarAsistencias();
}

/**
 * Delegación de eventos: un único listener por contenedor en lugar de
 * onclick="..." inline en cada botón (más limpio y seguro).
 */
function manejarAcciones(evento) {
    const boton = evento.target.closest("[data-action]");
    if (!boton) return;

    const id = Number(boton.dataset.id);
    const acciones = {
        "editar-departamento": () => editarDepartamento(id),
        "eliminar-departamento": () => eliminarDepartamento(id),
        "editar-empleado": () => editarEmpleado(id),
        "eliminar-empleado": () => eliminarEmpleado(id),
        "cambiar-estado": () => cambiarEstadoAsistencia(id, boton.dataset.estado),
        "eliminar-asistencia": () => eliminarAsistencia(id),
    };
    acciones[boton.dataset.action]?.();
}

function registrarEventos() {
    el.formDepartamento.addEventListener("submit", guardarDepartamento);
    el.btnCancelarDep.addEventListener("click", cancelarEdicionDepartamento);

    el.formEmpleado.addEventListener("submit", guardarEmpleado);
    el.btnCancelarEmp.addEventListener("click", cancelarEdicionEmpleado);
    el.filtroDepartamento.addEventListener("change", renderizarEmpleados);

    el.formAsistencia.addEventListener("submit", registrarAsistencia);
    el.filtroEmpleadoAsis.addEventListener("change", renderizarAsistencias);

    [el.contenedorDeps, el.contenedorEmps, el.contenedorAsis].forEach((contenedor) =>
        contenedor.addEventListener("click", manejarAcciones)
    );

    // Limpia el error de un campo apenas el usuario lo modifica
    [el.formDepartamento, el.formEmpleado, el.formAsistencia].forEach((form) => {
        form.addEventListener("input", (e) => limpiarError(e.target));
        form.addEventListener("change", (e) => limpiarError(e.target));
    });
}

function iniciarApp() {
    cargarEstado();

    // Restricciones nativas de fecha (refuerzan la validación en JS)
    const hoy = hoyISO();
    el.empFecha.max = hoy;
    el.empFecha.min = FECHA_MINIMA;
    el.asisFecha.max = hoy;

    prepararFormularioAsistencia();
    registrarEventos();
    renderizarTodo();
}

document.addEventListener("DOMContentLoaded", iniciarApp);