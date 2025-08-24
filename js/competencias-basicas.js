import { API_BASE_URL, showNotification } from './config.js';

// State management
const state = {
    selectedPersonal: null,
    competencias: [],
};

// DOM elements cache
const dom = {};

// Main initialization function
export function initCompetenciasBasicas() {
    console.log('Initializing Competencias Básicas module...');
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
    dom.competenciasForm = document.getElementById('competenciasForm');
    dom.competenciasBody = document.getElementById('competenciasBody');
    dom.viewModal = document.getElementById('viewModal');
    dom.modalContent = document.getElementById('modalContent');
    dom.closeModal = document.querySelector('.close-modal');
    dom.fileInput = document.getElementById('archivo_pdf');
    dom.fileNameSpan = document.getElementById('fileName');
    dom.cancelBtn = document.getElementById('cancelBtn');
    dom.vigenciaInput = document.getElementById('fechaVigencia'); // Updated ID
    dom.vigenciaError = document.getElementById('vigenciaError');
    dom.formFields = dom.competenciasForm.querySelectorAll('input, select, textarea, button');
}

function setupEventListeners() {
    if (dom.searchBtn) dom.searchBtn.addEventListener('click', handleSearch);
    if (dom.searchInput) dom.searchInput.addEventListener('keyup', (e) => e.key === 'Enter' && handleSearch());
    if (dom.competenciasForm) dom.competenciasForm.addEventListener('submit', handleSubmit);
    if (dom.fileInput) dom.fileInput.addEventListener('change', handleFileSelect);
    if (dom.cancelBtn) dom.cancelBtn.addEventListener('click', () => dom.competenciasForm.reset());
    if (dom.closeModal) dom.closeModal.addEventListener('click', () => dom.viewModal.style.display = 'none');
    if (dom.searchResults) dom.searchResults.addEventListener('click', handleSearchResultsClick);
    if (dom.competenciasBody) dom.competenciasBody.addEventListener('click', handleTableActions);
    if (dom.vigenciaInput) dom.vigenciaInput.addEventListener('input', handleVigenciaChange);
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

function handleVigenciaChange() {
    const selectedDate = new Date(dom.vigenciaInput.value);
    // Adjust for timezone offset to prevent off-by-one day errors
    selectedDate.setMinutes(selectedDate.getMinutes() + selectedDate.getTimezoneOffset());

    const today = new Date();
    const threeYearsAgo = new Date();
    threeYearsAgo.setFullYear(today.getFullYear() - 3);

    // Check if a valid date is selected and if it's within the last 3 years
    const isValid = dom.vigenciaInput.value && selectedDate >= threeYearsAgo;

    dom.formFields.forEach(field => {
        // Keep the vigencia input and cancel button always enabled
        if (field.id !== 'fechaVigencia' && field.id !== 'cancelBtn') {
            field.disabled = !isValid;
        }
    });

    if (dom.vigenciaInput.value && !isValid) {
        dom.vigenciaError.textContent = 'Vigencia no válida. La constancia tiene más de 3 años.';
        dom.vigenciaError.style.display = 'block';
    } else {
        dom.vigenciaError.style.display = 'none';
    }
}

async function handleSubmit(e) {
    e.preventDefault();
    if (!state.selectedPersonal) {
        showNotification('Seleccione un personal primero', 'warning');
        return;
    }

    const formData = new FormData(dom.competenciasForm);
    formData.append('personal_id', state.selectedPersonal.id);
    // The backend now handles fechaVigencia, and we can add vigencia directly if needed.
    formData.append('vigencia', '3');

    try {
        const response = await fetch(`${API_BASE_URL}/competencias-basicas`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Competencia guardada con éxito', 'success');
            dom.competenciasForm.reset();
            handleFileSelect({target: {files:[]}}); // clear file name
            handleVigenciaChange(); // Reset disabled state
            loadCompetencias(); // Refresh list
        } else {
            throw new Error(result.message || 'Error desconocido al guardar');
        }
    } catch (error) {
        console.error('Error al guardar la competencia:', error);
        showNotification(`Error al guardar: ${error.message}`, 'error');
    }
}

function handleTableActions(e) {
    const target = e.target.closest('button.action-btn');
    if (!target) return;

    const id = target.dataset.id;
    if (target.classList.contains('view')) {
        viewCompetencia(Number(id));
    } else if (target.classList.contains('delete')) {
        deleteCompetencia(Number(id));
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
    
    dom.searchResults.innerHTML = '';
    dom.searchResults.style.display = 'none';
    dom.searchInput.value = '';
    
    loadCompetencias();
}

async function loadCompetencias() {
    if (!state.selectedPersonal) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/competencias-basicas/personal/${state.selectedPersonal.id}`);
        const data = await response.json();

        if (data.success) {
            state.competencias = data.data;
            displayCompetencias();
        } else {
            showNotification('Error al cargar competencias: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Error al cargar competencias:', error);
        showNotification('Error al cargar competencias', 'error');
    }
}

function displayCompetencias() {
    if (state.competencias.length === 0) {
        dom.competenciasBody.innerHTML = '<tr><td colspan="6" class="no-records">No hay registros de competencias</td></tr>';
        return;
    }
    
    dom.competenciasBody.innerHTML = state.competencias.map(item => {
        const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString('es-MX') : 'N/A';
        const badgeClass = item.resultado === 'Aprobado' ? 'badge-success' : (item.resultado === 'No Aprobado' ? 'badge-danger' : 'badge-warning');
        
        return `
            <tr>
                <td>${state.selectedPersonal.nombres} ${state.selectedPersonal.apellido_paterno || ''}</td>
                <td>${item.vigencia}</td>
                <td><span class="badge ${badgeClass}">${item.resultado}</span></td>
                <td>${fecha}</td>
                <td>${item.institucion}</td>
                <td class="table-actions">
                    <button class="action-btn view" data-id="${item.id}"><i class="fas fa-eye"></i> Ver</button>
                    <button class="action-btn delete" data-id="${item.id}"><i class="fas fa-trash"></i> Eliminar</button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewCompetencia(id) {
    const item = state.competencias.find(c => c.id === id);
    if (!item) return;

    const fecha = item.fecha ? new Date(item.fecha).toLocaleDateString('es-MX') : 'N/A';
    let content = `
        <div class="modal-details">
            <div class="detail-row"><span class="detail-label">Vigencia:</span><span class="detail-value">${item.vigencia} años</span></div>
            <div class="detail-row"><span class="detail-label">Resultado:</span><span class="detail-value">${item.resultado}</span></div>
            <div class="detail-row"><span class="detail-label">Fecha:</span><span class="detail-value">${fecha}</span></div>
            <div class="detail-row"><span class="detail-label">Institución:</span><span class="detail-value">${item.institucion}</span></div>
            <div class="detail-row"><span class="detail-label">Enlaces:</span><span class="detail-value"><a href="${item.enlaces}" target="_blank">${item.enlaces}</a></span></div>
            <div class="detail-row"><span class="detail-label">Observaciones:</span><span class="detail-value">${item.observaciones || 'N/A'}</span></div>
    `;

    if (item.archivo_pdf) {
        content += `
            <div class="detail-row">
                <span class="detail-label">Documento:</span>
                <a href="${item.archivo_pdf}" target="_blank" class="btn btn-primary"><i class="fas fa-file-pdf"></i> Ver PDF</a>
            </div>
        `;
    }

    content += '</div>';
    dom.modalContent.innerHTML = content;
    dom.viewModal.style.display = 'flex';
}

async function deleteCompetencia(id) {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/competencias-basicas/${id}`, { method: 'DELETE' });
        const data = await response.json();

        if (data.success) {
            showNotification('Registro eliminado correctamente', 'success');
            loadCompetencias();
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        showNotification(`Error al eliminar: ${error.message}`, 'error');
    }
}
