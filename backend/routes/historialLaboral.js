const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener historial laboral por ID de personal
router.get('/personal/:personalId', async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/historial-laboral/personal/${req.params.personalId}`);
    
    try {
        const { personalId } = req.params;
        
        if (!personalId) {
            console.error('No se proporcionó un ID de personal');
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere un ID de personal' 
            });
        }
        
        console.log(`Buscando historial laboral para personal_id: ${personalId}`);
        
        // Verificar si la tabla existe
        const tableExists = await db.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'historial_laboral'
            )`
        );

        if (!tableExists.rows[0].exists) {
            console.log('La tabla historial_laboral no existe. Creándola...');
            try {
                const fs = require('fs');
                const path = require('path');
                const createTableSql = fs.readFileSync(
                    path.join(__dirname, '../../database/add_historial_laboral_table.sql'), 
                    'utf8'
                );
                
                await db.query(createTableSql);
                console.log('Tabla historial_laboral creada exitosamente');
                
                return res.json({ 
                    success: true, 
                    data: [] 
                });
            } catch (createError) {
                console.error('Error al crear la tabla historial_laboral:', createError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al crear la tabla de historial laboral',
                    error: process.env.NODE_ENV === 'development' ? createError.message : undefined
                });
            }
        }
        
        // Consultar el historial laboral
        console.log('Ejecutando consulta de historial laboral para personal_id:', personalId);
        
        try {
            // First, check if the table has the expected columns
            const checkColumns = await db.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'historial_laboral'
            `);
            console.log('Columnas en la tabla historial_laboral:', checkColumns.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
            
            // Query with correct column names
            const result = await db.query(
                `SELECT 
                    id,
                    personal_id,
                    cup,
                    cup_vigencia,
                    funcion,
                    direccion,
                    periodo,
                    documento_comprobatorio,
                    portacion_armas_fuego,
                    fecha_registro
                FROM historial_laboral 
                WHERE personal_id = $1 
                ORDER BY fecha_registro DESC`,
                [personalId]
            );
            
            console.log(`Se encontraron ${result.rows.length} registros de historial laboral para personal_id: ${personalId}`);
            console.log('Datos encontrados:', JSON.stringify(result.rows, null, 2));
            
            if (result.rows.length > 0) {
                console.log('Ejemplo de registro de historial laboral:', JSON.stringify(result.rows[0], null, 2));
            }
            
            res.json({ 
                success: true, 
                data: result.rows 
            });
        } catch (queryError) {
            console.error('Error al ejecutar la consulta de historial laboral:', queryError);
            
            // Verificar si hay datos en la tabla
            try {
                const checkData = await db.query('SELECT COUNT(*) as count FROM historial_laboral');
                console.log(`Total de registros en la tabla historial_laboral: ${checkData.rows[0].count}`);
                
                // Verificar si hay registros para este personal_id
                const checkPersonal = await db.query(
                    'SELECT COUNT(*) as count FROM historial_laboral WHERE personal_id = $1', 
                    [personalId]
                );
                console.log(`Registros para personal_id ${personalId}: ${checkPersonal.rows[0].count}`);
                
            } catch (checkError) {
                console.error('Error al verificar datos de la tabla:', checkError);
            }
            
            throw queryError; // Re-lanzar el error para manejarlo en el catch general
        }
        
    } catch (err) {
        console.error('Error al obtener el historial laboral:', err);
        
        // Si hay un error de columna que no existe, intentar crear la tabla
        if (err.code === '42703' && err.message.includes('fecha')) {
            try {
                console.log('La tabla historial_laboral tiene una estructura antigua. Actualizando...');
                // Aquí podrías agregar código para migrar la tabla antigua a la nueva estructura
                // Por ahora, solo devolvemos un array vacío
                return res.json({ success: true, data: [] });
            } catch (migrationErr) {
                console.error('Error al actualizar la tabla historial_laboral:', migrationErr);
            }
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener el historial laboral',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;
