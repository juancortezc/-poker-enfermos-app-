const fs = require('fs');

/**
 * Script para crear archivos de sonido placeholder para notificaciones
 * Crea archivos JSON con configuración para generar sonidos via Web Audio API
 */

// Configuraciones de sonido
const soundConfigs = {
  'warning.mp3': {
    type: 'tone',
    frequency: 800,
    duration: 0.5,
    volume: 0.3,
    description: 'Tono de advertencia para 1 minuto restante'
  },
  'blind-change.mp3': {
    type: 'chord',
    frequencies: [800, 1000, 1200],
    duration: 0.8,
    volume: 0.4,
    description: 'Acorde para cambio de blinds'
  },
  'elimination.mp3': {
    type: 'tone',
    frequency: 400,
    duration: 0.6,
    volume: 0.3,
    description: 'Tono bajo para eliminación'
  },
  'winner.mp3': {
    type: 'melody',
    frequencies: [800, 1000, 1200, 1500],
    duration: 1.2,
    volume: 0.5,
    description: 'Melodía ascendente para ganador'
  },
  'completion.mp3': {
    type: 'tone',
    frequency: 600,
    duration: 0.7,
    volume: 0.3,
    description: 'Tono medio para fecha completada'
  }
};

// Crear archivo README para sonidos
const readme = `# Notification Sounds

Este directorio contiene los archivos de sonido para las notificaciones del sistema de poker.

## Archivos disponibles:

${Object.entries(soundConfigs).map(([file, config]) => 
  `- **${file}**: ${config.description} (${config.duration}s)`
).join('\n')}

## Configuración:

Los sonidos se generan dinámicamente usando Web Audio API en el navegador.
Si quieres reemplazar con archivos MP3 reales, colócalos en este directorio.

## Formato soportado:
- MP3 (recomendado)
- WAV
- OGG
`;

// Crear archivos placeholder (vacíos para que las rutas funcionen)
Object.keys(soundConfigs).forEach(filename => {
  fs.writeFileSync(`./public/sounds/${filename}`, '');
  console.log(`✅ Created placeholder: ${filename}`);
});

// Guardar configuración para uso en el navegador
fs.writeFileSync('./public/sounds/config.json', JSON.stringify(soundConfigs, null, 2));
fs.writeFileSync('./public/sounds/README.md', readme);

console.log('\n🎵 Notification sound placeholders created successfully!');
console.log('📋 Configuration saved in config.json');
console.log('📝 Documentation saved in README.md');