const express = require('express');
const router = express.Router();
const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Obtener estímulos/sanciones por ID de personal
router.get('/personal/:personalId', async (req, res) => {
    console.log(`[${new Date().toISOString()}] GET /api/estimulos-sanciones/personal/${req.params.personalId}`);
    
    try {
        const { personalId } = req.params;
        
        if (!personalId) {
            console.error('No se proporcionó un ID de personal');
            return res.status(400).json({ 
                success: false, 
                message: 'Se requiere un ID de personal' 
            });
        }
        
        console.log(`Buscando estímulos/sanciones para personal_id: ${personalId}`);
        
        // Verificar si la tabla existe
        const tableExists = await db.query(
            `SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'estimulos_sanciones'
            )`
        );

        if (!tableExists.rows[0].exists) {
            console.log('La tabla estimulos_sanciones no existe. Creándola...');
            try {
                const createTableSql = fs.readFileSync(
                    path.join(__dirname, '../../database/add_estimulos_sanciones_table.sql'), 
                    'utf8'
                );
                
                await db.query(createTableSql);
                console.log('Tabla estimulos_sanciones creada exitosamente');
                
                return res.json({ 
                    success: true, 
                    data: [] 
                });
            } catch (createError) {
                console.error('Error al crear la tabla estimulos_sanciones:', createError);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al crear la tabla de estímulos/sanciones',
                    error: createError.message
                });
            }
        }
        
        // Si la tabla existe, realizar la consulta
        const query = `
            SELECT 
                id,
                personal_id as "personalId",
                tipo,
                fundamento,
                descripción as "descripcion",
                fecha,
                documento,
                motivo,
                resultado,
                cumplimiento,
                fecha_registro as "fechaRegistro"
            FROM estimulos_sanciones 
            WHERE personal_id = $1
            ORDER BY fecha DESC`;
            
        console.log('Ejecutando consulta SQL:', query);
        console.log('Con parámetros:', [personalId]);
        
        const { rows } = await db.query(query, [personalId]);
        
        console.log(`Se encontraron ${rows.length} registros de estímulos/sanciones`);
        
        if (rows.length > 0) {
            console.log('Primer registro de ejemplo:', JSON.stringify(rows[0], null, 2));
        }
        
        return res.json({ 
            success: true, 
            data: rows
        });
        
    } catch (error) {
        console.error('Error en /api/estimulos-sanciones/personal/:personalId:', error);
        
        // Manejar errores específicos
        if (error.code === '42P01') { // Tabla no existe
            console.error('La tabla estimulos_sanciones no existe');
            return res.status(200).json({ 
                success: true, 
                data: [] 
            });
        }
        
        return res.status(500).json({ 
            success: false, 
            message: 'Error al obtener datos de estímulos/sanciones',
            error: error.message
        });
    }
});

module.exports = router;
