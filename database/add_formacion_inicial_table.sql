-- Script para crear la tabla formacion_inicial

-- Crear la tabla formacion_inicial
CREATE TABLE IF NOT EXISTS formacion_inicial (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    curso VARCHAR(255) NOT NULL,
    tipo VARCHAR(100) NOT NULL,
    institucion VARCHAR(255) NOT NULL,
    fecha DATE NOT NULL,
    resultado VARCHAR(50) NOT NULL,
    observaciones TEXT,
    archivo_pdf VARCHAR(500),
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Índices para mejorar el rendimiento de las consultas
    CONSTRAINT fk_personal FOREIGN KEY (personal_id) REFERENCES personal(id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_formacion_personal_id ON formacion_inicial(personal_id);
CREATE INDEX IF NOT EXISTS idx_formacion_fecha ON formacion_inicial(fecha);
CREATE INDEX IF NOT EXISTS idx_formacion_activo ON formacion_inicial(activo);

-- Comentarios para documentar la tabla y sus columnas
COMMENT ON TABLE formacion_inicial IS 'Almacena los registros de formación inicial del personal';
COMMENT ON COLUMN formacion_inicial.id IS 'Identificador único del registro de formación';
COMMENT ON COLUMN formacion_inicial.personal_id IS 'ID del personal al que pertenece el registro';
COMMENT ON COLUMN formacion_inicial.curso IS 'Nombre del curso de formación';
COMMENT ON COLUMN formacion_inicial.tipo IS 'Tipo de formación (Inducción, Capacitación, etc.)';
COMMENT ON COLUMN formacion_inicial.institucion IS 'Institución que impartió la formación';
COMMENT ON COLUMN formacion_inicial.fecha IS 'Fecha en que se realizó la formación';
COMMENT ON COLUMN formacion_inicial.resultado IS 'Resultado de la formación (Aprobado, No Aprobado, En Proceso)';
COMMENT ON COLUMN formacion_inicial.observaciones IS 'Observaciones adicionales sobre la formación';
COMMENT ON COLUMN formacion_inicial.archivo_pdf IS 'Ruta al archivo PDF del certificado o constancia';
COMMENT ON COLUMN formacion_inicial.activo IS 'Indica si el registro está activo (borrado lógico)';
COMMENT ON COLUMN formacion_inicial.fecha_creacion IS 'Fecha de creación del registro';
COMMENT ON COLUMN formacion_inicial.fecha_actualizacion IS 'Fecha de la última actualización del registro';

-- Función para actualizar automáticamente la fecha de actualización
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger para actualizar automáticamente la fecha de actualización
DROP TRIGGER IF EXISTS update_formacion_modtime ON formacion_inicial;
CREATE TRIGGER update_formacion_modtime
BEFORE UPDATE ON formacion_inicial
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
