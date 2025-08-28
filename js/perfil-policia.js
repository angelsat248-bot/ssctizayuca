// Current selected officer for PDF generation
let currentOfficer = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Perfil del Policía - Inicializando...');
    
    // Initialize elements
    const searchInput = document.getElementById('search-personal');
    const searchBtn = document.getElementById('search-btn');
    const resultsBody = document.getElementById('results-body');
    const modal = document.getElementById('officer-modal');
    const closeBtn = document.querySelector('.close');
    const printBtn = document.getElementById('print-pdf');
    
    // Event Listeners
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleSearch();
        });
    }
    
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
    }
    
    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', generatePDF);
    }
});

// Handle search functionality
async function handleSearch() {
    console.log('Iniciando búsqueda...');
    
    const searchInput = document.getElementById('search-personal');
    const resultsBody = document.getElementById('results-body');
    const searchBtn = document.getElementById('search-btn');
    
    if (!searchInput || !resultsBody || !searchBtn) {
        console.error('Elementos del DOM no encontrados:', { searchInput, resultsBody, searchBtn });
        alert('Error: No se pudo inicializar la búsqueda. Por favor, recarga la página.');
        return;
    }
    
    const query = searchInput.value.trim();
    if (!query) {
        console.log('Búsqueda vacía');
        resultsBody.innerHTML = '<tr><td colspan="9" class="no-results">Por favor ingresa un término de búsqueda</td></tr>';
        return;
    }
    
    console.log('Buscando:', query);
    
    // Show loading state
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Buscando...';
    resultsBody.innerHTML = `
        <tr>
            <td colspan="9" class="loading">
                <i class="fas fa-spinner fa-spin"></i> Buscando: "${query}"
                <div class="debug-info" style="font-size: 12px; color: #666; margin-top: 5px;">
                    Conectando con el servidor...
                </div>
            </td>
        </tr>`;
    
    try {
        // Make API request directly to the search endpoint
        const apiUrl = `/api/personal/search?query=${encodeURIComponent(query)}`;
        console.log('Realizando búsqueda en:', apiUrl);
        
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        console.log('Respuesta del servidor:', response);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error en la respuesta del servidor:', response.status, errorText);
            throw new Error(`Error del servidor: ${response.status} - ${errorText || 'Error desconocido'}`);
        }
        
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (data.success === false) {
            throw new Error(data.message || 'Error en la búsqueda');
        }
        
        const results = data.data || [];
        
        if (results.length === 0) {
            resultsBody.innerHTML = `
                <tr>
                    <td colspan="9" class="no-results">
                        No se encontraron resultados para: "${query}"
                    </td>
                </tr>`;
            return;
        }
        
        // Display results
        displayResults(results);
        
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        resultsBody.innerHTML = `
            <tr>
                <td colspan="9" class="error">
                    <i class="fas fa-exclamation-triangle"></i>
                    Error al realizar la búsqueda: ${error.message}
                    <div style="margin-top: 10px;">
                        <button onclick="handleSearch()" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-sync-alt"></i> Reintentar
                        </button>
                    </div>
                </td>
            </tr>`;
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search"></i> Buscar';
    }
}

// Display search results in the table
function displayResults(officers) {
    const resultsBody = document.getElementById('results-body');
    if (!resultsBody) return;
    
    if (!officers || officers.length === 0) {
        resultsBody.innerHTML = '<tr><td colspan="9" class="no-results">No se encontraron resultados</td></tr>';
        return;
    }
    
    resultsBody.innerHTML = officers.map(officer => `
        <tr>
            <td>${officer.nombres || ''}</td>
            <td>${officer.apellido_paterno || ''}</td>
            <td>${officer.apellido_materno || ''}</td>
            <td>${officer.grado_cargo || 'N/A'}</td>
            <td>${officer.fecha_ingreso ? new Date(officer.fecha_ingreso).toLocaleDateString() : 'N/A'}</td>
            <td>${officer.curp || 'N/A'}</td>
            <td>${officer.escolaridad || 'N/A'}</td>
            <td>${officer.telefono_contacto || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-view" onclick="viewOfficerDetails('${officer.id}')">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        </tr>
    `).join('');
}

