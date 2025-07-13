// generate-all-rooms.js
const fs = require('fs');
const path = require('path');
const generator = require('./tools/room-generator.js');

console.log('🏗️ Generating AMAN Venice rooms...');

const result = generator.runGeneration();

// Genera file HTML per camere
Object.keys(result.rooms.html).forEach(filename => {
    fs.writeFileSync(filename, result.rooms.html[filename]);
    console.log(`✅ Created ${filename}`);
});

// Genera configurazioni
if (!fs.existsSync('config/rooms')) {
    fs.mkdirSync('config/rooms', { recursive: true });
}

Object.keys(result.rooms.configs).forEach(filename => {
    const filepath = path.join('config/rooms', filename);
    fs.writeFileSync(filepath, JSON.stringify(result.rooms.configs[filename], null, 2));
    console.log(`✅ Created ${filepath}`);
});

console.log(`🎉 Generated ${result.summary.totalRooms} rooms successfully!`);