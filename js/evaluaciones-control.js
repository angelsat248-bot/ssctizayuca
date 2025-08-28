import { API_BASE_URL, showNotification } from './config.js';

// Asegurarse de que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    console.log('Módulo de evaluaciones de control inicializado');
    initEvaluacionesControl();
});

// Variables globales
let selectedPersonalId = null;
let evaluaciones = [];

// Elementos del DOM
const searchForm = document.getElementById('evaluacion-search-form');
const searchQuery = document.getElementById('evaluacion-search-query');
const searchResults = document.getElementById('evaluacion-search-results');
const resultsBody = document.getElementById('evaluacion-results-body');
const evaluacionForm = document.getElementById('evaluacion-form-container');

// Verificar que los elementos del formulario existen
if (!searchForm) console.error('No se encontró el formulario de búsqueda');
if (!evaluacionForm) console.error('No se encontró el contenedor del formulario de evaluación');

// Obtener los elementos del formulario de evaluación
const personalNombre = document.getElementById('personal-nombre');
const personalGrado = document.getElementById('personal-grado');
const personalCuip = document.getElementById('personal-cuip');
const tipoEvaluacion = document.getElementById('tipo-evaluacion');
const fechaEvaluacion = document.getElementById('fecha-evaluacion');
const resultado = document.getElementById('resultado');
const vigencia = document.getElementById('vigencia');
const archivoPdf = document.getElementById('archivo-pdf');
const btnAgregar = document.getElementById('btn-agregar');
const btnLimpiar = document.getElementById('btn-limpiar');
const evaluacionesBody = document.getElementById('evaluaciones-body');

// Inicialización de la funcionalidad de evaluaciones de control
function initEvaluacionesControl() {
    console.log('Inicializando módulo de evaluaciones de control...');
    
    // Mostrar el formulario de búsqueda
    const searchContainer = document.querySelector('.search-container');
    if (searchContainer) {
        searchContainer.style.display = 'block';
    } else {
        console.error('No se encontró el contenedor de búsqueda');
    }
    
    // Ocultar resultados de búsqueda inicialmente
    if (searchResults) {
        searchResults.style.display = 'none';
    } else {
        console.error('No se encontró el contenedor de resultados de búsqueda');
    }
    
    // Mostrar el formulario de evaluación
    if (evaluacionForm) {
        // Forzar el repintado del navegador
        evaluacionForm.offsetHeight;
        // Mostrar el formulario
        evaluacionForm.style.display = 'block';
        console.log('Formulario de evaluación mostrado');
    } else {
        console.error('No se pudo encontrar el formulario de evaluación');
    }
    
    // Configurar fechas por defecto
    const today = new Date().toISOString().split('T')[0];
    if (fechaEvaluacion) fechaEvaluacion.value = today;
    
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    if (vigencia) vigencia.value = nextYear.toISOString().split('T')[0];
    
    // Inicializar eventos
    initEventListeners();
    
    console.log('Funcionalidad de evaluaciones de control inicializada correctamente');
    
    // Asegurarse de que el formulario sea visible
    setTimeout(() => {
        if (evaluacionForm) {
            evaluacionForm.style.opacity = '0';
            evaluacionForm.style.transition = 'opacity 0.3s ease-in-out';
            evaluacionForm.style.display = 'block';
            
            // Forzar el repintado
            evaluacionForm.offsetHeight;
            
            // Hacer visible con transición
            evaluacionForm.style.opacity = '1';
        }
    }, 100);
}

// Inicializar event listeners
function initEventListeners() {
    // Búsqueda de personal
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
    
    // Validación de CUIP en tiempo real
    if (personalCuip) {
        personalCuip.addEventListener('input', validateCuip);
    }
    
    // Validación de vigencia
    if (vigencia) {
        vigencia.addEventListener('change', validateVigencia);
    }
    
    // Subida de archivo PDF
    if (archivoPdf) {
        archivoPdf.addEventListener('change', handleFileSelect);
    }
    
    // Botones
    if (btnAgregar) {
        btnAgregar.addEventListener('click', handleAddEvaluacion);
    }
    
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', resetForm);
    }
}

// Manejar búsqueda de personal
async function handleSearch(e) {
    e.preventDefault();
    
    const query = searchQuery.value.trim();
    if (query.length < 2) {
        showNotification('Ingrese al menos 2 caracteres para buscar', 'warning');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/personal/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al buscar personal');
        }
        
        displaySearchResults(data.data || []);
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        showNotification('Error al buscar personal. Intente nuevamente.', 'error');
    }
}

