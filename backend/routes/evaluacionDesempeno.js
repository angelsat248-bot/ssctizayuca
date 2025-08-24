const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const pool = db.pool;

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'evaluacion-desempeno');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // Use the absolute path
    },
    filename: function (req, file, cb) {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// 1. Historial Laboral
router.post('/historial-laboral', upload.single('documento_comprobatorio'), async (req, res) => {
    const { personal_id, cup, cup_vigencia, funcion, direccion, periodo, portacion_armas_fuego } = req.body;
    
    try {
        // Get the relative path for the database
        const relativePath = req.file ? path.relative(path.join(__dirname, '..', '..'), req.file.path).replace(/\\/g, '/') : null;
        
        const query = `
            INSERT INTO historial_laboral (
                personal_id, cup, cup_vigencia, funcion, 
                direccion, periodo, documento_comprobatorio, portacion_armas_fuego
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING *;
        `;
        
        const values = [
            personal_id, 
            cup, 
            cup_vigencia, 
            funcion, 
            direccion, 
            periodo, 
            relativePath, 
            portacion_armas_fuego === 'true' || portacion_armas_fuego === true
        ];
        
        console.log('Executing query with values:', values);
        const result = await pool.query(query, values);
        
        res.status(201).json({ 
            success: true, 
            message: 'Historial laboral registrado con éxito', 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al registrar historial laboral:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// 2. Incapacidades y Ausencias
router.post('/incapacidades-ausencias', upload.single('documentos'), async (req, res) => {
    const { personal_id, motivo, fechas, trayectoria_institucional } = req.body;
    
    try {
        // Get the relative path for the database
        const relativePath = req.file ? path.relative(path.join(__dirname, '..', '..'), req.file.path).replace(/\\/g, '/') : null;
        
        const query = `
            INSERT INTO incapacidades_ausencias (
                personal_id, motivo, fechas, documentos, trayectoria_institucional
            )
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *;
        `;
        
        const values = [
            personal_id, 
            motivo, 
            fechas, 
            relativePath, 
            trayectoria_institucional
        ];
        
        console.log('Executing query with values:', values);
        const result = await pool.query(query, values);
        
        res.status(201).json({ 
            success: true, 
            message: 'Incapacidad/Ausencia registrada con éxito', 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al registrar incapacidad/ausencia:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// 3. Estímulos y Sanciones
router.post('/estimulos-sanciones', upload.single('documento'), async (req, res) => {
    const { personal_id, tipo, fundamento, descripcion, fecha, motivo, resultado, cumplimiento } = req.body;
    
    try {
        // Get the relative path for the database
        const relativePath = req.file ? path.relative(path.join(__dirname, '..', '..'), req.file.path).replace(/\\/g, '/') : null;
        
        const query = `
            INSERT INTO estimulos_sanciones (
                personal_id, tipo, fundamento, descripcion, 
                fecha, documento, motivo, resultado, cumplimiento
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
            RETURNING *;
        `;
        
        const values = [
            personal_id, 
            tipo, 
            fundamento, 
            descripcion, 
            fecha, 
            relativePath, 
            motivo, 
            resultado, 
            cumplimiento
        ];
        
        console.log('Executing query with values:', values);
        const result = await pool.query(query, values);
        
        res.status(201).json({ 
            success: true, 
            message: 'Estímulo/Sanción registrado con éxito', 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al registrar estímulo/sanción:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

// 4. Separación del Servicio
router.post('/separacion-servicio', upload.single('documentos'), async (req, res) => {
    const { personal_id, motivo, fecha_baja } = req.body;
    
    try {
        // Get the relative path for the database
        const relativePath = req.file ? path.relative(path.join(__dirname, '..', '..'), req.file.path).replace(/\\\\/g, '/') : null;
        
        const query = `
            INSERT INTO separacion_servicio (
                personal_id, motivo, fecha_baja, documentos
            )
            VALUES ($1, $2, $3, $4) 
            RETURNING *;
        `;
        
        const values = [
            personal_id, 
            motivo, 
            fecha_baja, 
            relativePath
        ];
        
        console.log('Executing query with values:', values);
        const result = await pool.query(query, values);
        
        res.status(201).json({ 
            success: true, 
            message: 'Separación del servicio registrada con éxito', 
            data: result.rows[0] 
        });
    } catch (error) {
        console.error('Error al registrar separación del servicio:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor',
            error: error.message 
        });
    }
});

module.exports = router;
