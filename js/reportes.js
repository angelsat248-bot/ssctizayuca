export function initReportes() {
    const reportsContainer = document.querySelector('.reports-container');
    if (!reportsContainer) return;

    const tabs = reportsContainer.querySelectorAll('.tab-link');
    const contents = reportsContainer.querySelectorAll('.tab-content');
    const searchInput = reportsContainer.querySelector('#search-input');
    const searchButton = reportsContainer.querySelector('#search-button');
    const resultsTableBody = reportsContainer.querySelector('#results-table tbody');
    const statusSummaryContainer = reportsContainer.querySelector('#status-summary');

    // Tab switching logic
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            contents.forEach(item => item.classList.remove('active'));

            tab.classList.add('active');
            const target = document.getElementById(tab.dataset.tab);
            if (target) {
                target.classList.add('active');
            }
        });
    });

    // Search function
    const performSearch = async () => {
        const searchTerm = searchInput.value.trim();
        if (searchTerm === '') {
            resultsTableBody.innerHTML = '<tr><td colspan="5">Por favor, ingrese un término de búsqueda.</td></tr>';
            return;
        }

        try {
                        const response = await fetch(`/api/reportes/search?query=${encodeURIComponent(searchTerm)}`);
            const data = await response.json();

            resultsTableBody.innerHTML = ''; // Clear previous results

            if (data.success && data.data.length > 0) {
                data.data.forEach(personal => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${personal.nombre_completo}</td>
                        <td>${personal.curp}</td>
                        <td>${personal.cuip || 'N/A'}</td>
                        <td><span class="status-badge status-${personal.estatus.toLowerCase()}">${personal.estatus}</span></td>
                        <td>
                            <button class="action-button ${personal.estatus.toLowerCase()}" data-id="${personal.id}" data-estatus="${personal.estatus}">
                                ${personal.estatus === 'Activo' ? 'Desactivar' : 'Activar'}
                            </button>
                        </td>
                    `;
                    resultsTableBody.appendChild(row);
                });
            } else {
                resultsTableBody.innerHTML = '<tr><td colspan="5">No se encontraron resultados.</td></tr>';
            }
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            resultsTableBody.innerHTML = '<tr><td colspan="5">Error al realizar la búsqueda.</td></tr>';
        }
    };

    // Event listener for search button
    searchButton.addEventListener('click', performSearch);

    // Event listener for Enter key in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Function to load and display the status summary
    const loadAndDisplaySummary = async () => {
        try {
            const response = await fetch('/api/reportes/summary');
            const data = await response.json();

            if (data.success && statusSummaryContainer) {
                const summary = data.data;
                statusSummaryContainer.innerHTML = `
                    <h4>Resumen de Estatus</h4>
                    <div class="status-summary-grid">
                        <div class="summary-box active">
                            <h3 style="color: white;">PoliciasActivos</h3>
                            <div class="count">${summary.Activo.count}</div>
                            <span class="name-list-toggle" data-target="active-names">Ver Lista</span>
                            <ul class="name-list" id="active-names">
                                ${summary.Activo.names.map(name => `<li>${name}</li>`).join('') || '<li>No hay personal activo.</li>'}
                            </ul>
                        </div>
                        <div class="summary-box inactive">
                            <h3 style="color: white;">Policias Inactivos</h3>
                            <div class="count">${summary.Inactivo.count}</div>
                            <span class="name-list-toggle" data-target="inactive-names">Ver Lista</span>
                            <ul class="name-list" id="inactive-names">
                                ${summary.Inactivo.names.map(name => `<li>${name}</li>`).join('') || '<li>No hay personal inactivo.</li>'}
                            </ul>
                        </div>
                    </div>
                `;

                reportsContainer.querySelectorAll('.name-list-toggle').forEach(toggle => {
                    toggle.addEventListener('click', () => {
                        const targetId = toggle.dataset.target;
                        const nameList = reportsContainer.querySelector(`#${targetId}`);
                        if (nameList) {
                            const isVisible = nameList.style.display === 'block';
                            nameList.style.display = isVisible ? 'none' : 'block';
                            toggle.textContent = isVisible ? 'Ver Lista' : 'Ocultar Lista';
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Error loading status summary:', error);
            if (statusSummaryContainer) {
                statusSummaryContainer.innerHTML = '<p>Error al cargar el resumen.</p>';
            }
        }
    };

    // Update status function
    const updateStatus = async (id, newStatus) => {
        try {
            const response = await fetch(`/api/reportes/status`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, estatus: newStatus })
                });

            const data = await response.json();

            if (data.success) {
                alert('Estatus actualizado correctamente.');
                performSearch(); // Refresh search results
                loadAndDisplaySummary(); // Refresh summary
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error de conexión al actualizar estatus');
        }
    };

    // Initial load
    loadAndDisplaySummary();

    // Event listener for status toggle buttons (using event delegation)
    resultsTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('action-button')) {
            const button = e.target;
            const personalId = button.dataset.id;
            const currentStatus = button.dataset.estatus;
            const newStatus = currentStatus === 'Activo' ? 'Inactivo' : 'Activo';

            try {
                const response = await fetch('/api/reportes/status', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ id: personalId, estatus: newStatus })
                });

                const result = await response.json();

                if (result.success) {
                    // Update the UI optimistically
                    const statusBadge = button.closest('tr').querySelector('.status-badge');
                    button.dataset.estatus = newStatus;
                    button.textContent = newStatus === 'Activo' ? 'Desactivar' : 'Activar';
                    
                    button.classList.remove('activo', 'inactivo');
                    button.classList.add(newStatus.toLowerCase());

                    if (statusBadge) {
                        statusBadge.textContent = newStatus;
                        statusBadge.className = `status-badge status-${newStatus.toLowerCase()}`;
                    }
                    alert('Estatus actualizado correctamente.');
                } else {
                    alert(`Error al actualizar el estatus: ${result.message}`);
                }
            } catch (error) {
                console.error('Error al cambiar el estatus:', error);
                alert('Error de conexión al intentar cambiar el estatus.');
            }
        }
    });
}
