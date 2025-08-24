const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Search for personnel by name or CURP
router.get('/search', async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ success: false, message: 'Query parameter is required' });
    }

    try {
        const searchQuery = `
            SELECT DISTINCT ON (p.id)
                p.id, 
                p.nombres || ' ' || p.apellido_paterno || ' ' || p.apellido_materno AS nombre_completo,
                p.fecha_ingreso, p.curp, p.foto_perfil, p.estatus,
                ec.cuip
            FROM personal p
            LEFT JOIN evaluaciones_control ec ON p.id = ec.personal_id
            WHERE (p.nombres || ' ' || p.apellido_paterno || ' ' || p.apellido_materno ILIKE $1 OR p.curp ILIKE $1)
            ORDER BY p.id, ec.fecha_evaluacion DESC
        `;
        const result = await pool.query(searchQuery, [`%${query}%`]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error searching personnel:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Update personnel status
router.put('/status', async (req, res) => {
    const { id, estatus } = req.body;

    if (!estatus || !['Activo', 'Inactivo'].includes(estatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status provided' });
    }

    try {
        const updateQuery = 'UPDATE personal SET estatus = $1 WHERE id = $2 RETURNING *';
        const result = await pool.query(updateQuery, [estatus, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Personnel not found' });
        }

        res.json({ success: true, message: 'Status updated successfully', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Get personnel status summary
router.get('/summary', async (req, res) => {
    try {
        const summaryQuery = `
            SELECT
                estatus,
                COUNT(*) AS count,
                json_agg(nombres || ' ' || apellido_paterno || ' ' || apellido_materno) AS names
            FROM personal
            GROUP BY estatus;
        `;
        const result = await pool.query(summaryQuery);

        const summary = {
            Activo: { count: 0, names: [] },
            Inactivo: { count: 0, names: [] }
        };

        result.rows.forEach(row => {
            if (summary[row.estatus]) {
                summary[row.estatus].count = parseInt(row.count, 10);
                summary[row.estatus].names = row.names || [];
            }
        });

        res.json({ success: true, data: summary });
    } catch (error) {
        console.error('Error getting personnel summary:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router;
