-- Tabla para Historial Laboral
CREATE TABLE historial_laboral (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    cup VARCHAR(16) NOT NULL,
    cup_vigencia DATE NOT NULL,
    funcion TEXT,
    direccion TEXT,
    periodo TEXT, -- O podrías usar DATERANGE si tu versión de PostgreSQL lo soporta bien
    documento_comprobatorio VARCHAR(255),
    portacion_armas_fuego BOOLEAN,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para Incapacidades y Ausencias Justificadas
CREATE TABLE incapacidades_ausencias (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    motivo TEXT,
    fechas TEXT,
    documentos VARCHAR(255),
    trayectoria_institucional TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para Estímulos y Sanciones
CREATE TABLE estimulos_sanciones (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    tipo VARCHAR(50), -- 'Estímulo' o 'Sanción'
    fundamento TEXT,
    descripcion TEXT,
    fecha DATE,
    documento VARCHAR(255),
    motivo TEXT,
    resultado TEXT,
    cumplimiento TEXT,
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para Separación del Servicio
CREATE TABLE separacion_servicio (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id) ON DELETE CASCADE,
    motivo TEXT,
    fecha_baja DATE,
    documentos VARCHAR(255),
    fecha_registro TIMESTAMPTZ DEFAULT NOW()
);