// Mostrar resultados de búsqueda
function displaySearchResults(results) {
    resultsBody.innerHTML = '';
    
    if (results.length === 0) {
        resultsBody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">No se encontraron resultados</td>
            </tr>
        `;
        searchResults.style.display = 'block';
        return;
    }
    
    results.forEach(persona => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <img src="${persona.foto_perfil ? 
                    `${API_BASE_URL}/uploads/fotos/${persona.foto_perfil.split('/').pop()}` : 
                    'img/LOGOSCC.png'}" 
                     alt="Foto" class="employee-photo" 
                     onerror="this.onerror=null; this.src='img/LOGOSCC.png';">
            </td>
            <td>${persona.nombres || ''}</td>
            <td>${[persona.apellido_paterno, persona.apellido_materno].filter(Boolean).join(' ')}</td>
            <td>${persona.grado_cargo || 'N/A'}</td>
            <td>
                <button class="btn btn-primary btn-sm select-personal" data-id="${persona.id}">
                    <i class="fas fa-check"></i> Seleccionar
                </button>
            </td>
        `;
        
        // Agregar evento de selección
        const selectBtn = row.querySelector('.select-personal');
        selectBtn.addEventListener('click', () => selectPersonal(persona));
        
        resultsBody.appendChild(row);
    });
    
    searchResults.style.display = 'block';
}

// Seleccionar personal para evaluación
function selectPersonal(persona) {
    selectedPersonalId = persona.id;
    personalNombre.value = `${persona.nombres || ''} ${persona.apellido_paterno || ''} ${persona.apellido_materno || ''}`.trim();
    personalGrado.value = persona.grado_cargo || '';
    
    // Mostrar el formulario de evaluación
    evaluacionForm.style.display = 'block';
    
    // Cargar evaluaciones existentes
    loadEvaluaciones();
    
    // Desplazarse al formulario
    evaluacionForm.scrollIntoView({ behavior: 'smooth' });
}

// Validar formato de CUIP
function validateCuip() {
    const cuip = personalCuip.value.trim();
    const validationDiv = document.getElementById('cuip-validation');
    
    if (!cuip) {
        validationDiv.textContent = '';
        toggleFormFields(false);
        return false;
    }
    
    // Validar formato: 2 dígitos + 5 letras + 8 dígitos
    const cuipRegex = /^(\d{2})([A-Za-z]{5})(\d{8})$/;
    const match = cuip.match(cuipRegex);
    
    if (!match) {
        validationDiv.textContent = 'Formato de CUIP inválido. Debe ser: 18MXHGO00012543';
        validationDiv.className = 'validation-message error';
        toggleFormFields(false);
        return false;
    }
    
    const [_, anio, estado, consecutivo] = match;
    const anioActual = new Date().getFullYear() % 100; // Últimos 2 dígitos del año actual
    const anioEvaluacion = parseInt(anio, 10);
    const diferenciaAnios = anioActual - anioEvaluacion;
    
    // Validar que el año no sea futuro
    if (anioEvaluacion > anioActual) {
        validationDiv.textContent = 'El año del CUIP no puede ser futuro';
        validationDiv.className = 'validation-message error';
        toggleFormFields(false);
        return false;
    }
    
    // Validar si el CUIP tiene más de 3 años
    if (diferenciaAnios > 3) {
        validationDiv.textContent = 'El CUIP tiene más de 3 años de antigüedad. No se pueden registrar evaluaciones.';
        validationDiv.className = 'validation-message error';
        toggleFormFields(false);
        return false;
    }
    
    // Si pasa todas las validaciones
    validationDiv.textContent = 'CUIP válido';
    validationDiv.className = 'validation-message success';
    toggleFormFields(true);
    return true;
}

// Validar fecha de vigencia
function validateVigencia() {
    const vigenciaDate = new Date(vigencia.value);
    const today = new Date();
    const validationDiv = document.getElementById('vigencia-validation');
    
    // Calcular diferencia en años
    const diffTime = vigenciaDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        validationDiv.textContent = 'La fecha de vigencia no puede ser anterior a la fecha actual';
        validationDiv.className = 'validation-message error';
        return false;
    }
    
    if (diffDays > 1095) { // 3 años en días
        validationDiv.textContent = 'Evaluación de control no vigente (más de 3 años)';
        validationDiv.className = 'validation-message error';
        return false;
    }
    
    validationDiv.textContent = 'Vigencia válida';
    validationDiv.className = 'validation-message success';
    return true;
}

