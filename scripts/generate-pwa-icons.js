// Script para generar iconos PWA básicos temporales
// Este script creará iconos simples con el logo de "PE" hasta que se diseñen iconos profesionales

const fs = require('fs');
const path = require('path');

// Función para crear un SVG simple
function createIconSVG(size) {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E10600;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#A01400;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.1}" fill="url(#grad)"/>
  <circle cx="${size * 0.5}" cy="${size * 0.5}" r="${size * 0.35}" fill="none" stroke="white" stroke-width="${size * 0.03}"/>
  <text x="${size * 0.5}" y="${size * 0.6}" font-family="Arial, sans-serif" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle">PE</text>
</svg>
  `.trim();
}

// Función para convertir SVG a data URL para crear imagen
function svgToDataUrl(svg) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Tamaños necesarios para PWA
const iconSizes = [16, 32, 57, 60, 72, 76, 96, 114, 120, 128, 144, 152, 180, 192, 384, 512];

const iconsDir = path.join(__dirname, '../public/icons');

// Crear directorio si no existe
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generar un archivo de referencia con las instrucciones
const instructions = `
# PWA Icons Generation

Este directorio contiene los iconos necesarios para la PWA de Poker Enfermos.

## Iconos requeridos:
${iconSizes.map(size => `- icon-${size}x${size}.png (${size}px x ${size}px)`).join('\n')}

## Para generar iconos profesionales:

1. Crear un logo vectorial en formato SVG o diseño en alta resolución
2. Usar herramientas como:
   - PWA Builder (https://www.pwabuilder.com/imageGenerator)
   - RealFaviconGenerator (https://realfavicongenerator.net/)
   - Figma/Adobe Illustrator para exportar en múltiples tamaños

## Colores del branding:
- Primary: #E10600 (Poker Red)
- Secondary: #000000 (Black)
- Background: #1a1a1a (Dark Gray)

## Recomendaciones:
- Usar diseño simple y legible en tamaños pequeños
- Asegurar contraste en fondos claros y oscuros
- Incluir versiones "maskable" para Android
- Probar en diferentes dispositivos iOS/Android

Iconos temporales generados con script automático hasta crear diseño final.
`;

fs.writeFileSync(path.join(iconsDir, 'README.md'), instructions);

// Crear un SVG temporal para cada tamaño
iconSizes.forEach(size => {
  const svg = createIconSVG(size);
  const fileName = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, fileName), svg);
});

console.log('✅ Iconos temporales generados en /public/icons/');
console.log('📝 Instrucciones creadas en /public/icons/README.md');
console.log('⚠️  Reemplazar con iconos profesionales antes de producción');