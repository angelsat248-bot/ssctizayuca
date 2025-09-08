const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a la base de datos
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lalo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    // Aumentar timeouts para desarrollo
    connectionTimeoutMillis: 10000, // 10 segundos
    idleTimeoutMillis: 30000, // 30 segundos
    max: 20, // Número máximo de clientes en el pool
});

// Verificar la conexión a la base de datos
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', {
            message: err.message,
            code: err.code,
            stack: err.stack,
            connection: {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || 5432,
                database: process.env.DB_NAME || 'lalo',
                user: process.env.DB_USER || 'postgres'
            }
        });
        process.exit(1);
        return;
    }
    
    console.log('Conexión exitosa a la base de datos PostgreSQL');
    
    // Ejecutar una consulta de prueba
    client.query('SELECT NOW()', (err, result) => {
        release(); // Importante: liberar el cliente de vuelta al pool
        
        if (err) {
            console.error('Error al ejecutar consulta de prueba:', {
                message: err.message,
                code: err.code,
                stack: err.stack
            });
            process.exit(1);
            return;
        }
        
        console.log('Conexión a la base de datos verificada correctamente:', result.rows[0]);
    });
});

// Manejo de errores de la conexión
pool.on('error', (err) => {
    console.error('Error inesperado en el cliente de PostgreSQL:', {
        message: err.message,
        code: err.code,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
    
    // No salir del proceso en desarrollo para permitir la recuperación
    if (process.env.NODE_ENV === 'production') {
        process.exit(-1);
    }
});

// Wrapper para registrar consultas
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Consulta ejecutada:', {
            text: text.length > 200 ? text.substring(0, 200) + '...' : text,
            params: params || 'Ninguno',
            duration: `${duration}ms`,
            rowCount: res.rowCount
        });
        return res;
    } catch (err) {
        console.error('Error en la consulta:', {
            message: err.message,
            code: err.code,
            query: text,
            params: params || 'Ninguno',
            stack: err.stack,
            timestamp: new Date().toISOString()
        });
        throw err; // Re-lanzar el error para que lo maneje el llamador
    }
};

module.exports = {
    query,
    pool
};
