const API_URL = "http://localhost:3000";

const contenedorDepartamentos = document.getElementById("contenedor-departamentos");
const contenedorEmpleados = document.getElementById("contenedor-empleados");
const contenedorAsistencias = document.getElementById("contenedor-asistencias");

const formDepartamento = document.getElementById("form-departamento");
const inputDepartamentoId = document.getElementById("departamento-id"); 
const inputDepartamentoNombre = document.getElementById("departamento-nombre");
const inputDepartamentoResponsable = document.getElementById("departamento-responsable");
const btnCancelarDepartamento = document.getElementById("btn-cancelar-departamento");

const formEmpleado = document.getElementById("form-empleado");
const inputEmpleadoId = document.getElementById("empleado-id");
const inputEmpleadoNombre = document.getElementById("empleado-nombre");
const inputEmpleadoCargo = document.getElementById("empleado-cargo");
const inputEmpleadoFecha = document.getElementById("empleado-fecha");
const selectEmpleadoDepartamento = document.getElementById("empleado-departamento");
const filtroDepartamento = document.getElementById("filtro-departamento");
const btnCancelarEmpleado = document.getElementById("btn-cancelar-empleado");

const formAsistencia = document.getElementById("form-asistencia");
const selectAsistenciaEmpleado = document.getElementById("asistencia-empleado");
const filtroEmpleadoAsistencia = document.getElementById("filtro-empleado-asistencia");

document.addEventListener("DOMContentLoaded", iniciarApp);

async function iniciarApp() {
    formDepartamento.addEventListener("submit", guardarDepartamento);
    btnCancelarDepartamento.addEventListener("click", cancelarEdicionDepartamento);

    formEmpleado.addEventListener("submit", guardarEmpleado);
    btnCancelarEmpleado.addEventListener("click", cancelarEdicionEmpleado);
    filtroDepartamento.addEventListener("change", cargarEmpleados); 

    formAsistencia.addEventListener("submit", registrarAsistencia);
    filtroEmpleadoAsistencia.addEventListener("change", cargarAsistencias);

    await cargarDatos();
}

async function cargarDatos() {
    await cargarDepartamentos();
    await cargarSelectDepartamentos();
    await cargarEmpleados();
    await cargarSelectEmpleados();
    await cargarAsistencias();
}

async function cargarDepartamentos() {
    try {
        const responseDeps = await axios.get(`${API_URL}/departamentos`);
        const departamentos = responseDeps.data;

        const responseEmps = await axios.get(`${API_URL}/empleados`);
        const empleados = responseEmps.data;

        renderizarDepartamentos(departamentos, empleados);
    } catch (error) {
        console.error("Error al cargar departamentos:", error);
    }
}

async function cargarSelectDepartamentos() {
    try {
        const response = await axios.get(`${API_URL}/departamentos`);
        const departamentos = response.data;

        selectEmpleadoDepartamento.innerHTML = `<option value="">Seleccione departamento</option>`;
        filtroDepartamento.innerHTML = `<option value="">Todos los departamentos</option>`;

        departamentos.forEach(function(dep) {
            selectEmpleadoDepartamento.innerHTML += `<option value="${dep.id}">${dep.nombre}</option>`;
            filtroDepartamento.innerHTML += `<option value="${dep.id}">${dep.nombre}</option>`;
        });
    } catch (error) {
        console.error("Error en selects de departamentos:", error);
    }
}

function renderizarDepartamentos(departamentos, empleados) {
    contenedorDepartamentos.innerHTML = "";
    departamentos.forEach(function(dep) {
        const cantidadEmpleados = empleados.filter(emp => emp.departamentoId === dep.id).length;

        contenedorDepartamentos.innerHTML += `
            <div class="card">
                <h3>${dep.nombre}</h3>
                <p>Responsable: ${dep.responsable}</p>
                <p>Cantidad de empleados: ${cantidadEmpleados}</p>
                <button class="btn-edit" onclick="editarDepartamento(${dep.id})">Editar</button>
                <button class="btn-danger" onclick="eliminarDepartamento(${dep.id})">Eliminar</button>
            </div>
        `;
    });
}

async function guardarDepartamento(event) {
    event.preventDefault();
    const nombre = inputDepartamentoNombre.value.trim();
    const responsable = inputDepartamentoResponsable.value.trim();

    if (nombre === "" || responsable === "") {
        alert("Complete todos los campos del departamento.");
        return;
    }

    const datos = { nombre, responsable };

    try {
        if (inputDepartamentoId.value === "") {
            await axios.post(`${API_URL}/departamentos`, datos);
        } else {
            await axios.patch(`${API_URL}/departamentos/${inputDepartamentoId.value}`, datos);
        }
        formDepartamento.reset();
        inputDepartamentoId.value = "";
        await cargarDatos();
    } catch (error) {
        console.error("Error al guardar departamento:", error);
    }
}

