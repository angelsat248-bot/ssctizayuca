const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la conexión a la base de datos
let poolConfig = {};

if (process.env.NODE_ENV === 'production') {
  // Configuración para producción (Render)
  poolConfig = {
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: {
      rejectUnauthorized: false,
      sslmode: 'require'
    }
  };
} else {
  // Configuración para desarrollo local
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lalo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin123',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

// Asegurar que las opciones de SSL estén presentes en producción
if (process.env.NODE_ENV === 'production') {
  poolConfig.ssl = poolConfig.ssl || { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

// Verificar la conexión a la base de datos
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('✅ Conexión exitosa a la base de datos PostgreSQL');
  release();
});

// Manejo de errores de la conexión
pool.on('error', (err) => {
  console.error('❌ Error inesperado en el cliente de PostgreSQL', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
