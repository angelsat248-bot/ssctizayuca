// Importar configuración compartida
import { API_BASE_URL, showNotification } from './config.js';

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
    // Inicialización de la aplicación
    initApp();
    
    // Cargar datos al abrir la pestaña de datos generales
    const datosGeneralesTab = document.querySelector('[data-tab="datos-generales"]');
    if (datosGeneralesTab) {
        datosGeneralesTab.addEventListener('click', loadPersonalData);
    }
});

// Función para buscar personal
async function searchPersonal(query) {
    try {
        const response = await fetch(`${API_BASE_URL}/personal/search?query=${encodeURIComponent(query)}`);
        const result = await response.json();
        
        if (!response.ok) {
            const errorMessage = result.message || 'Error al buscar personal';
            if (result.error) {
                console.error('Error del servidor:', result.error);
            }
            throw new Error(errorMessage);
        }
        
        return result.data || [];
    } catch (error) {
        console.error('Error en la búsqueda:', error);
        
        // Mostrar un mensaje más amigable para el usuario
        let errorMessage = 'Error al realizar la búsqueda';
        if (error.message.includes('timeout')) {
            errorMessage = 'La búsqueda está tardando demasiado. Por favor, intente nuevamente.';
        } else if (error.message.includes('NetworkError')) {
            errorMessage = 'No se pudo conectar al servidor. Verifique su conexión a internet.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
        return [];
    }
}

// Función para mostrar los resultados de búsqueda
function displaySearchResults(results) {
    const resultsBody = document.getElementById('results-body');
    const searchResults = document.getElementById('search-results');
    
    if (!results || results.length === 0) {
        resultsBody.innerHTML = `
            <tr>
                <td colspan="7" class="no-results">No se encontraron resultados</td>
            </tr>
        `;
        searchResults.style.display = 'block';
        return;
    }
    
    const rows = results.map(person => {
        // Asegurarse de que la ruta de la imagen sea correcta
        let imagePath = 'img/LOGOSCC.png';
        if (person.foto_perfil) {
            // Eliminar cualquier doble barra o prefijo de ruta que pueda causar problemas
            const cleanPath = person.foto_perfil.replace(/^\/+|\/+$/g, '');
            // Si la ruta ya incluye 'uploads', no la dupliquemos
            if (cleanPath.includes('uploads/')) {
                imagePath = `/${cleanPath}`;
            } else {
                imagePath = `/uploads/${cleanPath}`;
            }
        }
        
        return `
        <tr>
            <td>
                <img src="${imagePath}" 
                     alt="Foto" class="employee-photo" 
                     onerror="this.onerror=null; this.src='img/LOGOSCC.png';">
            </td>
            <td>${person.nombres || ''}</td>
            <td>${[person.apellido_paterno, person.apellido_materno].filter(Boolean).join(' ')}</td>
            <td>${person.grado_cargo || 'N/A'}</td>
            <td>${person.curp || 'N/A'}</td>
            <td>${person.telefono_contacto || 'N/A'}</td>
            <td>
                <button class="view-details-btn" data-id="${person.id}">
                    <i class="fas fa-eye"></i> Ver
                </button>
            </td>
        </tr>
    `;
    }).join('');
    
    resultsBody.innerHTML = rows;
    searchResults.style.display = 'block';
    
    // Agregar manejadores de eventos a los botones de ver detalles
    document.querySelectorAll('.view-details-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            if (id) {
                loadPersonalDataById(id);
                // Desplazarse al formulario
                document.getElementById('form-datos-generales').scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// Función para inicializar la búsqueda
function initSearch() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-query');
    
    if (!searchForm || !searchInput) return;
    
    // Buscar al enviar el formulario
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = searchInput.value.trim();
        
        if (query.length < 2) {
            showNotification('Por favor ingrese al menos 2 caracteres para buscar', 'warning');
            return;
        }
        
        const results = await searchPersonal(query);
        displaySearchResults(results);
    });
    
    // Opcional: Buscar mientras se escribe (descomentar si se desea)
    /*
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            document.getElementById('search-results').style.display = 'none';
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            const results = await searchPersonal(query);
            displaySearchResults(results);
        }, 500);
    });
    */
}

