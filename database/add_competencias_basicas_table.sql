CREATE TABLE competencias_basicas (
    id SERIAL PRIMARY KEY,
    personal_id INTEGER NOT NULL REFERENCES personal(id),
    vigencia INTEGER NOT NULL,
    resultado VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL,
    institucion VARCHAR(255) NOT NULL,
    enlaces TEXT,
    observaciones TEXT,
    archivo_pdf VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
