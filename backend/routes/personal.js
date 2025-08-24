const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Obtener todo el personal
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM personal ORDER BY apellido_paterno, apellido_materno, nombres');
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error al obtener el personal:', err);
        res.status(500).json({ success: false, message: 'Error al obtener el personal' });
    }
});

// Buscar personal por nombre o CURP
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query || query.trim() === '') {
            return res.status(400).json({ success: false, message: 'El término de búsqueda es requerido' });
        }

        // Limpiar y escapar caracteres especiales
        const cleanQuery = query.trim().replace(/[^a-zA-Z0-9\s]/g, '');
        
        // Si la búsqueda parece ser un CURP (18 caracteres alfanuméricos)
        if (/^[A-Z0-9]{18}$/i.test(cleanQuery)) {
            const result = await db.query(
                'SELECT * FROM personal WHERE curp = $1',
                [cleanQuery.toUpperCase()]
            );
            return res.json({ success: true, data: result.rows });
        }

        // Búsqueda por nombre o apellidos
        const searchQuery = `%${cleanQuery}%`;
        const result = await db.query(
            `SELECT * FROM personal 
             WHERE nombres ILIKE $1 
                OR apellido_paterno ILIKE $1 
                OR apellido_materno ILIKE $1 
                OR CONCAT(apellido_paterno, ' ', apellido_materno, ' ', nombres) ILIKE $1
             ORDER BY apellido_paterno, apellido_materno, nombres
             LIMIT 50`,
            [searchQuery]
        );
        
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('Error al buscar personal:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error al buscar personal',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Obtener un miembro del personal por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM personal WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Personal no encontrado' });
        }
        
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('Error al obtener el personal:', err);
        res.status(500).json({ success: false, message: 'Error al obtener el personal' });
    }
});

// Crear un nuevo miembro del personal
router.post('/', async (req, res) => {
    try {
        const {
            apellido_paterno,
            apellido_materno,
            nombres,
            fecha_nacimiento,
            fecha_ingreso,
            grado_cargo,
            sexo,
            curp,
            escolaridad,
            telefono_contacto,
            foto_perfil
        } = req.body;

        // Validar campos requeridos
        if (!apellido_paterno || !nombres || !fecha_nacimiento || !fecha_ingreso || 
            !grado_cargo || !sexo || !curp || !escolaridad || !telefono_contacto) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son obligatorios, excepto la foto de perfil' 
            });
        }

        // Insertar en la base de datos
        const query = `
            INSERT INTO personal (
                apellido_paterno, apellido_materno, nombres, 
                fecha_nacimiento, fecha_ingreso, grado_cargo, 
                sexo, curp, escolaridad, telefono_contacto, foto_perfil
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const values = [
            apellido_paterno,
            apellido_materno || null,
            nombres,
            fecha_nacimiento,
            fecha_ingreso,
            grado_cargo,
            sexo,
            curp,
            escolaridad,
            telefono_contacto,
            foto_perfil || null
        ];

        const result = await db.query(query, values);
        
        res.status(201).json({ 
            success: true, 
            message: 'Personal registrado exitosamente',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error al registrar el personal:', err);
        
        // Manejar error de duplicado de CURP
        if (err.code === '23505' && err.constraint === 'personal_curp_key') {
            return res.status(400).json({ 
                success: false, 
                message: 'El CURP ya está registrado' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al registrar el personal',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Actualizar un miembro del personal
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            apellido_paterno,
            apellido_materno,
            nombres,
            fecha_nacimiento,
            fecha_ingreso,
            grado_cargo,
            sexo,
            curp,
            escolaridad,
            telefono_contacto,
            foto_perfil
        } = req.body;

        // Validar campos requeridos
        if (!apellido_paterno || !nombres || !fecha_nacimiento || !fecha_ingreso || 
            !grado_cargo || !sexo || !curp || !escolaridad || !telefono_contacto) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son obligatorios, excepto la foto de perfil' 
            });
        }

        // Actualizar en la base de datos
        const query = `
            UPDATE personal 
            SET 
                apellido_paterno = $1,
                apellido_materno = $2,
                nombres = $3,
                fecha_nacimiento = $4,
                fecha_ingreso = $5,
                grado_cargo = $6,
                sexo = $7,
                curp = $8,
                escolaridad = $9,
                telefono_contacto = $10,
                foto_perfil = COALESCE($11, foto_perfil),
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id = $12
            RETURNING *
        `;

        const values = [
            apellido_paterno,
            apellido_materno || null,
            nombres,
            fecha_nacimiento,
            fecha_ingreso,
            grado_cargo,
            sexo,
            curp,
            escolaridad,
            telefono_contacto,
            foto_perfil || null,
            id
        ];

        const result = await db.query(query, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Personal no encontrado' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Personal actualizado exitosamente',
            data: result.rows[0]
        });
    } catch (err) {
        console.error('Error al actualizar el personal:', err);
        
        // Manejar error de duplicado de CURP
        if (err.code === '23505' && err.constraint === 'personal_curp_key') {
            return res.status(400).json({ 
                success: false, 
                message: 'El CURP ya está registrado para otro miembro del personal' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al actualizar el personal',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Eliminar un miembro del personal
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar si el personal existe
        const checkResult = await db.query('SELECT * FROM personal WHERE id = $1', [id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Personal no encontrado' 
            });
        }
        
        // Eliminar el registro
        await db.query('DELETE FROM personal WHERE id = $1', [id]);
        
        res.json({ 
            success: true, 
            message: 'Personal eliminado exitosamente' 
        });
    } catch (err) {
        console.error('Error al eliminar el personal:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar el personal',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

module.exports = router;
