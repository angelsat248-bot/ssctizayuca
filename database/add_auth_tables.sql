-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    area_adscripcion VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    es_admin BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de permisos
CREATE TABLE IF NOT EXISTS permisos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

-- Tabla de relación usuarios-permisos
CREATE TABLE IF NOT EXISTS usuarios_permisos (
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    permiso_id INTEGER REFERENCES permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, permiso_id)
);

-- Insertar permisos iniciales
INSERT INTO permisos (nombre, descripcion) VALUES 
('ver_datos_generales', 'Puede ver el módulo de Datos Generales'),
('ver_evaluaciones_control', 'Puede ver el módulo de Evaluaciones de Control'),
('ver_formacion_inicial', 'Puede ver el módulo de Formación Inicial'),
('ver_competencias_basicas', 'Puede ver el módulo de Competencias Básicas'),
('ver_evaluaciones_desempeno', 'Puede ver el módulo de Evaluaciones de Desempeño'),
('ver_reportes', 'Puede ver el módulo de Reportes'),
('ver_perfil', 'Puede ver el módulo de Perfil'),
('gestionar_usuarios', 'Puede gestionar usuarios y permisos')
ON CONFLICT (nombre) DO NOTHING;

-- Crear usuario administrador por defecto (contraseña: admin123)
-- La contraseña debe ser hasheada con bcrypt antes de insertarse
-- Este script es solo para referencia, en producción se debe usar un script de inicialización seguro
-- INSERT INTO usuarios (nombre_completo, email, area_adscripcion, telefono, username, password_hash, es_admin)
-- VALUES ('Administrador', 'admin@example.com', 'Sistemas', '1234567890', 'admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', TRUE);
