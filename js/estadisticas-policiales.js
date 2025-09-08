document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const searchInput = document.getElementById('buscar-policia');
    const searchButton = document.getElementById('btn-buscar');
    const btnVigencia2025 = document.getElementById('btn-vigencia-2025');
    const btnVigenciaMenor2025 = document.getElementById('btn-vigencia-menor-2025');
    const btnConPortacion = document.getElementById('btn-con-portacion');
    const btnSinPortacion = document.getElementById('btn-sin-portacion');
    const tablaCuerpo = document.getElementById('cuerpo-tabla');

    // Event Listeners
    searchButton.addEventListener('click', (e) => {
        e.preventDefault();
        const termino = searchInput.value.trim();
        if (termino) {
            buscarPolicias(termino);
        } else {
            buscarPolicias(''); // Búsqueda vacía para obtener todos los registros
        }
    });
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const termino = searchInput.value.trim();
            if (termino) {
                buscarPolicias(termino);
            } else {
                buscarPolicias(''); // Búsqueda vacía para obtener todos los registros
            }
        }
    });
    
    btnVigencia2025.addEventListener('click', () => filtrarPorVigencia('2025'));
    btnVigenciaMenor2025.addEventListener('click', () => filtrarPorVigencia('menor-2025'));
    btnConPortacion.addEventListener('click', () => filtrarPorPortacion(true));
    btnSinPortacion.addEventListener('click', () => filtrarPorPortacion(false));

    // Función para obtener el token JWT del almacenamiento local
    function getAuthToken() {
        return localStorage.getItem('token');
    }

    // Configuración común para las peticiones fetch
    const fetchConfig = (method = 'GET', body = null) => {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            }
        };
        
        if (body) {
            config.body = JSON.stringify(body);
        }
        
        return config;
    };

    // Functions
    async function buscarPolicias(termino = '') {
        try {
            console.log('Iniciando búsqueda con término:', termino);
            const url = termino 
                ? `/api/estadisticas/buscar?termino=${encodeURIComponent(termino)}`
                : '/api/estadisticas/buscar';
                
            console.log('URL de búsqueda:', url);
            const response = await fetch(url, fetchConfig());
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error en la respuesta:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(errorData.message || 'Error en la búsqueda');
            }
            
            const data = await response.json();
            console.log('Datos recibidos:', data);
            mostrarResultados(data);
        } catch (error) {
            console.error('Error en buscarPolicias:', error);
            alert(`Error al realizar la búsqueda: ${error.message}`);
        }
    }

    async function filtrarPorVigencia(tipo) {
        try {
            if (!['2025', 'menor-2025'].includes(tipo)) {
                throw new Error('Tipo de filtro de vigencia no válido');
            }
            
            console.log(`Filtrando por vigencia: ${tipo}`);
            const url = `/api/estadisticas/filtrar/vigencia?tipo=${tipo}`;
            console.log('URL de filtro de vigencia:', url);
            
            const response = await fetch(url, fetchConfig());
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error en la respuesta:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(errorData.message || 'Error al filtrar por vigencia');
            }
            
            const data = await response.json();
            console.log(`Datos de filtrado por vigencia (${tipo}):`, data);
            mostrarResultados(data);
        } catch (error) {
            console.error('Error en filtrarPorVigencia:', error);
            alert(`Error al filtrar por vigencia: ${error.message}`);
        }
    }

    async function filtrarPorPortacion(conPortacion) {
        try {
            console.log(`Filtrando por portación: ${conPortacion ? 'Con portación' : 'Sin portación'}`);
            const url = `/api/estadisticas/filtrar/portacion?conPortacion=${conPortacion}`;
            console.log('URL de filtro de portación:', url);
            
            const response = await fetch(url, fetchConfig());
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Error en la respuesta:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                });
                throw new Error(errorData.message || 'Error al filtrar por portación');
            }
            
            const data = await response.json();
            console.log(`Datos de filtrado por portación (${conPortacion}):`, data);
            mostrarResultados(data);
        } catch (error) {
            console.error('Error en filtrarPorPortacion:', error);
            alert(`Error al filtrar por portación: ${error.message}`);
        }
    }

    function mostrarResultados(data) {
        tablaCuerpo.innerHTML = '';
        
        if (data.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="7" class="text-center">No se encontraron resultados</td>';
            tablaCuerpo.appendChild(tr);
            return;
        }

        data.forEach(policia => {
            const tr = document.createElement('tr');
            
            // Añadir clases según las condiciones
            const fechaVigencia = new Date(policia.cup_vigencia);
            const anioVigencia = fechaVigencia.getFullYear();
            
            if (anioVigencia === 2025) {
                tr.classList.add('vencido-2025');
            } else if (fechaVigencia < new Date()) {
                tr.classList.add('vencido');
            }
            
            if (policia.portacion_armas_fuego) {
                tr.classList.add('con-portacion');
            } else {
                tr.classList.add('sin-portacion');
            }
            
            // Formatear la fecha
            const fechaFormateada = fechaVigencia.toLocaleDateString('es-MX');
            
            // Crear la fila con los datos
            tr.innerHTML = `
                <td>${policia.nombres || ''}</td>
                <td>${policia.apellido_paterno || ''}</td>
                <td>${policia.apellido_materno || ''}</td>
                <td>${policia.cup || ''}</td>
                <td class="${anioVigencia === 2025 ? 'vencimiento-2025' : ''}">${fechaFormateada}</td>
                <td>${policia.funcion || ''}</td>
                <td class="${policia.portacion_armas_fuego ? 'portacion-si' : 'portacion-no'}">
                    ${policia.portacion_armas_fuego ? '[V]' : '[]'}
                </td>
            `;
            
            tablaCuerpo.appendChild(tr);
        });
    }

    // Cargar todos los datos al iniciar
    buscarPolicias('');
});