// Manejar selección de archivo
function handleFileSelect(e) {
    const fileName = document.getElementById('file-name');
    const file = e.target.files[0];
    
    if (file) {
        // Validar tamaño máximo (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('El archivo es demasiado grande. El tamaño máximo permitido es 5MB.', 'error');
            e.target.value = '';
            fileName.textContent = 'No se ha seleccionado ningún archivo';
            return;
        }
        
        // Validar extensión
        if (!file.name.toLowerCase().endsWith('.pdf')) {
            showNotification('Solo se permiten archivos PDF.', 'error');
            e.target.value = '';
            fileName.textContent = 'No se ha seleccionado ningún archivo';
            return;
        }
        
        fileName.textContent = file.name;
    } else {
        fileName.textContent = 'No se ha seleccionado ningún archivo';
    }
}

// Habilitar/deshabilitar campos del formulario según validación de CUIP
function toggleFormFields(enable) {
    const fields = [tipoEvaluacion, fechaEvaluacion, resultado, vigencia, archivoPdf, btnAgregar];
    
    fields.forEach(field => {
        if (field) {
            field.disabled = !enable;
        }
    });
}

// Manejar agregar evaluación
async function handleAddEvaluacion() {
    // Validar campos requeridos
    if (!validateCuip() || !validateVigencia()) {
        showNotification('Por favor complete correctamente todos los campos requeridos', 'warning');
        return;
    }
    
    if (!tipoEvaluacion.value) {
        showNotification('Seleccione el tipo de evaluación', 'warning');
        return;
    }
    
    if (!fechaEvaluacion.value) {
        showNotification('Ingrese la fecha de evaluación', 'warning');
        return;
    }
    
    if (!resultado.value) {
        showNotification('Seleccione un resultado', 'warning');
        return;
    }
    
    if (!archivoPdf.files[0]) {
        showNotification('Seleccione un archivo PDF', 'warning');
        return;
    }
    
    try {
        // Crear FormData para enviar archivo
        const formData = new FormData();
        formData.append('personal_id', selectedPersonalId);
        formData.append('cuip', personalCuip.value.trim().toUpperCase());
        formData.append('tipo_evaluacion', tipoEvaluacion.value);
        formData.append('fecha_evaluacion', fechaEvaluacion.value);
        formData.append('resultado', resultado.value);
        formData.append('vigencia', vigencia.value);
        formData.append('archivo_pdf', archivoPdf.files[0]);
        
        // Enviar datos al servidor
        console.log('Enviando datos al servidor...');
        const response = await fetch(`${API_BASE_URL}/evaluaciones-control`, {
            method: 'POST',
            body: formData
        });
        
        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('Error al parsear la respuesta JSON:', jsonError);
            const responseText = await response.text();
            console.error('Respuesta del servidor (texto):', responseText);
            throw new Error(`Error en el servidor: ${response.status} ${response.statusText}`);
        }
        
        if (!response.ok) {
            console.error('Error en la respuesta del servidor:', {
                status: response.status,
                statusText: response.statusText,
                data: data
            });
            throw new Error(data.message || `Error al guardar la evaluación (${response.status})`);
        }
        
        showNotification('Evaluación guardada correctamente', 'success');
        
        // Recargar la lista de evaluaciones
        loadEvaluaciones();
        
        // Limpiar campos del formulario (excepto CUIP y datos del personal)
        resetFormFields();
        
    } catch (error) {
        console.error('Error al guardar la evaluación:', error);
        showNotification(error.message || 'Error al guardar la evaluación', 'error');
    }
}

