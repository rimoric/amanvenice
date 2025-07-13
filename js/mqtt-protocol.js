/**
 * AMAN Venice - MQTT Protocol Definitions
 * Definizione protocolli JSON per comunicazione MQTT
 * 
 * Gestisce:
 * - Parsing messaggi ricevuti dal PLC
 * - Creazione messaggi da inviare al PLC
 * - Validazione e mapping dati
 */

class MQTTProtocol {
    constructor() {
        console.log('📋 AMAN Venice MQTT Protocol inizializzato');
    }
    
    /**
     * DALI LIGHTS PROTOCOL
     * Mapping zone illuminazione per messaggi DALI
     */
    static DALI_ZONES = {
        // Zone di illuminazione con mappings
        'nTota': { name: 'Main', label: 'Illuminazione Principale' },
        'nParz': { name: 'Courtesy', label: 'Illuminazione Cortesia' },
        'nLett': { name: 'Bed', label: 'Illuminazione Letto' },
        'nCoSx': { name: 'LeftAbat', label: 'Abat Jour Sinistro' },
        'nCoDx': { name: 'RightAbat', label: 'Abat Jour Destro' },
        'nScri': { name: 'Desk', label: 'Illuminazione Scrivania' }
    };
    
    /**
     * Tipi di controllo riconosciuti
     */
    static CONTROL_TYPES = {
        DALI_LIGHTS: ['CameraLuci', 'BagnoLuci', 'SoggiornoLuci'],
        CLIMATE: ['CameraClima', 'BagnoClima', 'SoggiornoClima'],
        ONOFF: ['CameraOnOff', 'BagnoOnOff', 'SoggiornoOnOff'],
        MONOSTABLE: ['CameraMono', 'BagnoMono', 'SoggiornoMono']
    };
    
    /**
     * Parsing messaggio DALI ricevuto dal PLC
     */
    static parseDALIMessage(jsonData) {
        try {
            // Validazione base
            if (!jsonData.nCamera || !jsonData.sNome || !jsonData.Timestamp) {
                throw new Error('Messaggio DALI incompleto: mancano campi obbligatori');
            }
            
            // Verifica tipo controllo DALI
            if (!this.CONTROL_TYPES.DALI_LIGHTS.includes(jsonData.sNome)) {
                return null; // Non è un messaggio DALI lights
            }
            
            // Estrazione dati zone
            const zones = {};
            
            Object.keys(this.DALI_ZONES).forEach(zoneKey => {
                const levelKey = `${zoneKey}Liv`;
                const setKey = `${zoneKey}Set`;
                
                if (jsonData.hasOwnProperty(levelKey) && jsonData.hasOwnProperty(setKey)) {
                    zones[zoneKey] = {
                        name: this.DALI_ZONES[zoneKey].name,
                        label: this.DALI_ZONES[zoneKey].label,
                        currentLevel: this.validateLevel(jsonData[levelKey]),
                        setpoint: this.validateLevel(jsonData[setKey]),
                        isOn: jsonData[levelKey] > 0
                    };
                }
            });
            
            // Determinazione tipo room
            let roomType = 'Unknown';
            switch (jsonData.sNome) {
                case 'CameraLuci': roomType = 'Bedroom'; break;
                case 'BagnoLuci': roomType = 'Bathroom'; break;
                case 'SoggiornoLuci': roomType = 'Living'; break;
            }
            
            const parsedMessage = {
                timestamp: jsonData.Timestamp,
                roomNumber: jsonData.nCamera,
                roomType: roomType,
                controlName: jsonData.sNome,
                controlType: 'DALI_LIGHTS',
                zones: zones,
                raw: jsonData
            };
            
            console.log(`📋 Messaggio DALI parsato per Camera ${jsonData.nCamera} (${roomType}):`, parsedMessage);
            return parsedMessage;
            
        } catch (error) {
            console.error('❌ Errore parsing messaggio DALI:', error);
            return null;
        }
    }
    