// View officer details in modal
async function viewOfficerDetails(officerId) {
    if (!officerId) {
        console.error('No se proporcionó un ID de oficial');
        return;
    }

    const modal = document.getElementById('officer-modal');
    const modalContent = document.getElementById('officer-details');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (!modal || !modalContent) {
        console.error('No se pudo encontrar el modal de detalles');
        return;
    }

    try {
        // Show loading state
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        modalContent.innerHTML = '';
        modal.style.display = 'block';

        // Fetch all data in parallel
        const endpoints = [
            `/api/personal/${officerId}`,
            `/api/evaluaciones-control/personal/${officerId}`,
            `/api/formacion-inicial/personal/${officerId}`,
            `/api/historial-laboral/personal/${officerId}`,
            // New endpoints for the separate tables
            `/api/incapacidades-ausencias/personal/${officerId}`,
            `/api/estimulos-sanciones/personal/${officerId}`,
            `/api/separacion-servicio/personal/${officerId}`
        ];

        console.log('Iniciando solicitudes a:', endpoints);
        
        const responses = await Promise.allSettled(
            endpoints.map(url => 
                fetch(url).then(response => {
                    if (!response.ok) {
                        if (response.status === 404) {
                            // Return empty array for 404 responses
                            return [];
                        }
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
            )
        );

        console.log('Respuestas recibidas:', responses);

        // Log all responses for debugging
        console.log('Todas las respuestas recibidas:', responses);
        
        // Process responses
        const [
            officerRes, 
            evaluacionesRes, 
            formacionRes, 
            historialRes, 
            incapacidadesRes, 
            estimulosRes, 
            separacionRes
        ] = responses;
        
        // Log each response status and data with more details
        console.log('=== DETALLES DE RESPUESTAS ===');
        console.log('1. Datos personales:', JSON.stringify(officerRes, null, 2));
        console.log('2. Evaluaciones:', JSON.stringify(evaluacionesRes, null, 2));
        console.log('3. Formación:', JSON.stringify(formacionRes, null, 2));
        console.log('4. Historial:', JSON.stringify(historialRes, null, 2));
        console.log('5. Incapacidades:', JSON.stringify(incapacidadesRes, null, 2));
        console.log('6. Estímulos:', JSON.stringify(estimulosRes, null, 2));
        console.log('7. Separación:', JSON.stringify(separacionRes, null, 2));
        console.log('=== FIN DETALLES DE RESPUESTAS ===');
        
        // Handle officer data
        if (officerRes.status !== 'fulfilled') {
            throw new Error(`Error al cargar datos personales: ${officerRes.reason?.message || 'Error desconocido'}`);
        }
        const officerData = officerRes.value.data || officerRes.value;

        // Handle other data with proper error handling
        const evaluaciones = evaluacionesRes.status === 'fulfilled' ? 
            (evaluacionesRes.value.data || []) : [];
            
        const formacion = formacionRes.status === 'fulfilled' ? 
            (formacionRes.value.data || []) : [];
            
        const historial = historialRes.status === 'fulfilled' ? 
            (historialRes.value.data || []) : [];
        
        // Handle incapacidades, estimulos y separación from separate endpoints
        const incapacidades = incapacidadesRes.status === 'fulfilled' ? 
            (incapacidadesRes.value.data || incapacidadesRes.value || []) : [];
            
        const estimulos = estimulosRes.status === 'fulfilled' ? 
            (estimulosRes.value.data || estimulosRes.value || []) : [];
            
        const separacion = separacionRes.status === 'fulfilled' ? 
            (separacionRes.value.data || separacionRes.value || []) : [];
        
        // Store the current officer data for PDF generation and modal display
        currentOfficer = {
            ...officerData,
            evaluaciones,
            formacion,
            historial,
            incapacidades: Array.isArray(incapacidades) ? incapacidades : [],
            estimulos: Array.isArray(estimulos) ? estimulos : [],
            separacion: Array.isArray(separacion) ? separacion : []
        };
        
        console.log('Datos del policía cargados:', {
            officer: currentOfficer,
            evaluacionesCount: currentOfficer.evaluaciones?.length || 0,
            formacionCount: currentOfficer.formacion?.length || 0,
            historialCount: currentOfficer.historial?.length || 0,
            incapacidadesCount: currentOfficer.incapacidades?.length || 0,
            estimulosCount: currentOfficer.estimulos?.length || 0,
            separacionCount: currentOfficer.separacion?.length || 0
        });
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        
        // Render the officer details in the modal
        renderOfficerDetails(currentOfficer);
        
    } catch (error) {
        console.error('Error al cargar los detalles del policía:', error);
        const errorMessage = error.message || 'Error desconocido al cargar los datos';
        const modalContent = document.getElementById('officer-details');
        
        if (modalContent) {
            modalContent.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> 
                    No se pudo cargar la información del policía.
                    <div class="mt-2">${errorMessage}</div>
                    <button onclick="viewOfficerDetails(${officerId})" class="btn btn-sm btn-outline-primary mt-2">
                        <i class="fas fa-sync-alt"></i> Reintentar
                    </button>
                </div>`;
        }
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }


// Render officer details in the modal
function renderOfficerDetails(officer) {
    console.log('Renderizando detalles del oficial:', officer);
    
    // Log the structure of the officer object and its properties
    console.log('Estructura del objeto officer:', {
        hasIncapacidades: Array.isArray(officer.incapacidades) ? officer.incapacidades.length : 'No es un array',
        hasEstimulos: Array.isArray(officer.estimulos) ? officer.estimulos.length : 'No es un array',
        hasSeparacion: Array.isArray(officer.separacion) ? officer.separacion.length : 'No es un array',
        keys: Object.keys(officer)
    });
    
    const modalBody = document.getElementById('officer-details');
    if (!modalBody) {
        console.error('No se encontró el elemento con ID officer-details');
        return;
    }
    
    // Format dates
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return isNaN(date) ? 'N/A' : date.toLocaleDateString('es-MX');
        } catch (e) {
            console.error('Error formateando fecha:', dateString, e);
            return 'N/A';
        }
    };

    // Personal Information HTML
    const personalInfoHTML = `
        <div class="section">
            <h3>Información Personal</h3>
            <div class="info-grid">
                <div class="info-item">
                    <span class="info-label">Nombre Completo:</span>
                    <span class="info-value">${officer.nombres || ''} ${officer.apellido_paterno || ''} ${officer.apellido_materno || ''}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">CURP:</span>
                    <span class="info-value">${officer.curp || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Grado/Cargo:</span>
                    <span class="info-value">${officer.grado_cargo || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Fecha de Ingreso:</span>
                    <span class="info-value">${formatDate(officer.fecha_ingreso)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Escolaridad:</span>
                    <span class="info-value">${officer.escolaridad || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Teléfono:</span>
                    <span class="info-value">${officer.telefono_contacto || 'N/A'}</span>
                </div>
            </div>
        </div>`;

    // Create HTML for evaluaciones
    const evaluacionesHTML = officer.evaluaciones && officer.evaluaciones.length > 0 ? `
        <div class="section">
            <h4>Evaluaciones de Control</h4>
            <div class="table-responsive">
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>CUIP</th>
                            <th>Tipo de Evaluación</th>
                            <th>Fecha de Evaluación</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${officer.evaluaciones.map(eval => `
                            <tr>
                                <td>${eval.cuip || 'N/A'}</td>
                                <td>${eval.tipo_evaluacion || 'N/A'}</td>
                                <td>${formatDate(eval.fecha_evaluacion)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : '<div class="section"><p>No hay evaluaciones registradas.</p></div>';
    
    // Create HTML for formación
    const formacionHTML = officer.formacion && officer.formacion.length > 0 ? `
        <div class="section">
            <h4>Formación Inicial</h4>
            <div class="table-responsive">
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Curso</th>
                            <th>Tipo</th>
                            <th>Institución</th>
                            <th>Fecha</th>
                            <th>Resultado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${officer.formacion.map(item => `
                            <tr>
                                <td>${item.curso || 'N/A'}</td>
                                <td>${item.tipo || 'N/A'}</td>
                                <td>${item.institucion || 'N/A'}</td>
                                <td>${formatDate(item.fecha)}</td>
                                <td>${item.resultado || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : '<div class="section"><p>No hay registros de formación inicial.</p></div>';

    // Create HTML for historial laboral
    const historialHTML = officer.historial && officer.historial.length > 0 ? `
        <div class="section">
            <h4>Historial Laboral</h4>
            <div class="table-responsive">
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>CUP</th>
                            <th>Vigencia CUP</th>
                            <th>Función</th>
                            <th>Fecha Ingreso</th>
                            <th>Fecha Baja</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${officer.historial.map(item => `
                            <tr>
                                <td>${item.cup || 'N/A'}</td>
                                <td>${formatDate(item.cup_vigencia)}</td>
                                <td>${item.funcion || 'N/A'}</td>
                                <td>${formatDate(item.fecha_ingreso)}</td>
                                <td>${formatDate(item.fecha_baja)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : '<div class="section"><p>No hay registros de historial laboral.</p></div>';
    
    // Create HTML for incapacidades
    const incapacidadesHTML = officer.incapacidades && officer.incapacidades.length > 0 ? `
        <div class="section">
            <h4>Incapacidades/Ausencias</h4>
            <div class="table-responsive">
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Motivo</th>
                            <th>Fechas</th>
                            <th>Trayectoria Institucional</th>
                            <th>Documento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${officer.incapacidades.map(item => `
                            <tr>
                                <td>${item.motivo || 'N/A'}</td>
                                <td>${item.fechas || 'N/A'}</td>
                                <td>${item.trayectoriaInstitucional || item.trayectoria_institucional || 'N/A'}</td>
                                <td>${item.documentos ? `<a href="${item.documentos.startsWith('/') ? '' : '/'}${item.documentos}" target="_blank" class="btn btn-sm btn-primary">Ver</a>` : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : `
        <div class="section">
            <h4>Incapacidades/Ausencias</h4>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> No se encontraron registros de incapacidades o ausencias para este oficial.
            </div>
        </div>`;

    // Create HTML for estímulos/sanciones
    const estimulosHTML = officer.estimulos && officer.estimulos.length > 0 ? `
        <div class="section">
            <h4>Estímulos/Sanciones</h4>
            <div class="table-responsive">
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Fecha</th>
                            <th>Fundamento</th>
                            <th>Motivo</th>
                            <th>Resultado</th>
                            <th>Cumplimiento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${officer.estimulos.map(item => `
                            <tr>
                                <td>${item.tipo || 'N/A'}</td>
                                <td>${formatDate(item.fecha)}</td>
                                <td>${item.fundamento || 'N/A'}</td>
                                <td>${item.motivo || 'N/A'}</td>
                                <td>${item.resultado || 'N/A'}</td>
                                <td>${item.cumplimiento || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : `
        <div class="section">
            <h4>Estímulos/Sanciones</h4>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> No se encontraron registros de estímulos o sanciones para este oficial.
            </div>
        </div>`;

    // Create HTML for separación de servicio
    const separacionHTML = officer.separacion && officer.separacion.length > 0 ? `
        <div class="section">
            <h4>Separación de Servicio</h4>
            <div class="table-responsive">
                <table class="details-table">
                    <thead>
                        <tr>
                            <th>Motivo</th>
                            <th>Fecha de Baja</th>
                            <th>Documento</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${officer.separacion.map(item => `
                            <tr>
                                <td>${item.motivo || 'N/A'}</td>
                                <td>${formatDate(item.fechaBaja || item.fecha_baja)}</td>
                                <td>${item.documentos ? `<a href="${item.documentos.startsWith('/') ? '' : '/'}${item.documentos}" target="_blank" class="btn btn-sm btn-primary">Ver</a>` : 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>` : `
        <div class="section">
            <h4>Separación de Servicio</h4>
            <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> No se encontraron registros de separación de servicio para este oficial.
            </div>
        </div>`;

    // Combine all sections
    modalBody.innerHTML = `
        <div class="officer-details-container">
            <div class="officer-section">
                <h3>Información Personal</h3>
                <div class="officer-info">
                    <div class="info-row">
                        <span class="info-label">Nombre Completo:</span>
                        <span class="info-value">${officer.nombres || ''} ${officer.apellido_paterno || ''} ${officer.apellido_materno || ''}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">CURP:</span>
                        <span class="info-value">${officer.curp || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Grado/Cargo:</span>
                        <span class="info-value">${officer.grado_cargo || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Fecha de Ingreso:</span>
                        <span class="info-value">${formatDate(officer.fecha_ingreso)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Escolaridad:</span>
                        <span class="info-value">${officer.escolaridad || 'N/A'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Teléfono:</span>
                        <span class="info-value">${officer.telefono_contacto || 'N/A'}</span>
                    </div>
                </div>
            </div>
            
            <div class="officer-section">
                ${evaluacionesHTML}
            </div>
            
            <div class="officer-section">
                ${formacionHTML}
            </div>
            
            <div class="officer-section">
                ${historialHTML}
            </div>
            
            <div class="officer-section">
                ${incapacidadesHTML}
            </div>
            
            <div class="officer-section">
                ${estimulosHTML}
            </div>
            
            <div class="officer-section">
                ${separacionHTML}
            </div>
        </div>
    `;
    
    // Show the modal
    document.getElementById('officer-modal').style.display = 'block';
}

// Generate PDF from officer details
// Helper function to add a section header to the PDF
function addSection(doc, title, yPos) {
    // Add space before section if not at top
    if (yPos > 20) yPos += 10;
    
    // Check if we need a new page
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }
    
    // Add section title with styling
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(26, 35, 126); // Dark blue
    doc.text(title, 20, yPos + 5);
    
    // Add underline
    doc.setDrawColor(26, 35, 126);
    doc.setLineWidth(0.5);
    doc.line(20, yPos + 7, 190, yPos + 7);
    
    return yPos + 15; // Return new y position
}

// Helper function to add an info row to the PDF
function addInfoRow(doc, label, value, yPos) {
    // Check if we need a new page
    if (yPos > 270) {
        doc.addPage();
        yPos = 20;
    }
    
    // Add label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`${label}:`, 20, yPos);
    
    // Add value with text wrapping
    doc.setFont('helvetica', 'normal');
    const labelWidth = doc.getTextWidth(label + ': ');
    const maxWidth = 180 - labelWidth;
    const splitText = doc.splitTextToSize(value !== null && value !== undefined ? value.toString() : 'N/A', maxWidth);
    
    // Calculate height needed for this row
    const lineHeight = 7;
    const rowHeight = Math.max(7, splitText.length * lineHeight);
    
    // Add value text
    doc.text(splitText, 20 + labelWidth, yPos);
    
    // Add light separator
    doc.setDrawColor(240, 240, 240);
    doc.line(20, yPos + 3, 190, yPos + 3);
    
    return yPos + rowHeight + 3; // Return new y position
}

// Helper function to add a table to the PDF
function addTable(doc, headers, rows, columnWidths, yPos) {
    const startX = 15;
    const lineHeight = 7;
    const headerHeight = 10;
    const rowPadding = 8;
    
    // Calculate column positions
    const columnPositions = [startX];
    for (let i = 0; i < columnWidths.length - 1; i++) {
        columnPositions.push(columnPositions[i] + columnWidths[i] + 5);
    }
    
    // Check if we need a new page
    if (yPos > 250) {
        doc.addPage();
        yPos = 20;
    }
    
    // Add table headers
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    headers.forEach((header, i) => {
        doc.text(header, columnPositions[i], yPos + 5, { maxWidth: columnWidths[i] });
    });
    
    // Add header underline
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(startX, yPos + 7, 200 - startX, yPos + 7);
    
    yPos += headerHeight;
    
    // Add table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    rows.forEach((row, rowIndex) => {
        // Check if we need a new page
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
            
            // Add headers again on new page
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            headers.forEach((header, i) => {
                doc.text(header, columnPositions[i], yPos + 5, { maxWidth: columnWidths[i] });
            });
            doc.setDrawColor(0, 0, 0);
            doc.line(startX, yPos + 7, 200 - startX, yPos + 7);
            yPos += headerHeight;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
        }
        
        // Calculate row height needed for this row
        let maxLines = 1;
        const cellContents = [];
        
        // First pass: calculate max lines needed for this row
        row.forEach((cell, colIndex) => {
            const lines = doc.splitTextToSize(cell.toString(), columnWidths[colIndex]);
            cellContents.push(lines);
            maxLines = Math.max(maxLines, lines.length);
        });
        
        const rowHeight = (maxLines * lineHeight) + 2;
        
        // Add row background for better readability
        doc.setFillColor(245, 245, 245);
        doc.rect(startX, yPos, 200 - (2 * startX), rowHeight, 'F');
        
        // Add cell borders
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        columnPositions.forEach((x, i) => {
            doc.line(x, yPos, x, yPos + rowHeight);
        });
        doc.line(startX, yPos, 200 - startX, yPos);
        doc.line(startX, yPos + rowHeight, 200 - startX, yPos + rowHeight);
        
        // Add cell content
        cellContents.forEach((lines, colIndex) => {
            lines.forEach((line, lineIndex) => {
                doc.text(line, columnPositions[colIndex] + 2, yPos + (lineIndex + 1) * lineHeight, {
                    maxWidth: columnWidths[colIndex] - 4
                });
            });
        });
        
        yPos += rowHeight + 1; // Add small gap between rows
    });
    
    return yPos + 5; // Add some space after the table
}

async function generatePDF() {
    if (!currentOfficer) {
        alert('No se ha seleccionado ningún policía');
        return;
    }

    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Format dates
        const formatDate = (dateString) => {
            if (!dateString) return 'N/A';
            try {
                const date = new Date(dateString);
                return isNaN(date) ? 'N/A' : date.toLocaleDateString('es-MX');
            } catch (e) {
                console.error('Error formateando fecha:', dateString, e);
                return 'N/A';
            }
        };
        
        // Set document properties
        doc.setProperties({
            title: `Perfil_Policia_${currentOfficer.curp || currentOfficer.id}`,
            subject: 'Perfil del Policía',
            author: 'Sistema de Gestión de Personal',
            keywords: 'policía, perfil, datos',
            creator: 'SSCTIZAYUCA'
        });
        
        // Add logo
        const logo = new Image();
        logo.src = 'img/LOGOSCC.png';
        
        // Wait for logo to load
        await new Promise((resolve) => {
            if (logo.complete) {
                resolve();
            } else {
                logo.onload = resolve;
            }
        });
        
        // Add header with logo and title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        
        // Add logo (width: 40, height: auto, maintain aspect ratio)
        const logoWidth = 40;
        const logoHeight = (logo.height * logoWidth) / logo.width;
        doc.addImage(logo, 'JPEG', 15, 10, logoWidth, logoHeight);
        
        // Add header text
        doc.setFontSize(16);
        doc.text('SSC TIZAYUCA', 105, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.text('SECRETARÍA DE SEGURIDAD CIUDADANA', 100, 22, { align: 'center' });
        doc.setFontSize(18);
        doc.text('PERFIL DEL POLICÍA', 105, 32, { align: 'center' });
        
        // Add generation date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-MX')}`, 190, 15, { align: 'right' });
        
        // Initial y position for content
        let yPos = 50;
        
        // Add personal information section
        yPos = addSection(doc, 'INFORMACIÓN PERSONAL', yPos);
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        
        // Add personal information rows
        yPos = addInfoRow(doc, 'Nombre Completo', 
            `${currentOfficer.nombres || ''} ${currentOfficer.apellido_paterno || ''} ${currentOfficer.apellido_materno || ''}`.trim(), 
            yPos
        );
        yPos = addInfoRow(doc, 'CURP', currentOfficer.curp || 'N/A', yPos);
        yPos = addInfoRow(doc, 'Grado/Cargo', currentOfficer.grado_cargo || 'N/A', yPos);
        yPos = addInfoRow(doc, 'Fecha de Ingreso', formatDate(currentOfficer.fecha_ingreso), yPos);
        yPos = addInfoRow(doc, 'Escolaridad', currentOfficer.escolaridad || 'N/A', yPos);
        
        // Add Evaluaciones section if exists
        if (currentOfficer.evaluaciones && currentOfficer.evaluaciones.length > 0) {
            yPos = addSection(doc, 'EVALUACIONES DE CONTROL', yPos);
            
            // Define table columns
            const headers = ['CUIP', 'Tipo de Evaluación', 'Fecha'];
            const columnWidths = [40, 100, 40];
            
            // Prepare table data
            const rows = currentOfficer.evaluaciones.map(eval => [
                eval.cuip || 'N/A',
                eval.tipo_evaluacion || 'N/A',
                formatDate(eval.fecha_evaluacion)
            ]);
            
            // Add table
            yPos = addTable(doc, headers, rows, columnWidths, yPos);
        }
        
        // Add Formación section if exists
        if (currentOfficer.formacion && currentOfficer.formacion.length > 0) {
            yPos = addSection(doc, 'FORMACIÓN INICIAL', yPos);
            
            // Define table columns
            const headers = ['Curso', 'Tipo', 'Institución', 'Fecha', 'Resultado'];
            const columnWidths = [50, 30, 50, 30, 30];
            
            // Prepare table data
            const rows = currentOfficer.formacion.map(item => [
                item.curso || 'N/A',
                item.tipo || 'N/A',
                item.institucion || 'N/A',
                formatDate(item.fecha),
                item.resultado || 'N/A'
            ]);
            
            // Add table
            yPos = addTable(doc, headers, rows, columnWidths, yPos);
        }
        
        // Add Historial Laboral section if exists
        if (currentOfficer.historial && currentOfficer.historial.length > 0) {
            yPos = addSection(doc, 'HISTORIAL LABORAL', yPos + 10);
            
            // Define table headers and data
            const headers = ['CUP', 'Vigencia CUP', 'Función', 'F. Ingreso', 'F. Baja'];
            const data = currentOfficer.historial.map(item => [
                item.cup || 'N/A',
                formatDate(item.cup_vigencia),
                item.funcion || 'N/A',
                formatDate(item.fecha_ingreso),
                formatDate(item.fecha_baja)
            ]);
            
            yPos = addTable(doc, headers, data, [30, 30, 60, 30, 30], yPos);
        }
        
        // Add Incapacidades/Ausencias section if exists
        try {
            if (currentOfficer.incapacidades && currentOfficer.incapacidades.length > 0) {
                yPos = addSection(doc, 'INCAPACIDADES/AUSENCIAS', yPos + 10);
                
                const headers = [
                    'Motivo',
                    'Fechas',
                    'Trayectoria Institucional',
                ];
                const data = currentOfficer.incapacidades.map(item => [
                    item.motivo || 'N/A',
                    item.fechas || 'N/A',
                    item.trayectoria_institucional || 'N/A',
                ]);
                
                yPos = addTable(doc, headers, data, [60, 40, 80], yPos);
            }
        } catch (error) {
            console.error('Error generando sección de incapacidades/ausencias:', error);
        }
        
        // Add Estímulos/Sanciones section if exists
        try {
            if (currentOfficer.estimulos && currentOfficer.estimulos.length > 0) {
                yPos = addSection(doc, 'ESTÍMULOS/SANCIONES', yPos + 10);
                
                const headers = ['Tipo', 'Fecha', 'Fundamento', 'Motivo', 'Resultado', 'Cumplimiento'];
                const data = currentOfficer.estimulos.map(item => [
                    item.tipo || 'N/A',
                    formatDate(item.fecha),
                    item.fundamento || 'N/A',
                    item.motivo || 'N/A',
                    item.resultado || 'N/A',
                    item.cumplimiento || 'N/A',
                ]);
            
                yPos = addTable(doc, headers, data, [25, 25, 40, 40, 30, 30], yPos);
            }
        } catch (error) {
            console.error('Error generando sección de estímulos/sanciones:', error);
        }
        
        // Add Separación de Servicio section if exists
        try {
            if (currentOfficer.separacion && currentOfficer.separacion.length > 0) {
                yPos = addSection(doc, 'SEPARACIÓN DE SERVICIO', yPos + 10);
                
                const headers = ['Motivo', 'Fecha de Baja'];
                const data = currentOfficer.separacion.map(item => [
                    item.motivo || 'N/A',
                    formatDate(item.fecha_baja)
                ]);
                
                yPos = addTable(doc, headers, data, [120, 60], yPos);
            }
        } catch (error) {
            console.error('Error generando sección de separación de servicio:', error);
        }

        // Add page numbers
        try {
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                const pageText = `Página ${i} de ${totalPages}`;
                // Calculate text width and position manually for right alignment
                const textWidth = doc.getTextWidth(pageText);
                const pageWidth = doc.internal.pageSize.width;
                doc.text(pageText, pageWidth - textWidth - 20, 287);
            }
            
            // Save the PDF
            doc.save(`perfil_policia_${currentOfficer.curp || currentOfficer.id}.pdf`);
        } catch (saveError) {
            console.error('Error al guardar el PDF:', saveError);
            throw new Error('Error al guardar el archivo PDF');
        }
    } catch (error) {
        console.error('Error al generar el PDF:', error);
        alert('Ocurrió un error al generar el PDF. Por favor, inténtelo de nuevo.');
    }
}


// Las funciones auxiliares ya están definidas anteriormente en el archivo