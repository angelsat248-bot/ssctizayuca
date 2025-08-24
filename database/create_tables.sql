-- Script para crear la base de datos y las tablas del sistema de gestión policial SSCTIZAYUCA

-- Crear la base de datos (ejecutar primero en DBeaver)
-- CREATE DATABASE lalo
--     WITH 
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'Spanish_Mexico.1252'
--     LC_CTYPE = 'Spanish_Mexico.1252'
--     TABLESPACE = pg_default
--     CONNECTION LIMIT = -1;

-- Conectarse a la base de datos 'lalo' antes de ejecutar el resto del script

-- Crear la tabla para almacenar los datos generales del personal
CREATE TABLE IF NOT EXISTS personal (
    id SERIAL PRIMARY KEY,
    apellido_paterno VARCHAR(50) NOT NULL,
    apellido_materno VARCHAR(50) NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    fecha_nacimiento DATE NOT NULL,
    fecha_ingreso DATE NOT NULL,
    grado_cargo VARCHAR(50) NOT NULL,
    sexo VARCHAR(20) NOT NULL,
    curp VARCHAR(18) UNIQUE NOT NULL,
    escolaridad VARCHAR(50) NOT NULL,
    telefono_contacto VARCHAR(10) NOT NULL,
    foto_perfil VARCHAR(255),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear un índice para búsquedas rápidas por CURP
CREATE INDEX IF NOT EXISTS idx_personal_curp ON personal(curp);

-- Crear un índice para búsquedas por apellidos
CREATE INDEX IF NOT EXISTS idx_personal_apellidos ON personal(apellido_paterno, apellido_materno);

-- Crear un disparador para actualizar automáticamente la fecha de actualización
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_fecha_actualizacion
BEFORE UPDATE ON personal
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion();

-- Comentarios para la documentación
COMMENT ON TABLE personal IS 'Almacena la información general del personal policial';
COMMENT ON COLUMN personal.id IS 'Identificador único del registro';
COMMENT ON COLUMN personal.apellido_paterno IS 'Apellido paterno del personal';
COMMENT ON COLUMN personal.apellido_materno IS 'Apellido materno del personal';
COMMENT ON COLUMN personal.nombres IS 'Nombre(s) del personal';
COMMENT ON COLUMN personal.fecha_nacimiento IS 'Fecha de nacimiento del personal';
COMMENT ON COLUMN personal.fecha_ingreso IS 'Fecha de ingreso a la institución';
COMMENT ON COLUMN personal.grado_cargo IS 'Grado o cargo que ocupa en la institución';
COMMENT ON COLUMN personal.sexo IS 'Sexo del personal';
COMMENT ON COLUMN personal.curp IS 'Clave Única de Registro de Población';
COMMENT ON COLUMN personal.escolaridad IS 'Nivel máximo de estudios';
COMMENT ON COLUMN personal.telefono_contacto IS 'Número de teléfono de contacto';
COMMENT ON COLUMN personal.foto_perfil IS 'Ruta de la fotografía de perfil';
COMMENT ON COLUMN personal.fecha_creacion IS 'Fecha y hora de creación del registro';
COMMENT ON COLUMN personal.fecha_actualizacion IS 'Fecha y hora de la última actualización del registro';

-- Crear una tabla para el historial de cambios (opcional)
CREATE TABLE IF NOT EXISTS historial_cambios (
    id SERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(50) NOT NULL,
    id_registro_afectado INTEGER NOT NULL,
    tipo_cambio VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_responsable VARCHAR(100),
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear una función para registrar cambios en la tabla personal
CREATE OR REPLACE FUNCTION registrar_cambio_personal()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historial_cambios (
            tabla_afectada,
            id_registro_afectado,
            tipo_cambio,
            datos_nuevos,
            usuario_responsable
        ) VALUES (
            'personal',
            NEW.id,
            'INSERT',
            row_to_json(NEW),
            current_user
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO historial_cambios (
            tabla_afectada,
            id_registro_afectado,
            tipo_cambio,
            datos_anteriores,
            datos_nuevos,
            usuario_responsable
        ) VALUES (
            'personal',
            NEW.id,
            'UPDATE',
            row_to_json(OLD),
            row_to_json(NEW),
            current_user
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO historial_cambios (
            tabla_afectada,
            id_registro_afectado,
            tipo_cambio,
            datos_anteriores,
            usuario_responsable
        ) VALUES (
            'personal',
            OLD.id,
            'DELETE',
            row_to_json(OLD),
            current_user
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger para la tabla personal
CREATE TRIGGER trigger_historial_personal
AFTER INSERT OR UPDATE OR DELETE ON personal
FOR EACH ROW
EXECUTE FUNCTION registrar_cambio_personal();

-- Crear una vista para consultar los datos del personal de manera más sencilla
CREATE OR REPLACE VIEW vista_personal AS
SELECT 
    id,
    apellido_paterno || ' ' || apellido_materno || ' ' || nombres AS nombre_completo,
    fecha_nacimiento,
    fecha_ingreso,
    grado_cargo,
    sexo,
    curp,
    escolaridad,
    telefono_contacto,
    foto_perfil,
    fecha_creacion,
    fecha_actualizacion
FROM 
    personal
ORDER BY 
    apellido_paterno, apellido_materno, nombres;
