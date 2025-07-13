/**
 * AMAN Venice - MQTT Senders
 * Gestione invio comandi MQTT verso PLC
 * 
 * Funzionalità:
 * - Invio comandi DALI (On/Off e Livelli)
 * - Invio comandi Climate (preparato)
 * - Invio comandi On/Off (preparato)
 * - Invio comandi Monostable (preparato)
 * - Queue messaggi e retry logic
 */

class MQTTSenders {
    constructor() {
        this.mqttManager = null;
        this.sendQueue = [];
        this.isProcessingQueue = false;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 secondo
        
        console.log('📤 AMAN Venice MQTT Senders inizializzato');
    }
    
    /**
     * Inizializzazione con MQTT Manager
     */
    initialize(mqttManager) {
        if (!mqttManager) {
            console.error('❌ MQTT Manager richiesto per MQTT Senders');
            return false;
        }
        
        this.mqttManager = mqttManager;
        console.log('✅ MQTT Senders collegato al manager');
        return true;
    }
    
    /**
     * DALI MAPPINGS per conversione nomi
     */
    static DALI_MAPPINGS = {
        // Room Type Mappings (da roomType a sLocale)
        roomTypes: {
            'Bedroom': 'Camera',
            'Bathroom': 'Bagno', 
            'Living': 'Soggiorno'
        },
        
        // Zone Name Mappings (da zone name a sNome)
        zoneNames: {
            'Main': 'Totale',
            'Courtesy': 'Parziale',
            'Bed': 'Letto',
            'LeftAbat': 'ComodinoSx',
            'RightAbat': 'ComodinoDx',
            'Desk': 'Scrivania'
        },
        
        // Reverse mappings per debug
        reverseRoomTypes: {
            'Camera': 'Bedroom',
            'Bagno': 'Bathroom',
            'Soggiorno': 'Living'
        },
        
        reverseZoneNames: {
            'Totale': 'Main',
            'Parziale': 'Courtesy',
            'Letto': 'Bed',
            'ComodinoSx': 'LeftAbat',
            'ComodinoDx': 'RightAbat',
            'Scrivania': 'Desk'
        }
    };
    
    /**
     * Invio comando DALI On/Off
     */
    sendDALIOnOff(roomNumber, roomType, zoneName, isOn) {
        try {
            // Validazione parametri
            if (!roomNumber || !roomType || !zoneName) {
                throw new Error('Parametri obbligatori mancanti per comando DALI On/Off');
            }
            
            // Conversione room type
            const sLocale = this.DALI_MAPPINGS.roomTypes[roomType];
            if (!sLocale) {
                throw new Error(`Room type non supportato: ${roomType}`);
            }
            
            // Conversione zone name
            const sNome = this.DALI_MAPPINGS.zoneNames[zoneName];
            if (!sNome) {
                throw new Error(`Zone name non supportato: ${zoneName}`);
            }
            
            // Creazione messaggio comando
            const command = {
                nCamera: roomNumber,
                sLocale: sLocale,
                sNome: sNome,
                bOnOff: Boolean(isOn)
            };
            
            console.log(`💡 Invio comando DALI On/Off:`, command);
            console.log(`  📍 Camera ${roomNumber} (${roomType}) - ${zoneName} → ${isOn ? 'ON' : 'OFF'}`);
            
            // Invio comando
            return this.sendCommand(command, 'DALI_ONOFF');
            
        } catch (error) {
            console.error('❌ Errore creazione comando DALI On/Off:', error);
            return false;
        }
    }
    
    /**
     * Invio comando DALI Livello
     */
    sendDALILevel(roomNumber, roomType, zoneName, level) {
        try {
            // Validazione parametri
            if (!roomNumber || !roomType || !zoneName || level === undefined) {
                throw new Error('Parametri obbligatori mancanti per comando DALI Level');
            }
            
            // Validazione livello
            const validLevel = Math.max(0, Math.min(100, parseInt(level)));
            
            // Conversione room type
            const sLocale = this.DALI_MAPPINGS.roomTypes[roomType];
            if (!sLocale) {
                throw new Error(`Room type non supportato: ${roomType}`);
            }
            
            // Conversione zone name
            const sNome = this.DALI_MAPPINGS.zoneNames[zoneName];
            if (!sNome) {
                throw new Error(`Zone name non supportato: ${zoneName}`);
            }
            
            // Creazione messaggio comando
            const command = {
                nCamera: roomNumber,
                sLocale: sLocale,
                sNome: sNome,
                nLivello: validLevel
            };
            
            console.log(`🎛️ Invio comando DALI Level:`, command);
            console.log(`  📍 Camera ${roomNumber} (${roomType}) - ${zoneName} → ${validLevel}%`);
            
            // Invio comando
            return this.sendCommand(command, 'DALI_LEVEL');
            
        } catch (error) {
            console.error('❌ Errore creazione comando DALI Level:', error);
            return false;
        }
    }
    
