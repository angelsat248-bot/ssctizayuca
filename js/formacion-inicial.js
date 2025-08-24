import { API_BASE_URL, showNotification } from './config.js';

// State management
const state = {
    selectedPersonal: null,
    formaciones: [],
};

// DOM elements cache
const dom = {};

// Main initialization function, exported to be called from main.js
export function initFormacionInicial() {
    console.log('Initializing Formación Inicial module...');
    cacheDomElements();
    setupEventListeners();
}

function cacheDomElements() {
    dom.searchInput = document.getElementById('searchInput');
    dom.searchBtn = document.getElementById('searchBtn');
    dom.searchResults = document.getElementById('searchResults');
    dom.personalInfo = document.getElementById('personalInfo');
    dom.infoNombre = document.getElementById('infoNombre');
    dom.infoPuesto = document.getElementById('infoPuesto');
    dom.infoCuip = document.getElementById('infoCuip');
    dom.infoCurp = document.getElementById('infoCurp');
    dom.formWrapper = document.getElementById('form-wrapper');
    dom.formacionForm = document.getElementById('formacionForm');
    dom.formacionBody = document.getElementById('formacionBody');
    dom.viewModal = document.getElementById('viewModal');
    dom.modalContent = document.getElementById('modalContent');
    dom.closeModal = document.querySelector('.close-modal');
    dom.fileInput = document.getElementById('archivo_pdf');
    dom.fileNameSpan = document.getElementById('fileName');
    dom.cancelBtn = document.getElementById('cancelBtn');
}

function setupEventListeners() {
    if (dom.searchBtn) dom.searchBtn.addEventListener('click', handleSearch);
    if (dom.searchInput) dom.searchInput.addEventListener('keyup', (e) => e.key === 'Enter' && handleSearch());
    if (dom.formacionForm) dom.formacionForm.addEventListener('submit', handleSubmit);
    if (dom.fileInput) dom.fileInput.addEventListener('change', handleFileSelect);
    if (dom.cancelBtn) dom.cancelBtn.addEventListener('click', () => dom.formacionForm.reset());
    if (dom.closeModal) dom.closeModal.addEventListener('click', () => dom.viewModal.style.display = 'none');
    if (dom.viewModal) window.addEventListener('click', (e) => {
        if (e.target === dom.viewModal) dom.viewModal.style.display = 'none';
    });
    
    if (dom.searchResults) dom.searchResults.addEventListener('click', handleSearchResultsClick);
    if (dom.formacionBody) dom.formacionBody.addEventListener('click', handleTableActions);
}

// --- Event Handlers ---

async function handleSearch() {
    const query = dom.searchInput.value.trim();
    if (query.length < 3) {
        showNotification('Ingrese al menos 3 caracteres para buscar', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/personal/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            displaySearchResults(data.data);
        } else {
            dom.searchResults.innerHTML = '<div class="search-result-item">No se encontraron resultados</div>';
            dom.searchResults.style.display = 'block';
        }
    } catch (error) {
        console.error('Error al buscar personal:', error);
        showNotification('Error al buscar personal', 'error');
    }
}

