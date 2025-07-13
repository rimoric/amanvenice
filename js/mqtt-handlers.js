/**
 * AMAN Venice - MQTT Message Handlers
 * Gestione ricezione e smistamento messaggi MQTT
 * 
 * Coordina:
 * - Ricezione messaggi dal topic Camere/Plc
 * - Parsing e validazione
 * - Smistamento ai controlli specifici
 * - Logging e debug
 */

class MQTTHandlers {
    constructor() {
        this.registeredHandlers = new Map();
        this.messageHistory = [];
        this.maxHistorySize = 100;
        
        console.log('🎯 AMAN Venice MQTT Handlers inizializzato');
    }
    
    /**
     * Inizializzazione sistema handlers
     */
    initialize(mqttManager) {
        if (!mqttManager) {
            console.error('❌ MQTTManager richiesto per inizializzazione handlers');
            return false;
        }
        
        this.mqttManager = mqttManager;
        
        // Registrazione handler principale per tutti i messaggi
        this.mqttManager.onMessage((topic, data) => {
            this.processMessage(topic, data);
        });
        
        // Registrazione handler connessione
        this.mqttManager.onConnection((connected, error) => {
            this.handleConnectionStatus(connected, error);
        });
        
        console.log('✅ MQTT Handlers collegati al manager');
        return true;
    }
    
    /**
     * Elaborazione messaggio ricevuto
     */
    processMessage(topic, jsonData) {
        try {
            // Log messaggio ricevuto
            console.log(`📨 Elaborazione messaggio da ${topic}:`, jsonData);
            
            // Aggiunta alla storia
            this.addToHistory(topic, jsonData);
            
            // Validazione messaggio
            const validation = MQTTProtocol.validateMessage(jsonData);
            if (!validation.valid) {
                console.warn('⚠️ Messaggio non valido:', validation.errors);
                return;
            }
            
            // Identificazione tipo messaggio
            const messageType = MQTTProtocol.identifyMessageType(jsonData);
            console.log(`🔍 Tipo messaggio identificato: ${messageType}`);
            
            // Smistamento in base al tipo
            switch (messageType) {
                case 'DALI_LIGHTS':
                    this.handleDALIMessage(jsonData);
                    break;
                    
                case 'CLIMATE':
                    this.handleClimateMessage(jsonData);
                    break;
                    
                case 'ONOFF':
                    this.handleOnOffMessage(jsonData);
                    break;
                    
                case 'MONOSTABLE':
                    this.handleMonostableMessage(jsonData);
                    break;
                    
                default:
                    console.warn(`⚠️ Tipo messaggio non gestito: ${messageType}`);
            }
            
        } catch (error) {
            console.error('❌ Errore elaborazione messaggio:', error);
        }
    }
    
    /**
     * Gestione messaggi DALI Lights
     */
    handleDALIMessage(jsonData) {
        try {
            // Parsing messaggio DALI
            const parsedData = MQTTProtocol.parseDALIMessage(jsonData);
            if (!parsedData) {
                console.warn('⚠️ Impossibile parsare messaggio DALI');
                return;
            }
            
            console.log(`💡 Gestione luci DALI Camera ${parsedData.roomNumber} (${parsedData.roomType})`);
            
            // Notifica handlers DALI registrati
            this.notifyHandlers('DALI_LIGHTS', parsedData);
            
            // Log dettagliato zone
            Object.keys(parsedData.zones).forEach(zoneKey => {
                const zone = parsedData.zones[zoneKey];
                console.log(`  📍 ${zone.label}: ${zone.currentLevel}% (set: ${zone.setpoint}%) - ${zone.isOn ? 'ON' : 'OFF'}`);
            });
            
        } catch (error) {
            console.error('❌ Errore gestione messaggio DALI:', error);
        }
    }
    