    /**
     * Invio comando DALI combinato (On/Off + Level se necessario)
     */
    sendDALICommand(roomNumber, roomType, zoneName, level, forceOnOff = null) {
        try {
            const validLevel = Math.max(0, Math.min(100, parseInt(level || 0)));
            const shouldBeOn = validLevel > 0;
            
            // Determinazione se serve comando On/Off
            let needsOnOff = forceOnOff !== null ? forceOnOff : shouldBeOn;
            
            console.log(`🎯 Comando DALI combinato Camera ${roomNumber} ${zoneName}:`);
            console.log(`  🎛️ Livello: ${validLevel}%`);
            console.log(`  ⚡ On/Off: ${needsOnOff ? 'ON' : 'OFF'}`);
            
            let success = true;
            
            // Se livello è 0 o forceOnOff è false, invia solo OFF
            if (validLevel === 0 || forceOnOff === false) {
                success = this.sendDALIOnOff(roomNumber, roomType, zoneName, false);
            }
            // Se livello > 0 o forceOnOff è true, invia ON e poi Level
            else if (validLevel > 0 || forceOnOff === true) {
                // Prima accendi
                success = this.sendDALIOnOff(roomNumber, roomType, zoneName, true);
                
                // Poi imposta livello (con piccolo delay)
                if (success && validLevel !== 100) {
                    setTimeout(() => {
                        this.sendDALILevel(roomNumber, roomType, zoneName, validLevel);
                    }, 200);
                }
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ Errore comando DALI combinato:', error);
            return false;
        }
    }
    
    /**
     * Invio comando generico
     */
    sendCommand(commandData, commandType = 'GENERIC') {
        if (!this.mqttManager) {
            console.error('❌ MQTT Manager non inizializzato');
            return false;
        }
        
        if (!this.mqttManager.isConnected) {
            console.warn('⚠️ MQTT non connesso, aggiunta comando a queue');
            this.addToQueue(commandData, commandType);
            return false;
        }
        
        try {
            // Aggiunta timestamp se non presente
            if (!commandData.Timestamp) {
                commandData.Timestamp = new Date().toISOString();
            }
            
            // Invio tramite MQTT Manager
            const success = this.mqttManager.publish(commandData);
            
            if (success) {
                console.log(`✅ Comando ${commandType} inviato con successo`);
            } else {
                console.error(`❌ Errore invio comando ${commandType}`);
                this.addToQueue(commandData, commandType);
            }
            
            return success;
            
        } catch (error) {
            console.error('❌ Errore invio comando:', error);
            this.addToQueue(commandData, commandType);
            return false;
        }
    }
    
    /**
     * Aggiunta comando a queue
     */
    addToQueue(commandData, commandType) {
        const queueItem = {
            id: Date.now() + Math.random(),
            commandData: { ...commandData },
            commandType: commandType,
            timestamp: new Date().toISOString(),
            retries: 0
        };
        
        this.sendQueue.push(queueItem);
        console.log(`📝 Comando aggiunto a queue: ${commandType}`);
        
        // Avvia processamento queue se non già attivo
        if (!this.isProcessingQueue) {
            this.processQueue();
        }
    }
    
    /**
     * Processamento queue comandi
     */
    async processQueue() {
        if (this.isProcessingQueue || this.sendQueue.length === 0) return;
        
        this.isProcessingQueue = true;
        console.log(`🔄 Processamento queue: ${this.sendQueue.length} comandi in attesa`);
        
        while (this.sendQueue.length > 0) {
            // Verifica connessione MQTT
            if (!this.mqttManager || !this.mqttManager.isConnected) {
                console.log('⏸️ MQTT disconnesso, pause queue processing');
                break;
            }
            
            const queueItem = this.sendQueue.shift();
            
            try {
                console.log(`🔄 Retry comando ${queueItem.commandType} (tentativo ${queueItem.retries + 1})`);
                
                const success = this.mqttManager.publish(queueItem.commandData);
                
                if (success) {
                    console.log(`✅ Comando ${queueItem.commandType} inviato da queue`);
                } else {
                    // Incrementa retry counter
                    queueItem.retries++;
                    
                    if (queueItem.retries < this.maxRetries) {
                        // Reinserisce in queue
                        this.sendQueue.push(queueItem);
                        console.log(`🔄 Comando ${queueItem.commandType} reinserito in queue (${queueItem.retries}/${this.maxRetries})`);
                    } else {
                        console.error(`❌ Comando ${queueItem.commandType} scartato dopo ${this.maxRetries} tentativi`);
                    }
                }
                
            } catch (error) {
                console.error('❌ Errore processamento queue:', error);
            }
            
            // Delay tra comandi
            if (this.sendQueue.length > 0) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            }
        }
        
        this.isProcessingQueue = false;
        
        if (this.sendQueue.length > 0) {
            console.log(`⏰ Queue processing completato, ${this.sendQueue.length} comandi rimasti`);
        } else {
            console.log('✅ Queue processing completato, tutti i comandi inviati');
        }
    }
    