async function editarDepartamento(id) {
    try {
        const response = await axios.get(`${API_URL}/departamentos/${id}`);
        const dep = response.data;
        inputDepartamentoId.value = dep.id;
        inputDepartamentoNombre.value = dep.nombre;
        inputDepartamentoResponsable.value = dep.responsable;
    } catch (error) {
        console.error("Error al cargar departamento para editar:", error);
    }
}

function cancelarEdicionDepartamento() {
    formDepartamento.reset();
    inputDepartamentoId.value = "";
}

async function eliminarDepartamento(id) {
    const confirmar = confirm("¿Seguro que desea eliminar este departamento? Se eliminarán sus empleados y asistencias en cascada.");
    if (!confirmar) return;

    try {
        const responseEmps = await axios.get(`${API_URL}/empleados?departamentoId=${id}`);
        const empleados = responseEmps.data;

        for (const emp of empleados) {
            const responseAsis = await axios.get(`${API_URL}/asistencias?empleadoId=${emp.id}`);
            const asistencias = responseAsis.data;
            for (const asis of asistencias) {
                await axios.delete(`${API_URL}/asistencias/${asis.id}`);
            }
            await axios.delete(`${API_URL}/empleados/${emp.id}`);
        }
        await axios.delete(`${API_URL}/departamentos/${id}`);
        await cargarDatos();
    } catch (error) {
        console.error("Error al eliminar departamento en cascada:", error);
    }
}

async function cargarEmpleados() {
    try {
        let url = `${API_URL}/empleados`;
        if (filtroDepartamento.value !== "") {
            url = `${API_URL}/empleados?departamentoId=${filtroDepartamento.value}`;
        }

        const responseEmps = await axios.get(url);
        const empleados = responseEmps.data;

        const responseDeps = await axios.get(`${API_URL}/departamentos`);
        const departamentos = responseDeps.data;

        renderizarEmpleados(empleados, departamentos);
    } catch (error) {
        console.error("Error al cargar empleados:", error);
    }
}

function renderizarEmpleados(empleados, departamentos) {
    contenedorEmpleados.innerHTML = "";
    if (empleados.length === 0) {
        contenedorEmpleados.innerHTML = "<p>No hay empleados para mostrar en este departamento.</p>";
        return;
    }

    empleados.forEach(function(emp) {
        const dep = departamentos.find(d => d.id === emp.departamentoId);
        const nombreDep = dep ? dep.nombre : "Sin departamento";

        contenedorEmpleados.innerHTML += `
            <div class="card">
                <h3>${emp.nombre}</h3>
                <p>Cargo: ${emp.cargo}</p>
                <p>Departamento: ${nombreDep}</p>
                <p>Fecha de ingreso: ${emp.fechaIngreso}</p>
                <button class="btn-edit" onclick="editarEmpleado(${emp.id})">Editar</button>
                <button class="btn-danger" onclick="eliminarEmpleado(${emp.id})">Eliminar</button>
            </div>
        `;
    });
}

async function guardarEmpleado(event) {
    event.preventDefault();
    const nombre = inputEmpleadoNombre.value.trim();
    const cargo = inputEmpleadoCargo.value.trim();
    const fechaIngreso = inputEmpleadoFecha.value;
    const departamentoId = Number(selectEmpleadoDepartamento.value);

    if (nombre === "" || cargo === "" || fechaIngreso === "" || !departamentoId) {
        alert("Complete todos los campos del empleado.");
        return;
    }

    const datos = { nombre, cargo, fechaIngreso, departamentoId };

    try {
        if (inputEmpleadoId.value === "") {
            await axios.post(`${API_URL}/empleados`, datos);
        } else {
            await axios.patch(`${API_URL}/empleados/${inputEmpleadoId.value}`, datos);
        }
        formEmpleado.reset();
        inputEmpleadoId.value = "";
        await cargarDatos();
    } catch (error) {
        console.error("Error al guardar empleado:", error);
    }
}

async function editarEmpleado(id) {
    try {
        const response = await axios.get(`${API_URL}/empleados/${id}`);
        const emp = response.data;
        inputEmpleadoId.value = emp.id;
        inputEmpleadoNombre.value = emp.nombre;
        inputEmpleadoCargo.value = emp.cargo;
        inputEmpleadoFecha.value = emp.fechaIngreso;
        selectEmpleadoDepartamento.value = emp.departamentoId;
    } catch (error) {
        console.error("Error al cargar empleado para editar:", error);
    }
}

