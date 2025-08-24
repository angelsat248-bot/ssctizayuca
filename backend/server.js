const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const cors = require('cors');
const personalRoutes = require('./routes/personal');
const evaluacionesControlRoutes = require('./routes/evaluacionesControl');
const formacionInicialRoutes = require('./routes/formacionInicial');
const competenciasBasicasRoutes = require('./routes/competenciasBasicas');
const reportesRoutes = require('./routes/reportes');
const evaluacionDesempenoRoutes = require('./routes/evaluacionDesempeno');
const historialLaboralRoutes = require('./routes/historialLaboral');
const incapacidadesAusenciasRoutes = require('./routes/incapacidadesAusencias');
const estimulosSancionesRoutes = require('./routes/estimulosSanciones');
const separacionServicioRoutes = require('./routes/separacionServicio');
const multer = require('multer');
require('dotenv').config();

// Configuración de CORS
app.use(cors());

// Middleware para parsear JSON y URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración para servir archivos estáticos
app.use(express.static(path.join(__dirname, '../'))); // Sirve archivos estáticos desde la raíz del proyecto
app.use('/img', express.static(path.join(__dirname, '../img'))); // Sirve la carpeta de imágenes
app.use('/css', express.static(path.join(__dirname, '../css'))); // Sirve la carpeta de estilos
app.use('/js', express.static(path.join(__dirname, '../js'))); // Sirve la carpeta de scripts
app.use('/api/uploads/fotos', express.static(path.join(__dirname, '../../uploads/fotos')));
app.use('/api/evaluaciones', express.static(path.join(__dirname, '../../uploads/evaluaciones')));
app.use('/evaluaciones', express.static(path.join(__dirname, '../../uploads/evaluaciones')));
app.use('/api/formacion-inicial/uploads', express.static(path.join(__dirname, '../../uploads/formacion-inicial')));
app.use('/formacion-inicial', express.static(path.join(__dirname, '../../uploads/formacion-inicial'))); // Sirve la carpeta de scripts

// Para archivos subidos - servir desde la raíz de uploads
app.use('/api/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res, path) => {
        // Configurar cabeceras para los archivos estáticos
        res.set('Cache-Control', 'public, max-age=31536000');
    },
    index: false,
    redirect: false
}));

// Ruta para servir archivos subidos (compatibilidad con rutas antiguas)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));

// Ruta específica para servir fotos de perfil
app.use('/api/uploads/fotos', express.static(path.join(__dirname, '..', 'uploads', 'fotos'), {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=31536000');
    }
}));

// Ruta específica para servir archivos de evaluaciones
app.use('/api/evaluaciones', express.static(path.join(__dirname, '..', 'uploads', 'evaluaciones'), {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=31536000');
        if (path.endsWith('.pdf')) {
            res.set('Content-Type', 'application/pdf');
        }
    }
}));

// Ruta de compatibilidad para evaluaciones (sin /api)
app.use('/evaluaciones', express.static(path.join(__dirname, '..', 'uploads', 'evaluaciones'), {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=31536000');
        if (path.endsWith('.pdf')) {
            res.set('Content-Type', 'application/pdf');
        }
    }
}));

// Ruta específica para servir archivos de formación inicial
app.use('/api/formacion-inicial', express.static(path.join(__dirname, '..', 'uploads', 'formacion-inicial'), {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'public, max-age=31536000');
        if (path.endsWith('.pdf')) {
            res.set('Content-Type', 'application/pdf');
        }
    }
}));

// Crear carpetas de uploads si no existen
const uploadDirs = ['evaluaciones', 'fotos', 'formacion-inicial'].map(folder => 
    path.join(__dirname, '..', 'uploads', folder)
);

uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Ruta principal que sirve el index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Rutas de la API
app.use('/api/personal', personalRoutes);
app.use('/api/evaluaciones-control', evaluacionesControlRoutes);
app.use('/api/formacion-inicial', formacionInicialRoutes);
app.use('/api/competencias-basicas', competenciasBasicasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/evaluacion-desempeno', evaluacionDesempenoRoutes);
app.use('/api/historial-laboral', historialLaboralRoutes);

// Asegurarse de que el directorio de uploads exista
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Asegurarse de que el directorio de uploads para imágenes exista
const imageUploadDir = path.join(__dirname, '..', 'uploads', 'fotos');
if (!fs.existsSync(imageUploadDir)) {
    fs.mkdirSync(imageUploadDir, { recursive: true });
}

// Configuración de multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Guardar imágenes en una subcarpeta 'fotos' dentro de uploads
        cb(null, path.join(__dirname, '..', 'uploads', 'fotos'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        
        if (mimetype && extname) {
        return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes (JPEG, JPG, PNG, GIF)'));
    }
});

// Routes
app.use('/api/personal', personalRoutes);
app.use('/api/incapacidades-ausencias', incapacidadesAusenciasRoutes);
app.use('/api/estimulos-sanciones', estimulosSancionesRoutes);
app.use('/api/separacion-servicio', separacionServicioRoutes);

// Ruta para subir archivos
app.post('/api/upload', upload.single('foto'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se ha subido ningún archivo' });
    }
    
    // Devolver la ruta relativa sin el prefijo 'fotos' para mantener compatibilidad
    const relativePath = `/uploads/fotos/${req.file.filename}`;
    
    console.log('Archivo subido exitosamente:', relativePath);
    res.json({
        success: true,
        filePath: relativePath
    });
});

// Middleware para manejar errores 404
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Error en el servidor' });
});

// Configuración del puerto
const PORT = process.env.PORT || 3000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Iniciar el servidor
const server = app.listen(PORT, HOST, () => {
    console.log(`✅ Servidor corriendo en http://${HOST}:${PORT}`);
    console.log(`🔄 Modo: ${process.env.NODE_ENV || 'development'}`);
});

// Manejo de errores de inicio del servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ El puerto ${PORT} ya está en uso.`);
    } else {
        console.error('❌ Error al iniciar el servidor:', error);
    }
    process.exit(1);
});

// Manejo de cierre de la aplicación
process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal de terminación. Cerrando el servidor...');
    server.close(() => {
        console.log('👋 Servidor cerrado');
        process.exit(0);
    });
});