    /**
     * PREPARATO: Invio comando Climate
     */
    sendClimateCommand(roomNumber, roomType, temperature, mode) {
        console.log(`🌡️ Comando Climate preparato - Camera ${roomNumber}: ${temperature}°C, mode: ${mode}`);
        // TODO: Implementazione futura per termostati
        return false;
    }
    
    /**
     * PREPARATO: Invio comando On/Off
     */
    sendOnOffCommand(roomNumber, roomType, deviceName, isOn) {
        console.log(`🔌 Comando On/Off preparato - Camera ${roomNumber} ${deviceName}: ${isOn ? 'ON' : 'OFF'}`);
        // TODO: Implementazione futura per controlli On/Off
        return false;
    }
    
    /**
     * PREPARATO: Invio comando Monostable
     */
    sendMonostableCommand(roomNumber, roomType, actionName) {
        console.log(`⚡ Comando Monostable preparato - Camera ${roomNumber} ${actionName}`);
        // TODO: Implementazione futura per comandi monostabili
        return false;
    }
    
    /**
     * Status queue comandi
     */
    getQueueStatus() {
        return {
            queueLength: this.sendQueue.length,
            isProcessing: this.isProcessingQueue,
            maxRetries: this.maxRetries,
            retryDelay: this.retryDelay,
            queueItems: this.sendQueue.map(item => ({
                type: item.commandType,
                retries: item.retries,
                timestamp: item.timestamp
            }))
        };
    }
    
    /**
     * Pulizia queue
     */
    clearQueue() {
        this.sendQueue = [];
        console.log('🧹 Queue comandi pulita');
    }
    
    /**
     * Test invio comando DALI
     */
    testDALICommand(roomNumber = 1) {
        console.log('🧪 Test comando DALI...');
        
        // Test On/Off
        setTimeout(() => {
            this.sendDALIOnOff(roomNumber, 'Bedroom', 'Main', true);
        }, 1000);
        
        // Test Level
        setTimeout(() => {
            this.sendDALILevel(roomNumber, 'Bedroom', 'Main', 75);
        }, 2000);
        
        // Test combinato
        setTimeout(() => {
            this.sendDALICommand(roomNumber, 'Bedroom', 'Courtesy', 50);
        }, 3000);
    }
    
    /**
     * Validazione mappings DALI
     */
    validateDALIMappings() {
        console.log('🔍 Validazione DALI Mappings:');
        
        console.log('Room Types:', this.DALI_MAPPINGS.roomTypes);
        console.log('Zone Names:', this.DALI_MAPPINGS.zoneNames);
        
        // Test conversioni
        Object.keys(this.DALI_MAPPINGS.roomTypes).forEach(roomType => {
            const sLocale = this.DALI_MAPPINGS.roomTypes[roomType];
            const reverse = this.DALI_MAPPINGS.reverseRoomTypes[sLocale];
            console.log(`  ${roomType} → ${sLocale} → ${reverse} ${roomType === reverse ? '✅' : '❌'}`);
        });
        
        Object.keys(this.DALI_MAPPINGS.zoneNames).forEach(zoneName => {
            const sNome = this.DALI_MAPPINGS.zoneNames[zoneName];
            const reverse = this.DALI_MAPPINGS.reverseZoneNames[sNome];
            console.log(`  ${zoneName} → ${sNome} → ${reverse} ${zoneName === reverse ? '✅' : '❌'}`);
        });
    }
}

// Export globale
window.MQTTSenders = MQTTSenders;