function handleSearchResultsClick(e) {
    const item = e.target.closest('.search-result-item');
    if (item) {
        const personal = JSON.parse(item.dataset.personal);
        selectPersonal(personal);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    dom.fileNameSpan.textContent = file ? file.name : 'Ningún archivo seleccionado';
}

async function handleSubmit(e) {
    e.preventDefault();
    
    if (!state.selectedPersonal) {
        showNotification('Seleccione un personal primero', 'warning');
        return;
    }
    
    console.log('Iniciando envío del formulario...');
    
    // Validar campos requeridos
    const requiredFields = ['curso', 'tipo', 'institucion', 'fecha', 'resultado'];
    const missingFields = [];
    
    requiredFields.forEach(field => {
        const input = dom.formacionForm.querySelector(`[name="${field}"]`);
        if (input && !input.value.trim()) {
            missingFields.push(field);
        }
    });
    
    if (missingFields.length > 0) {
        showNotification(`Los siguientes campos son requeridos: ${missingFields.join(', ')}`, 'error');
        return;
    }
    
    // Crear FormData y agregar datos
    const formData = new FormData(dom.formacionForm);
    formData.append('personal_id', state.selectedPersonal.id);
    
    // Mostrar datos del formulario en consola para depuración
    console.log('Datos del formulario:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
    }
    
    try {
        console.log('Enviando solicitud a:', `${API_BASE_URL}/formacion-inicial`);
        // No establecer el Content-Type manualmente, el navegador lo hará automáticamente
        // con el boundary correcto para FormData
        const response = await fetch(`${API_BASE_URL}/formacion-inicial`, {
            method: 'POST',
            body: formData
            // No incluir headers, el navegador los establecerá automáticamente
            // con el boundary correcto para FormData
        });
        
        console.log('Respuesta del servidor - Estado:', response.status);
        
        let result;
        try {
            result = await response.json();
            console.log('Respuesta del servidor - Datos:', result);
        } catch (jsonError) {
            console.error('Error al analizar la respuesta JSON:', jsonError);
            throw new Error('La respuesta del servidor no es un JSON válido');
        }

        if (!response.ok) {
            throw new Error(result.message || `Error HTTP ${response.status}`);
        }

        if (result.success) {
            showNotification('Formación guardada con éxito', 'success');
            dom.formacionForm.reset();
            handleFileSelect({target: {files:[]}}); // clear file name
            loadFormaciones(); // Refresh list
        } else {
            throw new Error(result.message || 'Error desconocido al guardar');
        }
    } catch (error) {
        console.error('Error al guardar la formación:', error);
        showNotification(`Error al guardar la formación: ${error.message}`, 'error');
    }
}

function handleTableActions(e) {
    const target = e.target.closest('button.action-btn');
    if (!target) return;

    const id = target.dataset.id;
    if (target.classList.contains('view')) {
        viewFormacion(Number(id));
    } else if (target.classList.contains('delete')) {
        deleteFormacion(Number(id), target);
    }
}

// --- UI and Data Functions ---

function displaySearchResults(results) {
    dom.searchResults.innerHTML = results.map(persona => {
        const nombreCompleto = `${persona.nombres} ${persona.apellido_paterno || ''} ${persona.apellido_materno || ''}`.trim();
        return `<div class="search-result-item" data-personal='${JSON.stringify(persona)}'>${nombreCompleto}</div>`;
    }).join('');
    
    dom.searchResults.style.display = 'block';
}

function selectPersonal(personal) {
    state.selectedPersonal = personal;
    
    dom.infoNombre.textContent = `${personal.nombres} ${personal.apellido_paterno || ''} ${personal.apellido_materno || ''}`.trim();
    dom.infoPuesto.textContent = personal.puesto || 'No especificado';
    dom.infoCuip.textContent = personal.cuip || 'No especificado';
    dom.infoCurp.textContent = personal.curp || 'No especificado';
    
    dom.personalInfo.style.display = 'grid'; 
    if (dom.formWrapper) dom.formWrapper.style.display = 'block';
    
    dom.searchResults.innerHTML = '';
    dom.searchResults.style.display = 'none';
    dom.searchInput.value = ''; 
    
    loadFormaciones();
}

async function loadFormaciones() {
    if (!state.selectedPersonal) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/formacion-inicial/personal/${state.selectedPersonal.id}`);
        if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
        const data = await response.json();

        if (data.success) {
            state.formaciones = data.data;
            displayFormaciones();
        } else {
            showNotification('Error al cargar las formaciones: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error al cargar formaciones:', error);
        showNotification('Error al cargar las formaciones', 'error');
    }
}

function displayFormaciones() {
    if (!dom.formacionBody) return;
    if (state.formaciones.length === 0) {
        dom.formacionBody.innerHTML = '<tr><td colspan="6" class="no-records">No hay registros de formación</td></tr>';
        return;
    }
    
    dom.formacionBody.innerHTML = state.formaciones.map(formacion => {
        const fecha = formacion.fecha ? new Date(formacion.fecha).toLocaleDateString('es-MX') : 'N/A';
        const badgeClass = formacion.resultado === 'Aprobado' ? 'badge-success' : (formacion.resultado === 'No Aprobado' ? 'badge-danger' : 'badge-warning');
        
        return `
            <tr>
                <td>${state.selectedPersonal.nombres} ${state.selectedPersonal.apellido_paterno || ''}</td>
                <td>${formacion.curso || 'N/A'}</td>
                <td>${formacion.tipo || 'N/A'}</td>
                <td>${fecha}</td>
                <td><span class="badge ${badgeClass}">${formacion.resultado || 'N/A'}</span></td>
                <td class="table-actions">
                    <button class="action-btn view" data-id="${formacion.id}">
                        <i class="fas fa-eye"></i> Ver
                    </button>
                    <button class="action-btn delete" data-id="${formacion.id}">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewFormacion(id) {
    const formacion = state.formaciones.find(f => f.id === id);
    if (!formacion) return showNotification('Formación no encontrada', 'error');
    
    const fecha = formacion.fecha ? new Date(formacion.fecha).toLocaleDateString('es-MX') : 'N/A';
    let content = `
        <div class="modal-details">
            <div class="detail-row"><span class="detail-label">Curso:</span><span class="detail-value">${formacion.curso || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Tipo:</span><span class="detail-value">${formacion.tipo || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Institución:</span><span class="detail-value">${formacion.institucion || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Fecha:</span><span class="detail-value">${fecha}</span></div>
            <div class="detail-row"><span class="detail-label">Resultado:</span><span class="detail-value">${formacion.resultado || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Observaciones:</span><span class="detail-value">${formacion.observaciones || 'Ninguna'}</span></div>
    `;
    
    if (formacion.archivo_pdf) {
        content += `
            <div class="detail-row">
                <span class="detail-label">Documento:</span>
                <a href="${formacion.archivo_pdf}" target="_blank" class="btn btn-primary">
                    <i class="fas fa-file-pdf"></i> Ver PDF
                </a>
            </div>
        `;
    }
    
    content += '</div>';
    dom.modalContent.innerHTML = content;
    dom.viewModal.style.display = 'flex';
}

async function deleteFormacion(id, button) {
    if (!confirm('¿Está seguro de eliminar este registro de formación?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/formacion-inicial/${id}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            showNotification('Registro de formación eliminado correctamente', 'success');
            const row = button.closest('tr');
            row.style.opacity = '0';
            setTimeout(() => {
                state.formaciones = state.formaciones.filter(f => f.id !== id);
                displayFormaciones();
            }, 300);
        } else {
            throw new Error(data.message || 'Error al eliminar el registro');
        }
    } catch (error) {
        console.error('Error al eliminar la formación:', error);
        showNotification(`Error al eliminar: ${error.message}`, 'error');
    }
}