// Función para inicializar la aplicación
function initApp() {
    console.log('Inicializando aplicación...');
    
    // Inicializar pestañas primero
    initTabs();
    
    // Manejar la pestaña activa basada en el hash de la URL
    const initialTab = window.location.hash ? window.location.hash.substring(1) : 'datos-generales';
    console.log('Pestaña inicial:', initialTab);
    
    // Mostrar la pestaña activa
    showTab(initialTab);
    
    // Inicializar búsqueda
    initSearch();
    
    // Inicializar formulario de datos generales
    initDatosGeneralesForm();
    
    // Inicializar carga de imágenes
    initImageUpload();
    
    // Cargar contenido inicial basado en la pestaña activa
    handleTabContent(initialTab);
    
    // Marcar la pestaña activa en la navegación
    updateActiveTab(initialTab);
}

// Función para actualizar la pestaña activa en la navegación
function updateActiveTab(activeTabId) {
    const tabLinks = document.querySelectorAll('.main-nav li');
    tabLinks.forEach(link => {
        if (link.getAttribute('data-tab') === activeTabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// Función para inicializar la navegación por pestañas
function initTabs() {
    const tabLinks = document.querySelectorAll('.main-nav li');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Obtener el ID de la pestaña a mostrar
            const tabId = this.getAttribute('data-tab');
            
            // Mostrar la pestaña seleccionada
            showTab(tabId);
            
            // Actualizar la clase activa en los enlaces de las pestañas
            tabLinks.forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            
            // Cargar contenido dinámico según la pestaña seleccionada
            handleTabContent(tabId);
        });
    });
}

// Función para manejar el contenido dinámico de las pestañas
function handleTabContent(tabId) {
    console.log(`Cambiando a la pestaña: ${tabId}`);
    
    // Actualizar la URL con el hash de la pestaña
    window.location.hash = tabId;
    
    // Ocultar todos los contenidos de pestañas primero
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Mostrar el contenido de la pestaña seleccionada
    const activeTab = document.getElementById(tabId);
    if (activeTab) {
        activeTab.classList.add('active');
    } else {
        console.error(`No se encontró el contenido para la pestaña: ${tabId}`);
    }
    
    // Manejar contenido específico de cada pestaña
    switch(tabId) {
        case 'evaluaciones-control':
            console.log('Cargando módulo de evaluaciones de control...');
            // Cargar el módulo de evaluaciones de control dinámicamente
            import('./evaluaciones-control.js')
                .then(module => {
                    console.log('Módulo de evaluaciones cargado correctamente');
                    // Inicializar el módulo si tiene una función de inicialización
                    if (typeof module.initEvaluacionesControl === 'function') {
                        console.log('Inicializando módulo de evaluaciones...');
                        module.initEvaluacionesControl();
                    } else {
                        console.error('La función initEvaluacionesControl no está definida en el módulo');
                    }
                })
                .catch(error => {
                    console.error('Error al cargar el módulo de evaluaciones:', error);
                    showNotification('Error al cargar el módulo de evaluaciones', 'error');
                });
            break;
            
        case 'datos-generales':
            // Cargar datos generales si no están cargados
            loadPersonalData();
            break;
            
        case 'formacion-inicial':
            loadTabContent(tabId, 'formacion-inicial.html', './formacion-inicial.js', 'initFormacionInicial');
            break;

        // Agregar más casos para otras pestañas cuando sea necesario
        case 'competencias-basicas':
            loadTabContent(tabId, 'competencias-basicas.html', './competencias-basicas.js', 'initCompetenciasBasicas');
            break;

        case 'evaluacion-desempeno':
            loadTabContent(tabId, 'evaluacion-desempeno.html', './evaluacion-desempeno.js', 'initEvaluacionDesempeno');
            break;

        case 'reportes':
            loadTabContent(tabId, 'reportes.html', './reportes.js', 'initReportes');
            break;
    }
}

// Función auxiliar para obtener el ícono de la pestaña
function getTabIcon(tabId) {
    const icons = {
        'datos-generales': 'fa-user',
        'evaluaciones-control': 'fa-clipboard-check',
        'formacion-inicial': 'fa-graduation-cap',
        'competencias-basicas': 'fa-tasks',
        'evaluacion-desempeno': 'fa-chart-line',
        'reportes': 'fa-file-alt'
    };
    return icons[tabId] || 'fa-folder';
}

// Función auxiliar para obtener el título de la pestaña
function getTabTitle(tabId) {
    const titles = {
        'datos-generales': 'Datos Generales',
        'evaluaciones-control': 'Evaluaciones de Control',
        'formacion-inicial': 'Formación Inicial',
        'competencias-basicas': 'Competencias Básicas',
        'evaluacion-desempeno': 'Evaluación de Desempeño',
        'reportes': 'Reportes'
    };
    return titles[tabId] || tabId;
}

