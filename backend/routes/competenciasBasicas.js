const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/competencias-basicas');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'competencia-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
            return cb(new Error('Solo se permiten archivos PDF'));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Create new competencia
router.post('/', upload.single('archivo_pdf'), async (req, res) => {
    const { personal_id, vigencia, resultado, fechaVigencia, institucion, enlaces, observaciones } = req.body;
    const fecha = fechaVigencia; // Map fechaVigencia to fecha
    const archivo_pdf = req.file ? `/uploads/competencias-basicas/${req.file.filename}` : null;

    if (!personal_id || !vigencia || !resultado || !fecha || !institucion) {
        return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });
    }

    try {
        const query = `
            INSERT INTO competencias_basicas (personal_id, vigencia, resultado, fecha, institucion, enlaces, observaciones, archivo_pdf)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
        `;
        const values = [personal_id, parseInt(vigencia, 10), resultado, fecha, institucion, enlaces, observaciones, archivo_pdf];
        const result = await pool.query(query, values);
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error al guardar competencia:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Get competencias by personal_id
router.get('/personal/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM competencias_basicas WHERE personal_id = $1 ORDER BY fecha DESC', [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error al obtener competencias:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

// Delete competencia (logical)
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('UPDATE competencias_basicas SET activo = false WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Registro no encontrado' });
        }
        res.json({ success: true, message: 'Registro eliminado' });
    } catch (error) {
        console.error('Error al eliminar competencia:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
});

module.exports = router;
