const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Obtener datos de separación de servicio por ID de personal
router.get('/personal/:personalId', async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/separacion-servicio/personal/${req.params.personalId}`);
    
    try {
        const { personalId } = req.params;
        
        if (!personalId) {
            console.error('No se proporcionó un ID de personal');
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere un ID de personal' 
            });
        }
        
        console.log(`Buscando separación de servicio para personal_id: ${personalId}`);
        
        // Verificar si la tabla existe
        const tableExists = await db.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'separacion_servicio'
            )`
        );

        if (!tableExists.rows[0].exists) {
            console.log('La tabla separacion_servicio no existe. Creándola...');
            try {
                const createTableSql = fs.readFileSync(
                    path.join(__dirname, '../../database/add_separacion_servicio_table.sql'), 
                    'utf8'
                );
                
                await db.query(createTableSql);
                console.log('Tabla separacion_servicio creada exitosamente');
                
                return res.json({ 
                    success: true, 
                    data: [] 
                });
            } catch (createError) {
                console.error('Error al crear la tabla separacion_servicio:', createError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al crear la tabla de separación de servicio',
                    error: createError.message
                });
            }
        }
        
        // Si la tabla existe, realizar la consulta
        const query = `
            SELECT 
                id,
                personal_id as "personalId",
                motivo,
                fecha_baja as "fechaBaja",
                documentos,
                fecha_registro as "fechaRegistro"
            FROM separacion_servicio 
            WHERE personal_id = $1`;
            
        console.log('Ejecutando consulta SQL:', query);
        console.log('Con parámetros:', [personalId]);
        
        const { rows } = await db.query(query, [personalId]);
        
        console.log(`Se encontraron ${rows.length} registros de separación de servicio`);
        
        if (rows.length > 0) {
            console.log('Primer registro de ejemplo:', JSON.stringify(rows[0], null, 2));
        }
        
        return res.json({ 
            success: true, 
            data: rows
        });
        
    } catch (error) {
        console.error('Error en /api/separacion-servicio/personal/:personalId:', error);
        
        // Manejar errores específicos
        if (error.code === '42P01') { // Tabla no existe
            console.error('La tabla separacion_servicio no existe');
            return res.status(200).json({ 
                success: true, 
                data: [] 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener datos de separación de servicio',
            error: error.message
        });
    }
});

module.exports = router;
