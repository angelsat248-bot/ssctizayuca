const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de almacenamiento para archivos PDF
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, '../../uploads/evaluaciones');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'evaluacion-' + uniqueSuffix + path.extname(file.originalname));
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

// Validar formato CUIP (18MXHGO00012543)
function validarCUIP(cuip) {
    const regex = /^(\d{2})([A-Z]{2}[A-Z]{3})(\d{8})$/;
    const match = cuip.match(regex);
    
    if (!match) return { valido: false };
    
    const [_, anio, estado, consecutivo] = match;
    const anioActual = new Date().getFullYear() % 100; // Últimos 2 dígitos del año
    const anioEvaluacion = parseInt(anio, 10);
    
    return {
        valido: true,
        anio: anioEvaluacion,
        estado: estado,
        consecutivo: consecutivo,
        esVigente: (anioActual - anioEvaluacion) <= 3
    };
}

// Crear nueva evaluación de control
router.post('/', upload.single('archivo_pdf'), async (req, res) => {
    console.log('Solicitud POST recibida en /api/evaluaciones-control');
    console.log('Cuerpo de la solicitud:', req.body);
    console.log('Archivo subido:', req.file);
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN'); // Iniciar transacción
        const {
            personal_id,
            cuip,
            tipo_evaluacion,
            fecha_evaluacion,
            resultado,
            vigencia
        } = req.body;

        // Validar campos requeridos
        const camposRequeridos = [
            { name: 'personal_id', value: personal_id },
            { name: 'cuip', value: cuip },
            { name: 'tipo_evaluacion', value: tipo_evaluacion },
            { name: 'fecha_evaluacion', value: fecha_evaluacion },
            { name: 'resultado', value: resultado },
            { name: 'vigencia', value: vigencia }
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

        // Validar formato CUIP
        const validacionCUIP = validarCUIP(cuip);
        if (!validacionCUIP.valido) {
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(400).json({ 
                success: false, 
                message: 'Formato de CUIP inválido. Debe seguir el formato: 18MXHGO00012543' 
            });
        }

        // Verificar si el personal existe
        const personalResult = await client.query('SELECT id FROM personal WHERE id = $1', [personal_id]);
        if (personalResult.rows.length === 0) {
            await client.query('ROLLBACK'); // Revertir transacción
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(404).json({ 
                success: false, 
                message: 'Personal no encontrado' 
            });
        }

        // Insertar nueva evaluación
        console.log('Insertando nueva evaluación en la base de datos...');
        const archivo_pdf = req.file ? req.file.filename : null;
        const relativeFilePath = archivo_pdf ? archivo_pdf.replace(/^.*[\\/]/, '') : null;
        const filePath = relativeFilePath ? `/evaluaciones/${relativeFilePath}` : null;
        
        // Construir la consulta SQL
        const query = {
            text: `
                INSERT INTO evaluaciones_control (
                    personal_id, cuip, tipo_evaluacion, fecha_evaluacion, 
                    resultado, vigencia, archivo_pdf, activo
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
                RETURNING *
            `,
            values: [
                personal_id,
                cuip,
                tipo_evaluacion,
                fecha_evaluacion,
                resultado,
                vigencia,
                filePath
            ]
        };
        
        console.log('Consulta SQL:', query.text);
        console.log('Valores:', query.values);
        
        try {
            const result = await client.query(query);
            console.log('Evaluación insertada correctamente:', result.rows[0]);
            await client.query('COMMIT');

            res.status(201).json({ 
                success: true, 
                data: result.rows[0],
                message: 'Evaluación guardada correctamente' 
            });
        } catch (dbError) {
            console.error('Error al ejecutar la consulta SQL:', dbError);
            console.error('Query que falló:', query);
            throw dbError; // Esto será capturado por el catch externo
        }
        
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
            message: 'Error al guardar la evaluación',
            error: error.message 
        });
    } finally {
        // Liberar el cliente de la piscina
        if (client) {
            client.release();
        }
    }
});

// Obtener evaluaciones por ID de personal
router.get('/personal/:id', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { id } = req.params;
        console.log(`Buscando evaluaciones para el personal con ID: ${id}`);
        
        const result = await client.query(
            `SELECT * FROM evaluaciones_control 
             WHERE personal_id = $1 AND activo = true 
             ORDER BY fecha_evaluacion DESC`,
            [id]
        );
        
        console.log(`Se encontraron ${result.rows.length} evaluaciones`);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('=== ERROR AL OBTENER EVALUACIONES ===');
        console.error('Mensaje de error:', error.message);
        console.error('Stack trace:', error.stack);
        
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener evaluaciones',
            error: error.message
        });
    } finally {
        // Liberar el cliente de la piscina
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