    /**
     * Creazione messaggio DALI da inviare al PLC
     */
    static createDALICommand(roomNumber, roomType, zoneUpdates) {
        try {
            // Determinazione sNome in base al tipo room
            let sNome;
            switch (roomType.toLowerCase()) {
                case 'bedroom': sNome = 'CameraLuci'; break;
                case 'bathroom': sNome = 'BagnoLuci'; break;
                case 'living': sNome = 'SoggiornoLuci'; break;
                default: throw new Error(`Tipo room non supportato: ${roomType}`);
            }
            
            // Messaggio base
            const command = {
                Timestamp: new Date().toISOString(),
                nCamera: roomNumber,
                sNome: sNome
            };
            
            // Aggiunta zone modificate
            Object.keys(zoneUpdates).forEach(zoneKey => {
                const update = zoneUpdates[zoneKey];
                
                if (this.DALI_ZONES.hasOwnProperty(zoneKey)) {
                    // Aggiorna solo setpoint per i comandi
                    const setKey = `${zoneKey}Set`;
                    command[setKey] = this.validateLevel(update.setpoint || update.level || 0);
                }
            });
            
            console.log(`📤 Comando DALI creato per Camera ${roomNumber}:`, command);
            return command;
            
        } catch (error) {
            console.error('❌ Errore creazione comando DALI:', error);
            return null;
        }
    }
    
    /**
     * Validazione livello illuminazione (0-100)
     */
    static validateLevel(level) {
        const numLevel = parseInt(level);
        if (isNaN(numLevel)) return 0;
        return Math.max(0, Math.min(100, numLevel));
    }
    
    /**
     * Identificazione tipo messaggio ricevuto
     */
    static identifyMessageType(jsonData) {
        if (!jsonData.sNome) return 'UNKNOWN';
        
        // Controllo DALI Lights
        if (this.CONTROL_TYPES.DALI_LIGHTS.includes(jsonData.sNome)) {
            return 'DALI_LIGHTS';
        }
        
        // Controllo Climate
        if (this.CONTROL_TYPES.CLIMATE.includes(jsonData.sNome)) {
            return 'CLIMATE';
        }
        
        // Controllo On/Off
        if (this.CONTROL_TYPES.ONOFF.includes(jsonData.sNome)) {
            return 'ONOFF';
        }
        
        // Controllo Monostable
        if (this.CONTROL_TYPES.MONOSTABLE.includes(jsonData.sNome)) {
            return 'MONOSTABLE';
        }
        
        return 'UNKNOWN';
    }
    
    /**
     * Validazione generale messaggio ricevuto
     */
    static validateMessage(jsonData) {
        const errors = [];
        
        // Campi obbligatori base
        if (!jsonData.Timestamp) errors.push('Timestamp mancante');
        if (!jsonData.nCamera) errors.push('nCamera mancante');
        if (!jsonData.sNome) errors.push('sNome mancante');
        
        // Validazione nCamera
        if (jsonData.nCamera && (isNaN(jsonData.nCamera) || jsonData.nCamera < 1)) {
            errors.push('nCamera deve essere un numero positivo');
        }
        
        // Validazione Timestamp
        if (jsonData.Timestamp && isNaN(Date.parse(jsonData.Timestamp))) {
            errors.push('Timestamp non valido');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Generazione ID univoco per controlli
     */
    static generateControlId(roomNumber, controlType, zoneName = null) {
        const base = `room${roomNumber}_${controlType}`;
        return zoneName ? `${base}_${zoneName}` : base;
    }
    
    /**
     * Parsing configurazione room da numero
     */
    static getRoomConfig(roomNumber) {
        return {
            number: roomNumber,
            id: `room${roomNumber}`,
            containerId: `roomContainer${roomNumber}`,
            label: `Camera ${roomNumber}`
        };
    }
    
    /**
     * Informazioni debug protocollo
     */
    static getProtocolInfo() {
        return {
            version: '1.0.0',
            supportedTypes: Object.keys(this.CONTROL_TYPES),
            daliZones: Object.keys(this.DALI_ZONES),
            timestamp: new Date().toISOString()
        };
    }
}

// Export globale
window.MQTTProtocol = MQTTProtocol;