// Cargar evaluaciones del personal seleccionado
async function loadEvaluaciones() {
    if (!selectedPersonalId) {
        console.error('No se ha seleccionado un personal');
        return;
    }
    
    console.log(`Cargando evaluaciones para el personal con ID: ${selectedPersonalId}`);
    
    try {
        // Asegurarse de que no haya doble /api en la URL
        const baseUrl = API_BASE_URL.endsWith('/api') ? 
            API_BASE_URL : 
            `${API_BASE_URL}/api`;
            
        const url = `${baseUrl}/evaluaciones-control/personal/${selectedPersonalId}`;
        console.log('Solicitando evaluaciones a:', url);
        
        const response = await fetch(url);
        console.log('Respuesta del servidor - Estado:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en la respuesta del servidor:', errorText);
            throw new Error(`Error al cargar evaluaciones: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Datos de evaluaciones recibidos:', data);
        
        if (data.success) {
            evaluaciones = Array.isArray(data.data) ? data.data : [];
            console.log(`Se encontraron ${evaluaciones.length} evaluaciones`);
            evaluaciones.forEach((evaluation, index) => {
                console.log(`Evaluación ${index + 1}:`, evaluation);
            });
            displayEvaluaciones();
        } else {
            console.error('Error en la respuesta del servidor:', data.message);
            throw new Error(data.message || 'Error al cargar las evaluaciones');
        }
    } catch (error) {
        console.error('Error al cargar evaluaciones:', error);
        showNotification(`Error al cargar las evaluaciones: ${error.message}`, 'error');
    }
}

// Mostrar evaluaciones en la tabla
function displayEvaluaciones() {
    console.log('Iniciando displayEvaluaciones');
    
    if (!evaluacionesBody) {
        console.error('Elemento evaluacionesBody no encontrado en el DOM');
        return;
    }
    
    console.log(`Mostrando ${evaluaciones.length} evaluaciones`);
    
    if (evaluaciones.length === 0) {
        console.log('No hay evaluaciones para mostrar');
        evaluacionesBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-records">No hay evaluaciones registradas</td>
            </tr>
        `;
        return;
    }
    
    try {
        const rows = evaluaciones.map((evalua, index) => {
            console.log(`Procesando evaluación ${index + 1}:`, evalua);
            
            try {
                const fechaEval = evalua.fecha_evaluacion ? 
                    new Date(evalua.fecha_evaluacion).toLocaleDateString('es-MX') : 'Fecha no disponible';
                    
                const fechaVig = evalua.vigencia ? 
                    new Date(evalua.vigencia).toLocaleDateString('es-MX') : 'Fecha no disponible';
                
                // Verificar si la evaluación está vencida
                const hoy = new Date();
                const vigenciaDate = evalua.vigencia ? new Date(evalua.vigencia) : null;
                const vencida = vigenciaDate && vigenciaDate < hoy;
                
                // Construir la URL del PDF
                let pdfUrl = 'N/A';
                if (evalua.archivo_pdf) {
                    // Usar la ruta directa ya que el servidor sirve archivos estáticos desde /evaluaciones
                    pdfUrl = evalua.archivo_pdf;
                    console.log(`URL del PDF para evaluación ${index + 1}:`, pdfUrl);
                }
                
                return `
                    <tr class="${vencida ? 'table-warning' : ''}">
                        <td>${getTipoEvaluacionNombre(evalua.tipo_evaluacion)}</td>
                        <td>${fechaEval}</td>
                        <td>
                            <span class="badge ${getResultadoBadgeClass(evalua.resultado)}">
                                ${getResultadoNombre(evalua.resultado)}
                            </span>
                        </td>
                        <td>${fechaVig} ${vencida ? '<span class="badge badge-danger">Vencida</span>' : ''}</td>
                        <td>
                            ${evalua.archivo_pdf ? 
                                `<a href="${pdfUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                    <i class="fas fa-file-pdf"></i> Ver PDF
                                </a>` : 
                                'N/A'}
                        </td>
                        <td>
                            <button class="btn-action btn-view" onclick="viewEvaluacion(${evalua.id})">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteEvaluacion(${evalua.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            } catch (error) {
                console.error(`Error al procesar la evaluación ${index + 1}:`, error);
                return `
                    <tr class="table-danger">
                        <td colspan="6">Error al mostrar la evaluación: ${error.message}</td>
                    </tr>
                `;
            }
        });
        
        evaluacionesBody.innerHTML = rows.join('');
        console.log('Evaluaciones mostradas correctamente');
    } catch (error) {
        console.error('Error crítico en displayEvaluaciones:', error);
        evaluacionesBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-danger">
                    Error al mostrar las evaluaciones: ${error.message}
                </td>
            </tr>
        `;
    }
}

// Obtener nombre del tipo de evaluación
function getTipoEvaluacionNombre(tipo) {
    const tipos = {
        'control_confianza': 'Control de Confianza',
        'evaluacion_psicologica': 'Evaluación Psicológica',
        'examen_medico': 'Examen Médico',
        'evaluacion_teorica': 'Evaluación Teórica',
        'evaluacion_practica': 'Evaluación Práctica'
    };
    
    return tipos[tipo] || tipo;
}

// Obtener nombre del resultado
function getResultadoNombre(resultado) {
    const resultados = {
        'aprobado': 'Aprobado',
        'reprobado': 'Reprobado',
        'pendiente': 'Pendiente'
    };
    
    return resultados[resultado] || resultado;
}

// Obtener clase CSS para el badge de resultado
function getResultadoBadgeClass(resultado) {
    const clases = {
        'aprobado': 'badge-success',
        'reprobado': 'badge-danger',
        'pendiente': 'badge-warning'
    };
    
    return `badge ${clases[resultado] || 'badge-secondary'}`;
}

// Ver evaluación (detalles)
function viewEvaluacion(id) {
    console.log('Ver evaluación - ID:', id);
    
    try {
        if (!id) {
            throw new Error('ID de evaluación no proporcionado');
        }
        
        // Convertir a número si es necesario
        const evaluacionId = typeof id === 'string' ? parseInt(id, 10) : id;
        
        console.log('Buscando evaluación con ID:', evaluacionId);
        console.log('Evaluaciones disponibles:', evaluaciones);
        
        const evaluacion = evaluaciones.find(e => e.id === evaluacionId);
        
        if (!evaluacion) {
            throw new Error(`No se encontró la evaluación con ID: ${evaluacionId}`);
        }
        
        console.log('Evaluación encontrada:', evaluacion);
        
        // Construir la URL del PDF si existe
        let pdfUrl = '';
        if (evaluacion.archivo_pdf) {
            // Asegurarse de que la ruta no tenga una barra inicial duplicada
            const cleanPath = evaluacion.archivo_pdf.startsWith('/') ? 
                evaluacion.archivo_pdf.substring(1) : evaluacion.archivo_pdf;
            pdfUrl = `${API_BASE_URL}/${cleanPath}`;
            console.log('URL del PDF:', pdfUrl);
            
            // Abrir el PDF en una nueva pestaña
            window.open(pdfUrl, '_blank');
            showNotification('Abriendo evaluación en una nueva pestaña', 'info');
        } else {
            console.warn('La evaluación no tiene un archivo PDF asociado');
            showNotification('Esta evaluación no tiene un archivo PDF asociado', 'warning');
        }
        
        // Aquí podrías implementar lógica adicional para mostrar más detalles en un modal
        // Por ejemplo, podrías mostrar un modal con la información detallada de la evaluación
        
    } catch (error) {
        console.error('Error al ver la evaluación:', error);
        showNotification(`Error al ver la evaluación: ${error.message}`, 'error');
    }
}

// Eliminar evaluación
async function deleteEvaluacion(id) {
    if (!confirm('¿Está seguro de eliminar esta evaluación? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/evaluaciones-control/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Error al eliminar la evaluación');
        }
        
        showNotification('Evaluación eliminada correctamente', 'success');
        
        // Recargar la lista de evaluaciones
        loadEvaluaciones();
        
    } catch (error) {
        console.error('Error al eliminar evaluación:', error);
        showNotification(error.message || 'Error al eliminar la evaluación', 'error');
    }
}

// Limpiar campos del formulario (excepto CUIP y datos del personal)
function resetFormFields() {
    tipoEvaluacion.value = '';
    fechaEvaluacion.value = new Date().toISOString().split('T')[0];
    resultado.value = '';
    
    // Establecer fecha de vigencia por defecto (1 año a partir de hoy)
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    vigencia.value = nextYear.toISOString().split('T')[0];
    
    // Limpiar archivo
    archivoPdf.value = '';
    document.getElementById('file-name').textContent = 'No se ha seleccionado ningún archivo';
    
    // Limpiar mensajes de validación
    document.getElementById('vigencia-validation').textContent = '';
}

// Limpiar todo el formulario
function resetForm() {
    resetFormFields();
    personalCuip.value = '';
    document.getElementById('cuip-validation').textContent = '';
    toggleFormFields(false);
    
    // Limpiar selección de personal
    selectedPersonalId = null;
    personalNombre.value = '';
    personalGrado.value = '';
    
    // Ocultar el formulario de evaluación
    evaluacionForm.style.display = 'none';
    
    // Limpiar resultados de búsqueda
    if (searchResults) {
        searchResults.style.display = 'none';
    }
    
    if (searchQuery) {
        searchQuery.value = '';
    }
    
    if (resultsBody) {
        resultsBody.innerHTML = '';
    }
    
    // Limpiar lista de evaluaciones
    evaluaciones = [];
    if (evaluacionesBody) {
        evaluacionesBody.innerHTML = `
            <tr>
                <td colspan="6" class="no-records">No hay evaluaciones registradas</td>
            </tr>
        `;
    }
}

// Hacer las funciones disponibles globalmente para los botones en la tabla
window.viewEvaluacion = viewEvaluacion;
window.deleteEvaluacion = deleteEvaluacion;

// Exportar la función de inicialización para que esté disponible para importación
export { initEvaluacionesControl };