    /**
     * Gestione messaggi Climate (preparato per implementazione futura)
     */
    handleClimateMessage(jsonData) {
        console.log(`🌡️ Messaggio Climate ricevuto per Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        // TODO: Implementazione futura per termostati
        this.notifyHandlers('CLIMATE', jsonData);
    }
    
    /**
     * Gestione messaggi On/Off (preparato per implementazione futura)
     */
    handleOnOffMessage(jsonData) {
        console.log(`🔌 Messaggio On/Off ricevuto per Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        // TODO: Implementazione futura per controlli On/Off
        this.notifyHandlers('ONOFF', jsonData);
    }
    
    /**
     * Gestione messaggi Monostable (preparato per implementazione futura)
     */
    handleMonostableMessage(jsonData) {
        console.log(`⚡ Messaggio Monostable ricevuto per Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        // TODO: Implementazione futura per comandi monostabili
        this.notifyHandlers('MONOSTABLE', jsonData);
    }
    
    /**
     * Gestione stato connessione
     */
    handleConnectionStatus(connected, error) {
        if (connected) {
            console.log('✅ MQTT connesso - Handlers attivi');
        } else {
            console.warn('⚠️ MQTT disconnesso - Handlers inattivi:', error);
        }
        
        // Notifica handlers stato connessione
        this.notifyHandlers('CONNECTION', { connected, error });
    }
    
    /**
     * Registrazione handler specifico per tipo messaggio
     */
    registerHandler(messageType, handler) {
        if (typeof handler !== 'function') {
            console.error('❌ Handler deve essere una funzione');
            return false;
        }
        
        if (!this.registeredHandlers.has(messageType)) {
            this.registeredHandlers.set(messageType, []);
        }
        
        this.registeredHandlers.get(messageType).push(handler);
        console.log(`📝 Handler registrato per tipo: ${messageType}`);
        return true;
    }
    
    /**
     * Rimozione handler
     */
    unregisterHandler(messageType, handler) {
        if (!this.registeredHandlers.has(messageType)) return false;
        
        const handlers = this.registeredHandlers.get(messageType);
        const index = handlers.indexOf(handler);
        
        if (index > -1) {
            handlers.splice(index, 1);
            console.log(`🗑️ Handler rimosso per tipo: ${messageType}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Notifica handlers registrati
     */
    notifyHandlers(messageType, data) {
        if (!this.registeredHandlers.has(messageType)) return;
        
        const handlers = this.registeredHandlers.get(messageType);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error(`❌ Errore handler ${messageType}:`, error);
            }
        });
    }
    
    /**
     * Aggiunta messaggio alla storia
     */
    addToHistory(topic, data) {
        const historyItem = {
            timestamp: new Date().toISOString(),
            topic: topic,
            data: data,
            messageType: MQTTProtocol.identifyMessageType(data)
        };
        
        this.messageHistory.unshift(historyItem);
        
        // Mantenimento dimensione massima storia
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory = this.messageHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * Recupero storia messaggi
     */
    getMessageHistory(messageType = null, roomNumber = null) {
        let filtered = this.messageHistory;
        
        if (messageType) {
            filtered = filtered.filter(item => item.messageType === messageType);
        }
        
        if (roomNumber) {
            filtered = filtered.filter(item => 
                item.data.nCamera === roomNumber
            );
        }
        
        return filtered;
    }
    
    /**
     * Pulizia storia messaggi
     */
    clearHistory() {
        this.messageHistory = [];
        console.log('🧹 Storia messaggi pulita');
    }
    
    /**
     * Statistiche messaggi
     */
    getStatistics() {
        const stats = {
            totalMessages: this.messageHistory.length,
            byType: {},
            byRoom: {},
            lastMessage: this.messageHistory[0] || null
        };
        
        this.messageHistory.forEach(item => {
            // Conteggio per tipo
            stats.byType[item.messageType] = (stats.byType[item.messageType] || 0) + 1;
            
            // Conteggio per camera
            if (item.data.nCamera) {
                stats.byRoom[item.data.nCamera] = (stats.byRoom[item.data.nCamera] || 0) + 1;
            }
        });
        
        return stats;
    }
    
    /**
     * Debug: Lista handlers registrati
     */
    getRegisteredHandlers() {
        const result = {};
        this.registeredHandlers.forEach((handlers, type) => {
            result[type] = handlers.length;
        });
        return result;
    }
    
    /**
     * Debug: Simulazione messaggio di test
     */
    simulateMessage(messageType = 'DALI_LIGHTS', roomNumber = 1) {
        let testMessage;
        
        switch (messageType) {
            case 'DALI_LIGHTS':
                testMessage = {
                    "Timestamp": new Date().toISOString(),
                    "nCamera": roomNumber,
                    "sNome": "CameraLuci",
                    "nTotaLiv": 75,
                    "nTotaSet": 80,
                    "nParzLiv": 45,
                    "nParzSet": 50,
                    "nCoSxLiv": 20,
                    "nCoSxSet": 25,
                    "nCoDxLiv": 20,
                    "nCoDxSet": 25,
                    "nLettLiv": 60,
                    "nLettSet": 65,
                    "nScriLiv": 90,
                    "nScriSet": 95
                };
                break;
                
            default:
                console.warn('⚠️ Tipo messaggio simulazione non supportato');
                return;
        }
        
        console.log(`🧪 Simulazione messaggio ${messageType} per Camera ${roomNumber}`);
        this.processMessage('Camere/Plc', testMessage);
    }
}

// Export globale
window.MQTTHandlers = MQTTHandlers;