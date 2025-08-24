# Sistema de Gestión Policial - SSCTIZAYUCA

Aplicación web para la gestión del personal policial del Sistema de Seguridad Ciudadana de Tizayuca.

## Características

- Registro de datos generales del personal policial
- Módulo de evaluaciones de control
- Gestión de formación inicial
- Registro de competencias básicas
- Evaluación de desempeño
- Generación de reportes

## Requisitos Previos

- PostgreSQL 12 o superior
- Navegador web moderno (Chrome, Firefox, Edge, Safari)
- DBeaver (o cualquier otro cliente de base de datos compatible con PostgreSQL)

## Instalación

### 1. Configuración de la Base de Datos

1. Abre DBeaver y conéctate a tu servidor PostgreSQL.
2. Crea una nueva base de datos llamada `lalo` o ejecuta el script SQL proporcionado en `database/create_tables.sql`.
3. Ejecuta el script SQL para crear las tablas necesarias.

### 2. Configuración de la Aplicación Web

1. Clona o descarga este repositorio en tu servidor web local (por ejemplo, XAMPP, WAMP, etc.).
2. Asegúrate de que todos los archivos estén en el directorio raíz de tu servidor web.
3. Si es necesario, configura los permisos de escritura en la carpeta donde se subirán las fotos de perfil.

## Estructura del Proyecto

```
SSCTIZAYUCA/
├── css/
│   └── styles.css         # Estilos principales de la aplicación
├── js/
│   └── main.js            # Lógica principal de la aplicación
├── img/
│   └── default-avatar.png # Imagen de perfil por defecto
├── database/
│   └── create_tables.sql  # Scripts de creación de la base de datos
└── index.html             # Página principal de la aplicación
```

## Uso

1. Abre el archivo `index.html` en tu navegador web.
2. Navega por las diferentes pestañas del menú lateral para acceder a las distintas funcionalidades.
3. Completa los formularios con la información requerida y guarda los cambios.

## Configuración de la Base de Datos

El script SQL proporcionado crea las siguientes tablas:

- `personal`: Almacena la información general del personal policial.
- `historial_cambios`: Registra todos los cambios realizados en la base de datos.

## Personalización

Puedes personalizar la aplicación modificando los siguientes archivos:

- `css/styles.css`: Para cambiar los estilos visuales.
- `js/main.js`: Para modificar la lógica de la aplicación.
- `index.html`: Para cambiar la estructura de la interfaz de usuario.

## Seguridad

- Asegúrate de configurar los permisos adecuados en el servidor web.
- No expongas la aplicación a Internet sin implementar las medidas de seguridad adecuadas.
- Considera implementar autenticación y autorización si la aplicación estará disponible en red.

## Soporte

Para soporte técnico o preguntas, por favor contacta al administrador del sistema.

## Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).

---

**Nota:** Esta es una versión inicial de la aplicación. Se recomienda realizar pruebas exhaustivas antes de implementarla en un entorno de producción.
