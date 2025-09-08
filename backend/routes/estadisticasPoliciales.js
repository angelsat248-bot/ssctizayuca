const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Ruta de prueba para ver los valores de portacion_armas_fuego
router.get('/test-portacion', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                id, 
                personal_id, 
                portacion_armas_fuego,
                portacion_armas_fuego::text as portacion_text,
                portacion_armas_fuego IS NULL as is_null,
                portacion_armas_fuego::text = '[V]' as is_v,
                portacion_armas_fuego::text = '[]' as is_empty_array,
                portacion_armas_fuego::text = 'true' as is_true_text,
                portacion_armas_fuego = true as is_true_bool
            FROM historial_laboral
            ORDER BY id
        `);
        
        res.json({
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error en test-portacion:', error);
        res.status(500).json({ error: 'Error al obtener datos de prueba' });
    }
});

// Ruta de prueba para verificar la conexión a la base de datos
router.get('/test-connection', async (req, res) => {
    try {
        // 1. Probar conexión básica
        console.log('Probando conexión a la base de datos...');
        const testQuery = await db.query('SELECT NOW() as current_time');
        console.log('Consulta de prueba exitosa:', testQuery.rows[0]);
        
        // 2. Probar consulta a la tabla personal
        console.log('Probando consulta a la tabla personal...');
        const personalCount = await db.query('SELECT COUNT(*) as count FROM personal');
        console.log(`Total de registros en personal: ${personalCount.rows[0].count}`);
        
        // 3. Probar consulta a la tabla historial_laboral
        console.log('Probando consulta a la tabla historial_laboral...');
        const historialCount = await db.query('SELECT COUNT(*) as count FROM historial_laboral');
        console.log(`Total de registros en historial_laboral: ${historialCount.rows[0].count}`);
        
        // 4. Probar consulta JOIN entre las tablas
        console.log('Probando consulta JOIN entre las tablas...');
        const joinQuery = `
            SELECT p.id, p.nombres, p.apellido_paterno, p.apellido_materno,
                   hl.cup, hl.cup_vigencia, hl.portacion_armas_fuego
            FROM personal p
            LEFT JOIN historial_laboral hl ON p.id = hl.personal_id
            ORDER BY p.id
            LIMIT 5`;
            
        const joinResult = await db.query(joinQuery);
        console.log('Resultado de la consulta JOIN (primeros 5 registros):', joinResult.rows);
        
        res.json({
            status: 'success',
            message: 'Pruebas de conexión completadas exitosamente',
            results: {
                currentTime: testQuery.rows[0].current_time,
                personalCount: personalCount.rows[0].count,
                historialCount: historialCount.rows[0].count,
                sampleData: joinResult.rows
            }
        });
        
    } catch (error) {
        console.error('Error en la prueba de conexión:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            timestamp: new Date().toISOString()
        });
        
        res.status(500).json({
            status: 'error',
            message: 'Error al probar la conexión a la base de datos',
            error: {
                message: error.message,
                code: error.code,
                ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
            }
        });
    }
});

// Buscar policías por nombre o CUP
router.get('/buscar', async (req, res) => {
    try {
        const { termino } = req.query;
        console.log('Búsqueda de policías con término:', termino);
        
        if (termino && typeof termino !== 'string') {
            console.error('Tipo de término de búsqueda inválido:', typeof termino);
            return res.status(400).json({ 
                error: 'Término de búsqueda inválido',
                details: 'El término de búsqueda debe ser una cadena de texto'
            });
        }
        
        if (!termino) {
            console.log('Buscando todos los registros');
            const result = await db.query(`
                SELECT DISTINCT ON (p.id)
                    p.id, 
                    p.nombres, 
                    p.apellido_paterno, 
                    p.apellido_materno,
                    hl.cup,
                    hl.cup_vigencia,
                    COALESCE(hl.funcion, '') as funcion,
                    CASE 
                        WHEN hl.portacion_armas_fuego::text = 'true' OR 
                             hl.portacion_armas_fuego::text = '[V]' OR
                             hl.portacion_armas_fuego = true THEN true
                        ELSE false 
                    END as portacion_armas_fuego
                FROM personal p
                LEFT JOIN historial_laboral hl ON p.id = hl.personal_id
                ORDER BY p.id, p.apellido_paterno, p.apellido_materno, p.nombres, hl.cup_vigencia DESC
            `);
            console.log(`Se encontraron ${result.rows.length} registros`);
            return res.json(result.rows);
        }

        // Buscar por nombre o CUP
        console.log(`Buscando por término: ${termino}`);
        const searchTerm = `%${termino}%`;
        
        // Primero, verificar si el término es un CUP
        const isCupSearch = /^[A-Za-z0-9-]{3,20}$/i.test(termino.trim());
        
        let query = `
            SELECT DISTINCT ON (p.id)
                p.id, 
                p.nombres, 
                p.apellido_paterno, 
                p.apellido_materno,
                hl.cup,
                hl.cup_vigencia,
                COALESCE(hl.funcion, '') as funcion,
                CASE 
                    WHEN hl.portacion_armas_fuego::text = 'true' OR 
                         hl.portacion_armas_fuego::text = '[V]' OR
                         hl.portacion_armas_fuego = true THEN true
                    ELSE false 
                END as portacion_armas_fuego
            FROM personal p
            LEFT JOIN historial_laboral hl ON p.id = hl.personal_id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (isCupSearch) {
            query += ` AND hl.cup ILIKE $1`;
            params.push(`%${termino}%`);
        } else {
            query += ` AND (
                p.nombres ILIKE $1 OR 
                p.apellido_paterno ILIKE $1 OR 
                p.apellido_materno ILIKE $1 OR
                CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', COALESCE(p.apellido_materno, '')) ILIKE $1
            )`;
            params.push(searchTerm);
        }
        
        query += ` ORDER BY p.id, p.apellido_paterno, p.apellido_materno, p.nombres`;
        
        console.log('Ejecutando consulta:', query);
        console.log('Parámetros:', params);
        
        const result = await db.query(query, params);
        console.log(`Se encontraron ${result.rows.length} resultados`);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error al buscar policías:', {
            message: err.message,
            stack: err.stack,
            query: req.query,
            timestamp: new Date().toISOString()
        });
        
        const errorResponse = {
            error: 'Error al buscar policías',
            message: err.message,
            timestamp: new Date().toISOString()
        };
        
        if (process.env.NODE_ENV === 'development') {
            errorResponse.stack = err.stack;
            errorResponse.query = req.query;
        }
        
        res.status(500).json(errorResponse);
    }
});

