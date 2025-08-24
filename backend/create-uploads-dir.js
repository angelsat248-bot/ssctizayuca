const fs = require('fs');
const path = require('path');

// Define the base uploads directory
const baseDir = path.join(__dirname, '..', 'uploads');
const subDirs = [
    'evaluacion-desempeno',
    'evaluaciones',
    'formacion-inicial',
    'competencias-basicas'
];

// Create the base uploads directory if it doesn't exist
if (!fs.existsSync(baseDir)) {
    console.log(`Creating base uploads directory: ${baseDir}`);
    fs.mkdirSync(baseDir, { recursive: true });
}

// Create all subdirectories
subDirs.forEach(dir => {
    const dirPath = path.join(baseDir, dir);
    if (!fs.existsSync(dirPath)) {
        console.log(`Creating directory: ${dirPath}`);
        fs.mkdirSync(dirPath, { recursive: true });
    } else {
        console.log(`Directory already exists: ${dirPath}`);
    }
});

console.log('Uploads directory structure is ready!');
