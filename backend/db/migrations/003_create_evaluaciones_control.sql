-- Crear tabla para evaluaciones de control
CREATE TABLE IF NOT EXISTS evaluaciones_control (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    cuip VARCHAR(16) NOT NULL,
    tipo_evaluacion VARCHAR(100) NOT NULL,
    fecha_evaluacion DATE NOT NULL,
    resultado VARCHAR(100) NOT NULL,
    vigencia DATE NOT NULL,
    archivo_pdf VARCHAR(255),
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    CONSTRAINT fk_personal FOREIGN KEY (personal_id) REFERENCES personal(id)
);

-- Índice para búsquedas por CUIP
CREATE INDEX IF NOT EXISTS idx_evaluaciones_control_cuip ON evaluaciones_control(cuip);

-- Índice para búsquedas por personal_id
CREATE INDEX IF NOT EXISTS idx_evaluaciones_control_personal ON evaluaciones_control(personal_id);