// Función para cargar contenido de pestañas dinámicamente
async function loadTabContent(tabId, htmlFile, jsModule, initFunction) {
    const tabContent = document.getElementById(tabId);
    if (!tabContent) {
        console.error(`Contenedor para la pestaña ${tabId} no encontrado.`);
        return;
    }

    // Evitar recargar si el contenido ya está presente
    if (tabContent.dataset.loaded === 'true') {
        console.log(`Contenido para ${tabId} ya cargado.`);
        return;
    }

    try {
        // Cargar el HTML
        const response = await fetch(htmlFile);
        if (!response.ok) {
            throw new Error(`No se pudo cargar ${htmlFile}`);
        }
        const html = await response.text();
        tabContent.innerHTML = html;

        // Cargar el módulo JS
        const module = await import(jsModule);
        if (module && typeof module[initFunction] === 'function') {
            module[initFunction]();
        } else {
            console.warn(`La función de inicialización ${initFunction} no se encontró en ${jsModule}`);
        }
        
        tabContent.dataset.loaded = 'true';

    } catch (error) {
        console.error(`Error al cargar la pestaña ${tabId}:`, error);
        tabContent.innerHTML = `<div class="error-loading"><p>Error al cargar el contenido. Por favor, intente de nuevo.</p></div>`;
        showNotification(`Error al cargar la pestaña ${getTabTitle(tabId)}`, 'error');
    }
}

