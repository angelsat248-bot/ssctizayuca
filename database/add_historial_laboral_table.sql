-- Crear la tabla historial_laboral
CREATE TABLE IF NOT EXISTS historial_laboral (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    cup VARCHAR(50),
    cup_vigencia DATE,
    funcion TEXT,
    fecha_ingreso DATE,
    fecha_baja DATE,
    motivo_baja TEXT,
    observaciones TEXT,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_historial_laboral_personal_id ON historial_laboral(personal_id);
CREATE INDEX IF NOT EXISTS idx_historial_laboral_cup ON historial_laboral(cup);

-- Comentarios para la documentación
COMMENT ON TABLE historial_laboral IS 'Almacena el historial laboral del personal';
COMMENT ON COLUMN historial_laboral.id IS 'Identificador único del registro';
COMMENT ON COLUMN historial_laboral.personal_id IS 'ID del personal al que pertenece el registro';
COMMENT ON COLUMN historial_laboral.cup IS 'Clave Única de Puesto';
COMMENT ON COLUMN historial_laboral.cup_vigencia IS 'Vigencia del CUP';
COMMENT ON COLUMN historial_laboral.funcion IS 'Función o puesto desempeñado';
COMMENT ON COLUMN historial_laboral.fecha_ingreso IS 'Fecha de ingreso al puesto';
COMMENT ON COLUMN historial_laboral.fecha_baja IS 'Fecha de baja del puesto';
COMMENT ON COLUMN historial_laboral.motivo_baja IS 'Motivo de la baja';
COMMENT ON COLUMN historial_laboral.observaciones IS 'Observaciones adicionales';

-- Crear el trigger para actualizar automáticamente la fecha de actualización
CREATE OR REPLACE FUNCTION actualizar_fecha_actualizacion_historial()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_fecha_actualizacion_historial
BEFORE UPDATE ON historial_laboral
FOR EACH ROW
EXECUTE FUNCTION actualizar_fecha_actualizacion_historial();
