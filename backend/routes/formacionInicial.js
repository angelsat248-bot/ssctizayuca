const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para archivos PDF
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/formacion-inicial');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'formacion-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
            return cb(new Error('Solo se permiten archivos PDF'));
        }
        cb(null, true);
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    }
});

// Crear nuevo registro de formación inicial
router.post('/', upload.single('archivo_pdf'), async (req, res) => {
    console.log('Solicitud POST recibida en /api/formacion-inicial');
    console.log('Cuerpo de la solicitud:', req.body);
    console.log('Archivo subido:', req.file);
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        const {
            personal_id,
            curso,
            tipo,
            institucion,
            fecha,
            resultado,
            observaciones
        } = req.body;

        // Validar campos requeridos
        const camposRequeridos = [
            { name: 'personal_id', value: personal_id },
            { name: 'curso', value: curso },
            { name: 'tipo', value: tipo },
            { name: 'fecha', value: fecha },
            { name: 'resultado', value: resultado }
        ];

        const camposFaltantes = camposRequeridos.filter(campo => !campo.value);
        
        if (camposFaltantes.length > 0) {
            console.error('Campos requeridos faltantes:', camposFaltantes.map(c => c.name).join(', '));
            
            // Eliminar archivo subido si hay un error de validación
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            
            return res.status(400).json({ 
                success: false, 
                message: `Los siguientes campos son requeridos: ${camposFaltantes.map(c => c.name).join(', ')}`
            });
        }

        // Verificar si el personal existe
        // Convertir personal_id a número entero
        const personalIdInt = parseInt(personal_id, 10);
        if (isNaN(personalIdInt)) {
            throw new Error('ID de personal no válido');
        }

        const personalResult = await client.query('SELECT id FROM personal WHERE id = $1', [personalIdInt]);
        if (personalResult.rows.length === 0) {
            await client.query('ROLLBACK');
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ 
                success: false, 
                message: 'Personal no encontrado' 
            });
        }

        // Insertar nuevo registro de formación
        console.log('Insertando nuevo registro de formación en la base de datos...');
        
        // Procesar archivo PDF si existe
        const archivo_pdf = req.file ? req.file.filename : null;
        const relativeFilePath = archivo_pdf ? archivo_pdf.replace(/^.*[\\/]/, '') : null;
        const filePath = relativeFilePath ? `/uploads/formacion-inicial/${relativeFilePath}` : null;
        
        const query = {
            text: `
                INSERT INTO formacion_inicial (
                    personal_id, curso, tipo, institucion, 
                    fecha, resultado, observaciones, archivo_pdf, activo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
                RETURNING *
            `,
            values: [
                personalIdInt,  // Usar el ID convertido a entero
                curso,
                tipo,
                institucion,
                fecha,
                resultado,
                observaciones || null,
                filePath
            ]
        };
        
        console.log('Consulta SQL:', query.text);
        console.log('Valores:', query.values);
        
        const result = await client.query(query);
        await client.query('COMMIT');
        
        console.log('Registro de formación insertado correctamente:', result.rows[0]);
        
        res.status(201).json({ 
            success: true, 
            data: result.rows[0],
            message: 'Registro de formación guardado correctamente' 
        });
        
    } catch (error) {
        console.error('=== ERROR DETALLADO ===');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        if (error.code) console.error('Código de error PostgreSQL:', error.code);
        if (error.detail) console.error('Detalle del error:', error.detail);
        if (error.hint) console.error('Sugerencia:', error.hint);
        if (error.position) console.error('Posición del error:', error.position);
        
        // Revertir transacción si hay un error
        if (client) {
            try {
                console.log('Intentando hacer ROLLBACK de la transacción...');
                await client.query('ROLLBACK');
                console.log('ROLLBACK exitoso');
            } catch (rollbackError) {
                console.error('Error al revertir la transacción:', rollbackError);
            }
        }
        
        // Eliminar archivo subido en caso de error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al guardar el registro de formación',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la piscina
        if (client) {
            client.release();
        }
    }
});

// Obtener formaciones por ID de personal
router.get('/personal/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const personalIdInt = parseInt(id, 10);
        if (isNaN(personalIdInt)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de personal no válido' 
            });
        }
        
        console.log(`Buscando formaciones para el personal con ID: ${personalIdInt}`);
        
        const result = await client.query(
            `SELECT * FROM formacion_inicial 
             WHERE personal_id = $1 AND activo = true 
             ORDER BY fecha DESC`,
            [personalIdInt]
        );
        
        console.log(`Se encontraron ${result.rows.length} registros de formación`);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('=== ERROR AL OBTENER REGISTROS DE FORMACIÓN ===');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener los registros de formación',
            error: error.message 
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Eliminar registro de formación (borrado lógico)
router.delete('/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        const formacionIdInt = parseInt(id, 10);
        if (isNaN(formacionIdInt)) {
            return res.status(400).json({ 
                success: false, 
                message: 'ID de formación no válido' 
            });
        }
        
        console.log(`Eliminando registro de formación con ID: ${formacionIdInt}`);
        
        await client.query('BEGIN');
        
        // Actualizar el campo activo a false en lugar de eliminar el registro
        const result = await client.query(
            'UPDATE formacion_inicial SET activo = false WHERE id = $1 RETURNING *',
            [formacionIdInt]
        );
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ 
                success: false, 
                message: 'Registro de formación no encontrado' 
            });
        }
        
        await client.query('COMMIT');
        
        console.log('Registro de formación desactivado correctamente');
        res.json({ 
            success: true, 
            message: 'Registro de formación eliminado correctamente' 
        });
        
    } catch (error) {
        console.error('=== ERROR AL ELIMINAR REGISTRO DE FORMACIÓN ===');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error al revertir la transacción:', rollbackError);
            }
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al eliminar el registro de formación',
            error: error.message 
        });
    } finally {
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