// Función para mostrar una pestaña específica
function showTab(tabId) {
    // Ocultar todos los contenidos de las pestañas
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Mostrar el contenido de la pestaña seleccionada
    const selectedTab = document.getElementById(tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// Función para inicializar el formulario de datos generales
function initDatosGeneralesForm() {
    const form = document.getElementById('form-datos-generales');
    let currentPersonalId = null;
    
    if (form) {
        // Manejar el envío del formulario
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // Obtener el botón de envío
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
            
            try {
                // Validar el formulario
                if (!validateForm(this)) {
                    return;
                }
                
                // Mostrar indicador de carga
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
                }
                
                // Obtener los datos del formulario
                const formData = getFormData(this);
                
                // Preparar los datos para enviar al servidor
                const personalData = {
                    apellido_paterno: formData.apellidoPaterno,
                    apellido_materno: formData.apellidoMaterno,
                    nombres: formData.nombres,
                    fecha_nacimiento: formData.fechaNacimiento,
                    fecha_ingreso: formData.fechaIngreso,
                    grado_cargo: formData.gradoCargo,
                    sexo: formData.sexo,
                    curp: formData.curp,
                    escolaridad: formData.escolaridad,
                    telefono_contacto: formData.telefono,
                    foto_perfil: formData.foto || null
                };
                
                // Determinar si es una actualización o creación
                const url = currentPersonalId 
                    ? `${API_BASE_URL}/personal/${currentPersonalId}`
                    : `${API_BASE_URL}/personal`;
                
                const method = currentPersonalId ? 'PUT' : 'POST';
                
                // Enviar datos al servidor
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(personalData)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Actualizar el ID actual si es un nuevo registro
                    if (!currentPersonalId && result.data && result.data.id) {
                        currentPersonalId = result.data.id;
                        // Actualizar la URL con el ID para futuras actualizaciones
                        window.history.pushState({}, '', `?id=${currentPersonalId}`);
                    }
                    
                    showNotification(
                        currentPersonalId 
                            ? 'Datos actualizados correctamente' 
                            : 'Datos guardados correctamente', 
                        'success'
                    );
                    
                    // Recargar los datos para asegurar que todo esté sincronizado
                    if (currentPersonalId) {
                        await loadPersonalDataById(currentPersonalId);
                    }
                } else {
                    throw new Error(result.message || 'Error al guardar los datos');
                }
            } catch (error) {
                console.error('Error al guardar los datos:', error);
                showNotification(error.message || 'Error al guardar los datos', 'error');
            } finally {
                // Restaurar el botón
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
        
        // Agregar validación en tiempo real para el CURP
        const curpInput = document.getElementById('curp');
        if (curpInput) {
            curpInput.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        }
        
        // Agregar validación en tiempo real para el teléfono
        const telefonoInput = document.getElementById('telefono');
        if (telefonoInput) {
            telefonoInput.addEventListener('input', function() {
                this.value = this.value.replace(/\D/g, '').substring(0, 10);
            });
        }
    }
}

// Función para cargar los datos del personal por ID
async function loadPersonalDataById(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/personal/${id}`);
        
        if (response.ok) {
            const result = await response.json();
            
            if (result.success && result.data) {
                const personal = result.data;
                const form = document.getElementById('form-datos-generales');
                
                // Llenar el formulario con los datos del personal
                if (form) {
                    form.querySelector('#apellidoPaterno').value = personal.apellido_paterno || '';
                    form.querySelector('#apellidoMaterno').value = personal.apellido_materno || '';
                    form.querySelector('#nombres').value = personal.nombres || '';
                    form.querySelector('#fechaNacimiento').value = personal.fecha_nacimiento ? personal.fecha_nacimiento.split('T')[0] : '';
                    form.querySelector('#fechaIngreso').value = personal.fecha_ingreso ? personal.fecha_ingreso.split('T')[0] : '';
                    form.querySelector('#gradoCargo').value = personal.grado_cargo || '';
                    
                    // Establecer el sexo seleccionado
                    const sexoRadios = document.getElementsByName('sexo');
                    for (const radio of sexoRadios) {
                        if (radio.value === personal.sexo) {
                            radio.checked = true;
                            break;
                        }
                    }
                    
                    form.querySelector('#curp').value = personal.curp || '';
                    form.querySelector('#escolaridad').value = personal.escolaridad || '';
                    form.querySelector('#telefono').value = personal.telefono_contacto || '';
                    
                    // Mostrar la foto de perfil si existe
                    if (personal.foto_perfil) {
                        const photoPreview = document.getElementById('fotoPreview');
                        const fileNameSpan = document.getElementById('fileName');
                        
                        if (photoPreview) {
                            photoPreview.src = personal.foto_perfil.startsWith('data:') 
                                ? personal.foto_perfil 
                                : personal.foto_perfil.startsWith('http')
                                    ? personal.foto_perfil
                                    : `${API_BASE_URL}${personal.foto_perfil}`;
                        }
                        
                        if (fileNameSpan) {
                            fileNameSpan.textContent = personal.foto_perfil.split('/').pop() || 'Imagen cargada';
                        }
                    }
                }
                
                return personal;
            }
        }
        
        throw new Error('No se pudieron cargar los datos del policia');
    } catch (error) {
        console.error('Error al cargar los datos del policia:', error);
        showNotification('Error al cargar los datos del policia', 'error');
        return null;
    }
}

// Función para cargar los datos del personal desde la URL
async function loadPersonalData() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
        return await loadPersonalDataById(id);
    }
    
    return null;
}

// Función para subir una imagen al servidor
async function uploadImage(file) {
    const formData = new FormData();
    formData.append('foto', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            return result.filePath;
        } else {
            throw new Error(result.message || 'Error al subir la imagen');
        }
    } catch (error) {
        console.error('Error al subir la imagen:', error);
        throw error;
    }
}

// Función para inicializar la carga de imágenes
function initImageUpload() {
    const fileInput = document.getElementById('foto');
    const fileNameSpan = document.getElementById('fileName');
    const photoPreview = document.getElementById('fotoPreview');
    
    if (fileInput && fileNameSpan && photoPreview) {
        fileInput.addEventListener('change', async function(e) {
            const file = this.files[0];
            
            if (file) {
                // Mostrar indicador de carga
                const originalBtnText = this.nextElementSibling.textContent;
                this.nextElementSibling.disabled = true;
                this.nextElementSibling.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subiendo...';
                
                try {
                    // Validar el tipo de archivo
                    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
                    if (!validTypes.includes(file.type)) {
                        showNotification('Por favor, seleccione una imagen válida (JPEG, PNG o GIF)', 'error');
                        this.value = '';
                        return;
                    }
                    
                    // Validar el tamaño del archivo (máximo 2MB)
                    const maxSize = 2 * 1024 * 1024; // 2MB
                    if (file.size > maxSize) {
                        showNotification('La imagen no debe superar los 2MB', 'error');
                        this.value = '';
                        return;
                    }
                    
                    // Subir la imagen al servidor
                    const filePath = await uploadImage(file);
                    
                    // Actualizar el campo de la foto en el formulario
                    const fotoInput = document.createElement('input');
                    fotoInput.type = 'hidden';
                    fotoInput.name = 'foto';
                    fotoInput.value = filePath;
                    
                    // Eliminar el campo anterior si existe
                    const existingFotoInput = document.querySelector('input[name="foto"]');
                    if (existingFotoInput) {
                        existingFotoInput.remove();
                    }
                    
                    document.getElementById('form-datos-generales').appendChild(fotoInput);
                    
                    // Mostrar el nombre del archivo
                    fileNameSpan.textContent = file.name;
                    
                    // Mostrar la vista previa de la imagen
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        photoPreview.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    
                    showNotification('Imagen subida correctamente', 'success');
                } catch (error) {
                    console.error('Error al procesar la imagen:', error);
                    this.value = '';
                    showNotification(error.message || 'Error al procesar la imagen', 'error');
                    
                    // Restablecer la vista previa
                    fileNameSpan.textContent = 'No se ha seleccionado ninguna imagen';
                    photoPreview.src = 'img/default-avatar.png';
                } finally {
                    // Restaurar el botón
                    if (this.nextElementSibling) {
                        this.nextElementSibling.disabled = false;
                        this.nextElementSibling.textContent = originalBtnText;
                    }
                }
            } else {
                // No se seleccionó ningún archivo
                fileNameSpan.textContent = 'No se ha seleccionado ninguna imagen';
                photoPreview.src = 'img/default-avatar.png';
            }
        });
    }
}

// Función para validar el formulario
function validateForm(form) {
    let isValid = true;
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
            
            // Mostrar mensaje de error
            const errorMsg = document.createElement('div');
            errorMsg.className = 'error-message';
            errorMsg.textContent = 'Este campo es obligatorio';
            
            // Insertar después del campo
            field.parentNode.insertBefore(errorMsg, field.nextSibling);
            
            // Eliminar el mensaje de error después de 3 segundos
            setTimeout(() => {
                if (errorMsg.parentNode) {
                    errorMsg.parentNode.removeChild(errorMsg);
                }
            }, 3000);
        } else {
            field.classList.remove('error');
            
            // Validación específica para el CURP
            if (field.id === 'curp') {
                const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[0-9A-Z]{2}$/;
                if (!curpRegex.test(field.value)) {
                    isValid = false;
                    showNotification('El CURP no tiene un formato válido', 'error');
                }
            }
            
            // Validación específica para el teléfono
            if (field.id === 'telefono') {
                const telefonoRegex = /^[0-9]{10}$/;
                if (!telefonoRegex.test(field.value)) {
                    isValid = false;
                    showNotification('El teléfono debe tener 10 dígitos', 'error');
                }
            }
        }
    });
    
    return isValid;
}

// Función para obtener los datos del formulario
function getFormData(form) {
    const formData = {};
    const formElements = form.elements;
    
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        
        // Solo procesar elementos con nombre que no sean botones
        if (element.name && element.type !== 'button' && element.type !== 'submit') {
            if (element.type === 'radio') {
                if (element.checked) {
                    formData[element.name] = element.value;
                }
            } else if (element.type === 'file') {
                // Para archivos, guardamos solo el nombre del archivo
                formData[element.name] = element.files.length > 0 ? element.files[0].name : '';
            } else {
                formData[element.name] = element.value;
            }
        }
    }
    
    return formData;
}

// Función para inicializar la pestaña de evaluaciones de control
function initEvaluacionesControlTab() {
    const evaluacionesControlTab = document.querySelector('[data-tab="evaluaciones-control"]');
    if (evaluacionesControlTab) {
        evaluacionesControlTab.addEventListener('click', () => {
            // Actualizar la URL con el hash de la pestaña
            window.location.hash = 'evaluaciones-control';
            
            // Cargar el módulo de evaluaciones de control dinámicamente
            import('./evaluaciones-control.js')
                .then(module => {
                    console.log('Módulo de evaluaciones cargado correctamente');
                    // Inicializar el módulo si tiene una función de inicialización
                    if (typeof module.initEvaluacionesControl === 'function') {
                        module.initEvaluacionesControl();
                    }
                })
                .catch(error => {
                    console.error('Error al cargar el módulo de evaluaciones:', error);
                    import('./config.js').then(module => module.showNotification('Error al cargar el módulo de evaluaciones', 'error'));
                });
        });
    }
}

// Agregar estilos para las notificaciones
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 4px;
        color: white;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        transform: translateX(120%);
        transition: transform 0.3s ease-in-out;
        max-width: 350px;
    }
    
    .notification.show {
        transform: translateX(0);
    }
    
    .notification.success {
        background-color: #43a047;
    }
    
    .notification.error {
        background-color: #e53935;
    }
    
    .notification.warning {
        background-color: #fb8c00;
    }
    
    .notification.info {
        background-color: #1e88e5;
    }
    
    .error-message {
        color: #e53935;
        font-size: 0.8rem;
        margin-top: 0.25rem;
    }
    
    input.error, select.error {
        border-color: #e53935 !important;
    }
`;

document.head.appendChild(notificationStyles);