// Filtrar por vigencia del CUP
router.get('/filtrar/vigencia', async (req, res) => {
    try {
        const { tipo } = req.query;
        
        if (!tipo || !['2025', 'menor-2025'].includes(tipo)) {
            console.error('Tipo de filtro de vigencia inválido:', tipo);
            return res.status(400).json({ 
                error: 'Tipo de filtro de vigencia inválido',
                details: 'Los valores válidos son: 2025, menor-2025',
                received: tipo
            });
        }
        
        console.log(`Filtrando por vigencia: ${tipo}`);
        
        let query = `
            SELECT DISTINCT ON (p.id)
                p.id, 
                p.nombres, 
                p.apellido_paterno, 
                p.apellido_materno,
                hl.cup,
                hl.cup_vigencia,
                COALESCE(hl.funcion, '') as funcion,
                CASE 
                    WHEN hl.portacion_armas_fuego::text = 'true' OR 
                         hl.portacion_armas_fuego::text = '[V]' OR
                         hl.portacion_armas_fuego = true THEN true
                    ELSE false 
                END as portacion_armas_fuego
            FROM personal p
            JOIN historial_laboral hl ON p.id = hl.personal_id
            WHERE 1=1
        `;

        if (tipo === '2025') {
            query += ` AND EXTRACT(YEAR FROM hl.cup_vigencia) = 2025`;
        } else if (tipo === 'menor-2025') {
            query += ` AND hl.cup_vigencia < CURRENT_DATE`;
        }

        query += ` ORDER BY p.id, hl.cup_vigencia DESC`;
        
        console.log('Ejecutando consulta de vigencia:', query);
        const result = await db.query(query);
        console.log(`Se encontraron ${result.rows.length} registros`);
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error al filtrar por vigencia:', err);
        res.status(500).json({ 
            error: 'Error al filtrar por vigencia',
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// Filtrar por portación de armas
router.get('/filtrar/portacion', async (req, res) => {
    try {
        const { conPortacion } = req.query;
        console.log(`Filtrando por portación: ${conPortacion}`);
        
        if (conPortacion !== 'true' && conPortacion !== 'false') {
            console.error('Valor de portación inválido:', conPortacion);
            return res.status(400).json({ 
                error: 'Valor de portación inválido',
                details: 'El valor debe ser true o false',
                received: conPortacion
            });
        }
        
        const portacionValue = conPortacion === 'true';
        
        // Usamos una subconsulta para manejar correctamente la comparación booleana
        // Modificamos la consulta para manejar directamente los valores [V] y []
        // Construimos la consulta dinámicamente basada en el valor de portación
        const query = `
            SELECT DISTINCT ON (p.id)
                p.id, 
                p.nombres, 
                p.apellido_paterno, 
                p.apellido_materno,
                hl.cup,
                hl.cup_vigencia,
                COALESCE(hl.funcion, '') as funcion,
                ${portacionValue ? "true" : "false"} as portacion_armas_fuego
            FROM personal p
            JOIN historial_laboral hl ON p.id = hl.personal_id
            WHERE 
                ${portacionValue ? 
                    "(hl.portacion_armas_fuego = true OR hl.portacion_armas_fuego::text = '[V]')" : 
                    "(hl.portacion_armas_fuego = false OR hl.portacion_armas_fuego IS NULL OR hl.portacion_armas_fuego::text = '[]')"}
            ORDER BY p.id, hl.cup_vigencia DESC
        `;
        
        console.log('Ejecutando consulta de portación:', query);
        const result = await db.query(query);
        console.log(`Se encontraron ${result.rows.length} registros`);

        res.json(result.rows);
    } catch (err) {
        console.error('Error al filtrar por portación:', err);
        res.status(500).json({ 
            error: 'Error al filtrar por portación de armas',
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

module.exports = router;