function cancelarEdicionEmpleado() {
    formEmpleado.reset();
    inputEmpleadoId.value = "";
}

async function eliminarEmpleado(id) {
    const confirmar = confirm("¿Seguro que desea eliminar este empleado y todas sus asistencias?");
    if (!confirmar) return;

    try {
        const responseAsis = await axios.get(`${API_URL}/asistencias?empleadoId=${id}`);
        const asistencias = responseAsis.data;
        for (const asis of asistencias) {
            await axios.delete(`${API_URL}/asistencias/${asis.id}`);
        }
        await axios.delete(`${API_URL}/empleados/${id}`);
        await cargarDatos();
    } catch (error) {
        console.error("Error al eliminar empleado:", error);
    }
}

async function cargarSelectEmpleados() {
    try {
        const response = await axios.get(`${API_URL}/empleados`);
        const empleados = response.data;

        selectAsistenciaEmpleado.innerHTML = `<option value="">Seleccione empleado</option>`;
        filtroEmpleadoAsistencia.innerHTML = `<option value="">Todos los empleados</option>`;

        empleados.forEach(function(emp) {
            selectAsistenciaEmpleado.innerHTML += `<option value="${emp.id}">${emp.nombre}</option>`;
            filtroEmpleadoAsistencia.innerHTML += `<option value="${emp.id}">${emp.nombre}</option>`;
        });
    } catch (error) {
        console.error("Error en select de empleados para asistencias:", error);
    }
}

async function registrarAsistencia(event) {
    event.preventDefault();
    const empleadoId = Number(selectAsistenciaEmpleado.value);

    if (!empleadoId) {
        alert("Seleccione un empleado para marcar asistencia.");
        return;
    }

    const nuevaAsistencia = {
        empleadoId: empleadoId,
        fecha: new Date().toLocaleDateString(),
        estado: "Presente"
    };

    try {
        await axios.post(`${API_URL}/asistencias`, nuevaAsistencia);
        formAsistencia.reset();
        await cargarAsistencias();
    } catch (error) {
        console.error("Error al registrar asistencia:", error);
    }
}

async function cargarAsistencias() {
    try {
        let url = `${API_URL}/asistencias`;
        if (filtroEmpleadoAsistencia.value !== "") {
            url = `${API_URL}/asistencias?empleadoId=${filtroEmpleadoAsistencia.value}`;
        }

        const responseAsis = await axios.get(url);
        const asistencias = responseAsis.data;

        const responseEmps = await axios.get(`${API_URL}/empleados`);
        const empleados = responseEmps.data;

        renderizarAsistencias(asistencias, empleados);
    } catch (error) {
        console.error("Error al cargar asistencias:", error);
    }
}

function renderizarAsistencias(asistencias, empleados) {
    contenedorAsistencias.innerHTML = "";
    if (asistencias.length === 0) {
        contenedorAsistencias.innerHTML = "<p>No hay registros de asistencia.</p>";
        return;
    }

    asistencias.reverse();

    asistencias.forEach(function(asis) {
        const emp = empleados.find(e => e.id === asis.empleadoId);
        const nombreEmp = emp ? emp.nombre : "Empleado eliminado";

        contenedorAsistencias.innerHTML += `
            <div class="card">
                <h3>${nombreEmp}</h3>
                <p>Fecha: ${asis.fecha}</p>
                <p>Estado: <strong>${asis.estado}</strong></p>
                <button class="btn-edit" onclick="editarEstadoAsistencia(${asis.id}, 'Presente')">Presente</button>
                <button class="btn-edit" onclick="editarEstadoAsistencia(${asis.id}, 'Ausente')">Ausente</button>
                <button class="btn-edit" onclick="editarEstadoAsistencia(${asis.id}, 'Tardanza')">Tardanza</button>
                <button class="btn-danger" onclick="eliminarAsistencia(${asis.id})">Eliminar</button>
            </div>
        `;
    });
}

async function editarEstadoAsistencia(id, nuevoEstado) {
    try {
        await axios.patch(`${API_URL}/asistencias/${id}`, { estado: nuevoEstado });
        await cargarAsistencias();
    } catch (error) {
        console.error("Error al modificar asistencia:", error);
    }
}

async function eliminarAsistencia(id) {
    const confirmar = confirm("¿Desea borrar este registro de asistencia?");
    if (!confirmar) return;

    try {
        await axios.delete(`${API_URL}/asistencias/${id}`);
        await cargarAsistencias();
    } catch (error) {
        console.error("Error al eliminar asistencia:", error);
    }
}