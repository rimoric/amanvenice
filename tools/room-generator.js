/**
 * AMAN Venice Room Generator
 * Script per generare automaticamente file HTML e JSON per tutte le camere
 */

// Configurazione camere disponibili
const ROOM_NUMBERS = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    14, 15, 16,
    18, 19, 20, 21, 22, 23, 24, 25, 26
];

// Template base HTML (minified per brevità)
const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMAN Venice - Room {{ROOM_NUMBER}}</title>
    <script>
        // Set room number before loading base dashboard
        window.AMAN_ROOM_NUMBER = '{{ROOM_NUMBER_PADDED}}';
    </script>
    <script src="js/aman-dashboard-base.js"></script>
</head>
<body>
    <!-- Content will be loaded by base dashboard -->
    <div id="roomLoader">
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #1a4a3a, #d4af37); color: white; font-family: Arial, sans-serif;">
            <div style="text-align: center;">
                <h1>🏨 AMAN Venice</h1>
                <h2>Room {{ROOM_NUMBER}}</h2>
                <p>Loading dashboard...</p>
            </div>
        </div>
    </div>
</body>
</html>`;

// Template configurazione JSON base
const CONFIG_TEMPLATE = {
    "roomNumber": null,
    "roomName": null,
    "theme": "aman-venice",
    "password": null,
    "tabs": [
        {
            "id": "bedroom",
            "name": "🛏️ Bedroom",
            "subtitle": "Lighting & Climate Control",
            "controls": [
                {
                    "type": "dali-light",
                    "zone": "lighting",
                    "config": {
                        "name": "Bedroom Lights",
                        "mqttDevice": "CameraLuci",
                        "zones": {
                            "Main": "nTota",
                            "Courtesy": "nParz",
                            "Bed": "nLett",
                            "LeftAbat": "nCoSx",
                            "RightAbat": "nCoDx",
                            "Desk": "nScri"
                        }
                    }
                }
            ]
        },
        {
            "id": "bathroom",
            "name": "🚿 Bathroom",
            "subtitle": "Lighting & Heating Control",
            "controls": [
                {
                    "type": "dali-light",
                    "zone": "lighting",
                    "config": {
                        "name": "Bathroom Lights",
                        "mqttDevice": "BagnoLuci",
                        "zones": {
                            "Main": "nTota",
                            "Courtesy": "nParz"
                        }
                    }
                },
                {
                    "type": "onoff-control",
                    "zone": "heating",
                    "config": {
                        "name": "Towel Heater",
                        "mqttDevice": "ScaldaOnOff",
                        "icon": "🔥"
                    }
                }
            ]
        },
        {
            "id": "settings",
            "name": "⚙️ Settings",
            "subtitle": "System Reset & Service Controls",
            "controls": [
                {
                    "type": "monostable-control",
                    "zone": "system",
                    "config": {
                        "name": "Light Reset",
                        "mqttDevice": "ResetLuci",
                        "icon": "🔄",
                        "buttonText": "RESET LIGHTS",
                        "executingText": "Resetting all lights...",
                        "completedText": "All lights reset successfully"
                    }
                },
                {
                    "type": "monostable-control",
                    "zone": "system",
                    "config": {
                        "name": "Climate Reset",
                        "mqttDevice": "ResetClima",
                        "icon": "🔄",
                        "buttonText": "RESET CLIMATE",
                        "executingText": "Resetting climate system...",
                        "completedText": "Climate system reset successfully"
                    }
                },
                {
                    "type": "monostable-control",
                    "zone": "system",
                    "config": {
                        "name": "Light Turn-Down",
                        "mqttDevice": "TurnDown",
                        "icon": "🌙",
                        "buttonText": "TURN-DOWN SERVICE",
                        "executingText": "Activating turn-down service...",
                        "completedText": "Turn-down service completed"
                    }
                }
            ]
        }
    ],
    "mqtt": {
        "broker": "broker.emqx.io:8084",
        "topicPub": "Camere/Hmi",
        "topicSub": "Camere/Plc",
        "qos": 1
    },
    "ui": {
        "theme": "aman-venice",
        "colors": {
            "primary": "#1a4a3a",
            "secondary": "#d4af37",
            "accent": "#911e42"
        }
    }
};

/**
 * Genera file HTML per una specifica camera
 */
function generateRoomHTML(roomNumber) {
    const roomNumberPadded = roomNumber.toString().padStart(2, '0');
    
    return HTML_TEMPLATE
        .replace(/{{ROOM_NUMBER}}/g, roomNumber.toString())
        .replace(/{{ROOM_NUMBER_PADDED}}/g, roomNumberPadded);
}

/**
 * Genera configurazione JSON per una specifica camera
 */
function generateRoomConfig(roomNumber) {
    const roomNumberPadded = roomNumber.toString().padStart(2, '0');
    const config = JSON.parse(JSON.stringify(CONFIG_TEMPLATE)); // Deep clone
    
    config.roomNumber = roomNumber;
    config.roomName = `Room ${roomNumberPadded}`;
    config.password = roomNumberPadded;
    
    return config;
}

/**
 * Genera tutti i file per tutte le camere
 */
function generateAllRooms() {
    const generated = {
        html: {},
        configs: {},
        fileList: []
    };
    
    ROOM_NUMBERS.forEach(roomNumber => {
        const roomNumberPadded = roomNumber.toString().padStart(2, '0');
        
        // Genera HTML
        const html = generateRoomHTML(roomNumber);
        generated.html[`room-${roomNumberPadded}.html`] = html;
        
        // Genera Config
        const config = generateRoomConfig(roomNumber);
        generated.configs[`room-${roomNumberPadded}.json`] = config;
        
        // Aggiungi alla lista file
        generated.fileList.push({
            room: roomNumber,
            htmlFile: `room-${roomNumberPadded}.html`,
            configFile: `config/rooms/room-${roomNumberPadded}.json`,
            url: `room-${roomNumberPadded}.html`
        });
    });
    
    return generated;
}

/**
 * Genera struttura directory completa
 */
function generateDirectoryStructure() {
    return {
        // Root files
        "index.html": generateIndexHTML(),
        "README.md": generateReadme(),
        
        // JavaScript modules
        "js/": {
            "aman-dashboard-base.js": "// Dashboard base completo (da dashboard-base artifact)",
            "mqtt-protocol.js": "// Copiare da mqtt-protocol.js fornito",
            "mqtt-manager.js": "// Copiare da mqtt-manager.js fornito", 
            "mqtt-handlers.js": "// Copiare da mqtt-handlers.js fornito",
            "mqtt-senders.js": "// Copiare da mqtt-senders.js fornito",
            "dali-mqtt.js": "// Copiare da dali-mqtt.js fornito"
        },
        
        // Configuration directory
        "config/": {
            "rooms/": generateRoomConfigs(),
            "global-config.json": generateGlobalConfig()
        },
        
        // Assets directory
        "assets/": {
            "images/": {
                "AmanVeniceCameraLogo.png": "// Logo fornito nel primo prompt"
            },
            "themes/": {
                "aman-venice.css": "// Tema AMAN Venice"
            }
        },
        
        // Room HTML files
        "rooms/": generateRoomHTMLs()
    };
}

/**
 * Genera index.html principale
 */
function generateIndexHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMAN Venice - Room Selection</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #1a4a3a, #d4af37);
            min-height: 100vh;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            width: 120px;
            height: 120px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: bold;
        }
        .rooms-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            max-width: 800px;
            width: 90%;
        }
        .room-card {
            background: rgba(255,255,255,0.1);
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none