export function initEvaluacionDesempeno() {
    const container = document.querySelector('.desempeno-container');
    if (!container) return;

    const searchInput = container.querySelector('#search-personal-desempeno');
    const searchResults = container.querySelector('#search-results-desempeno');
    const selectedPersonalCard = container.querySelector('#selected-personal-desempeno');
    const formsContainer = container.querySelector('#forms-container-desempeno');
    const tabs = container.querySelectorAll('.tab-link-desempeno');
    const contents = container.querySelectorAll('.tab-content-desempeno');
    const cupInput = container.querySelector('#cup');
    const cupVigenciaInput = container.querySelector('#cup_vigencia');
    const historialFieldset = container.querySelector('#historial-laboral-fieldset');
    const otherFieldsets = container.querySelectorAll('.form-fieldset-desempeno');

    let selectedPersonalId = null;

    // Function to enable/disable all form fields in the dependent fieldsets
    const setDependentFormsEnabled = (enabled) => {
        otherFieldsets.forEach(fieldset => {
            // Enable/disable all form controls within the fieldset
            const formControls = fieldset.querySelectorAll('input, select, textarea, button');
            formControls.forEach(control => {
                // Don't disable the fieldset itself, just its controls
                control.disabled = !enabled;
            });
            
            // Also enable/disable the fieldset for accessibility
            fieldset.disabled = !enabled;
        });
        
        // Update the UI to reflect the enabled/disabled state
        const tabLinks = document.querySelectorAll('.tab-link-desempeno:not(:first-child)');
        tabLinks.forEach(tab => {
            tab.style.pointerEvents = enabled ? 'auto' : 'none';
            tab.style.opacity = enabled ? '1' : '0.6';
        });
    };

    // Initially, disable everything
    historialFieldset.disabled = true;
    setDependentFormsEnabled(false);
    cupInput.disabled = true;
    cupVigenciaInput.disabled = true;

    // Search functionality
    searchInput.addEventListener('input', async () => {
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults.innerHTML = '';
            searchResults.style.display = 'none';
            return;
        }

        try {
            const response = await fetch(`/api/personal/search?query=${encodeURIComponent(query)}`);
            const data = await response.json();
            searchResults.innerHTML = '';
            if (data.success && data.data.length > 0) {
                data.data.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'search-result-item';
                    item.textContent = `${p.nombres} ${p.apellido_paterno}`;
                    item.dataset.personal = JSON.stringify(p);
                    searchResults.appendChild(item);
                });
                searchResults.style.display = 'block';
            } else {
                searchResults.style.display = 'none';
            }
        } catch (error) {
            console.error('Error searching personal:', error);
        }
    });

    searchResults.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result-item');
        if (item) {
            const personal = JSON.parse(item.dataset.personal);
            selectedPersonalId = personal.id;
            selectedPersonalCard.textContent = `Policia Seleccionado: ${personal.nombres} ${personal.apellido_paterno}`;
            searchResults.style.display = 'none';
            searchInput.value = '';
            historialFieldset.disabled = false;
            cupInput.disabled = false;
            cupVigenciaInput.disabled = false;
            validateCupAndVigencia(); // Re-validate when a new person is selected
        }
    });

    // Create status message element if it doesn't exist
    let statusMessage = document.getElementById('cup-status-message');
    if (!statusMessage) {
        statusMessage = document.createElement('div');
        statusMessage.id = 'cup-status-message';
        statusMessage.style.marginTop = '10px';
        statusMessage.style.padding = '8px';
        statusMessage.style.borderRadius = '4px';
        statusMessage.style.textAlign = 'center';
        statusMessage.style.fontWeight = 'bold';
        cupVigenciaInput.parentNode.insertBefore(statusMessage, cupVigenciaInput.nextSibling);
    }

    // CUP and Vigencia Validation
    const validateCupAndVigencia = (showAlert = true) => {
        // Clear previous status
        statusMessage.textContent = '';
        statusMessage.style.display = 'none';

        if (!selectedPersonalId) {
            setDependentFormsEnabled(false);
            if (showAlert) alert('Por favor seleccione un personal primero');
            return false;
        }

        const isCupNumberValid = cupInput.value.trim().length === 16;
        const vigenciaDateStr = cupVigenciaInput.value;

        if (!isCupNumberValid) {
            setDependentFormsEnabled(false);
            if (showAlert) alert('El CUP debe tener exactamente 16 caracteres');
            return false;
        }

        if (!vigenciaDateStr) {
            setDependentFormsEnabled(false);
            if (showAlert) alert('Por favor ingrese la fecha de vencimiento del CUP');
            return false;
        }
        
        try {
            // Parse the input date (format: YYYY-MM-DD)
            const vigenciaDate = new Date(vigenciaDateStr);
            
            // Check if the date is valid
            if (isNaN(vigenciaDate.getTime())) {
                throw new Error('Fecha inválida');
            }
            
            // Check if the year is 2023 or later
            const isVigente = vigenciaDate.getFullYear() >= 2023;
            
            // Update status message
            statusMessage.style.display = 'block';
            if (isVigente) {
                statusMessage.textContent = 'CUP VIGENTE';
                statusMessage.style.backgroundColor = '#d4edda';
                statusMessage.style.color = '#155724';
                statusMessage.style.border = '1px solid #c3e6cb';
                setDependentFormsEnabled(true);
            } else {
                statusMessage.textContent = 'CUP VENCIDO';
                statusMessage.style.backgroundColor = '#f8d7da';
                statusMessage.style.color = '#721c24';
                statusMessage.style.border = '1px solid #f5c6cb';
                setDependentFormsEnabled(false);
                if (showAlert) alert('El CUP ha vencido. La fecha debe ser del año 2023 en adelante.');
            }
            
            return isVigente;
            
        } catch (error) {
            console.error('Error validating date:', error);
            statusMessage.style.display = 'block';
            statusMessage.textContent = 'Error al validar la fecha';
            statusMessage.style.backgroundColor = '#f8d7da';
            statusMessage.style.color = '#721c24';
            setDependentFormsEnabled(false);
            if (showAlert) alert('Error al validar la fecha. Por favor verifique el formato.');
            return false;
        }
    };

    // Event listeners for real-time validation
    cupInput.addEventListener('input', () => validateCupAndVigencia(false));
    cupVigenciaInput.addEventListener('input', () => validateCupAndVigencia(false));
    cupVigenciaInput.addEventListener('change', () => validateCupAndVigencia(true));

    // Handle form submissions for all forms
    document.querySelectorAll('form[data-personal-id]').forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!selectedPersonalId) {
                e.preventDefault();
                alert('Por favor seleccione un personal primero');
                return false;
            }

            // Add the personal ID to the form data if it doesn't exist
            if (!this.querySelector('input[name="personal_id"]')) {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'personal_id';
                input.value = selectedPersonalId;
                this.appendChild(input);
            }

            // Validate CUP and vigencia for the main form
            if (form.id === 'historial-laboral-form' && !validateCupAndVigencia(true)) {
                e.preventDefault();
                return false;
            }

            return true;
        });
    });

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            contents.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            container.querySelector(`#${tab.dataset.tab}-form`).classList.add('active');
        });
    });

    // Form submission
    formsContainer.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!selectedPersonalId) {
            alert('Por favor, seleccione un miembro del personal primero.');
            return;
        }

        const form = e.target;
        const formData = new FormData(form);
        formData.append('personal_id', selectedPersonalId);

        const endpoint = `/api/evaluacion-desempeno/${form.id.replace('-form', '')}`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                alert(result.message);
                form.reset();
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Error de conexión al guardar los datos.');
        }
    });
}
