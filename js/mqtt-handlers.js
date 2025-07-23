/**
 * AMAN Venice - MQTT Message Handlers - VERSIONE CON FILTRO CAMERA
 * Gestione ricezione e smistamento messaggi MQTT con filtro per camera specifica
 * 
 * Coordina:
 * - Ricezione messaggi dal topic Camere/Plc
 * - Parsing e validazione
 * - Filtro per camera specifica (nCamera)
 * - Smistamento ai controlli specifici
 * - Logging e debug filtrato
 */

class MQTTHandlers {
    constructor() {
        this.registeredHandlers = new Map();
        this.messageHistory = [];
        this.maxHistorySize = 100;
        this.currentRoomNumber = null; // Camera per cui filtrare i messaggi
        
        console.log('🎯 AMAN Venice MQTT Handlers inizializzato con filtro camera');
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
        
        // Estrai numero camera dalla dashboard (se disponibile)
        this.detectCurrentRoom();
        
        // Registrazione handler principale per tutti i messaggi
        this.mqttManager.onMessage((topic, data) => {
            this.processMessage(topic, data);
        });
        
        // Registrazione handler connessione
        this.mqttManager.onConnection((connected, error) => {
            this.handleConnectionStatus(connected, error);
        });
        
        console.log(`✅ MQTT Handlers collegati al manager - Filtro attivo per Camera ${this.currentRoomNumber}`);
        return true;
    }
    
    /**
     * Rileva numero camera corrente dalla dashboard
     */
    detectCurrentRoom() {
        // Prova a rilevare dalla dashboard globale
        if (window.AmanDashboard && window.AmanDashboard.currentRoomNumber) {
            this.currentRoomNumber = window.AmanDashboard.currentRoomNumber;
        } 
        // Prova a rilevare dall'API globale
        else if (window.AmanAPI && window.AmanAPI.getCurrentRoomNumber) {
            this.currentRoomNumber = window.AmanAPI.getCurrentRoomNumber();
        }
        // Prova a rilevare dal nome file URL
        else {
            const filename = window.location.pathname.split('/').pop();
            const match = filename.match(/room-(\d+)/);
            this.currentRoomNumber = match ? parseInt(match[1]) : 2; // Default camera 2
        }
        
        console.log(`🏠 Camera rilevata per filtro: ${this.currentRoomNumber}`);
    }
    
    /**
     * Verifica se il messaggio è per la camera corrente
     */
    isMessageForCurrentRoom(messageData) {
        if (!messageData || typeof messageData !== 'object') {
            return false;
        }
        
        // Se non c'è nCamera nel messaggio, considera come messaggio di sistema (da mostrare)
        if (!messageData.hasOwnProperty('nCamera')) {
            return true;
        }
        
        // Controlla se nCamera corrisponde alla camera corrente
        return messageData.nCamera === this.currentRoomNumber;
    }
    
    /**
     * Elaborazione messaggio ricevuto con filtro
     */
    processMessage(topic, jsonData) {
        try {
            // FILTRO PRINCIPALE: verifica se il messaggio è per la camera corrente
            if (!this.isMessageForCurrentRoom(jsonData)) {
                // Log per debug (ma non nella console utente)
                console.log(`🔍 Messaggio filtrato - Camera ${jsonData.nCamera || 'unknown'} (attesa: ${this.currentRoomNumber})`);
                return; // Ignora il messaggio
            }
            
            // Log messaggio ricevuto (solo per camera corrente)
            console.log(`📨 Elaborazione messaggio da ${topic} per Camera ${this.currentRoomNumber}:`, jsonData);
            
            // Log nella console utente
            this.logToUserConsole('received', `MQTT Message [Camera ${this.currentRoomNumber}]`, jsonData);
            
            // Aggiunta alla storia (solo messaggi per camera corrente)
            this.addToHistory(topic, jsonData);
            
            // Validazione messaggio
            const validation = MQTTProtocol.validateMessage(jsonData);
            if (!validation.valid) {
                console.warn('⚠️ Messaggio non valido:', validation.errors);
                this.logToUserConsole('error', 'Messaggio non valido', validation.errors.join(', '));
                return;
            }
            
            // Identificazione tipo messaggio
            const messageType = MQTTProtocol.identifyMessageType(jsonData);
            console.log(`🔍 Tipo messaggio identificato: ${messageType} per Camera ${this.currentRoomNumber}`);
            
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
                    this.logToUserConsole('info', `Messaggio tipo: ${messageType}`, jsonData);
            }
            
        } catch (error) {
            console.error('❌ Errore elaborazione messaggio:', error);
            this.logToUserConsole('error', 'Errore elaborazione', error.message);
        }
    }
    
    /**
     * Log nella console utente (se disponibile)
     */
    logToUserConsole(type, header, data) {
        // Prova a usare la funzione di log della dashboard
        if (window.AmanDashboard && typeof window.AmanDashboard.logToConsole === 'function') {
            window.AmanDashboard.logToConsole(type, header, data);
        }
        // Prova a usare l'API globale
        else if (window.AmanAPI && typeof window.AmanAPI.log === 'function') {
            window.AmanAPI.log(type, header, data);
        }
        // Fallback alla console browser
        else {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] ${header}:`, data);
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
            this.logToUserConsole('info', `DALI Lights Update`, `Camera ${parsedData.roomNumber} - ${parsedData.roomType}`);
            
            // Notifica handlers DALI registrati
            this.notifyHandlers('DALI_LIGHTS', parsedData);
            
            // Log dettagliato zone
            Object.keys(parsedData.zones).forEach(zoneKey => {
                const zone = parsedData.zones[zoneKey];
                console.log(`  📍 ${zone.label}: ${zone.currentLevel}% (set: ${zone.setpoint}%) - ${zone.isOn ? 'ON' : 'OFF'}`);
            });
            
        } catch (error) {
            console.error('❌ Errore gestione messaggio DALI:', error);
            this.logToUserConsole('error', 'Errore DALI', error.message);
        }
    }
    
    /**
     * Gestione messaggi Climate
     */
    handleClimateMessage(jsonData) {
        console.log(`🌡️ Messaggio Climate ricevuto per Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        this.logToUserConsole('info', `Climate Update`, `Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        // TODO: Implementazione futura per termostati
        this.notifyHandlers('CLIMATE', jsonData);
    }
    
    /**
     * Gestione messaggi On/Off
     */
    handleOnOffMessage(jsonData) {
        console.log(`🔌 Messaggio On/Off ricevuto per Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        this.logToUserConsole('info', `On/Off Update`, `Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        // TODO: Implementazione futura per controlli On/Off
        this.notifyHandlers('ONOFF', jsonData);
    }
    
    /**
     * Gestione messaggi Monostable
     */
    handleMonostableMessage(jsonData) {
        console.log(`⚡ Messaggio Monostable ricevuto per Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        this.logToUserConsole('info', `Monostable Update`, `Camera ${jsonData.nCamera} - ${jsonData.sNome}`);
        // TODO: Implementazione futura per comandi monostabili
        this.notifyHandlers('MONOSTABLE', jsonData);
    }
    
    /**
     * Gestione stato connessione
     */
    handleConnectionStatus(connected, error) {
        if (connected) {
            console.log('✅ MQTT connesso - Handlers attivi con filtro camera');
            this.logToUserConsole('info', 'MQTT Connected', `Filtro attivo per Camera ${this.currentRoomNumber}`);
        } else {
            console.warn('⚠️ MQTT disconnesso - Handlers inattivi:', error);
            this.logToUserConsole('error', 'MQTT Disconnected', error || 'Connection lost');
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
     * Aggiunta messaggio alla storia (solo per camera corrente)
     */
    addToHistory(topic, data) {
        const historyItem = {
            timestamp: new Date().toISOString(),
            topic: topic,
            data: data,
            messageType: MQTTProtocol.identifyMessageType(data),
            roomNumber: data.nCamera || this.currentRoomNumber
        };
        
        this.messageHistory.unshift(historyItem);
        
        // Mantenimento dimensione massima storia
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory = this.messageHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * Recupero storia messaggi (solo per camera corrente)
     */
    getMessageHistory(messageType = null, roomNumber = null) {
        let filtered = this.messageHistory;
        
        // Filtra per camera corrente se non specificato diversamente
        const targetRoom = roomNumber !== null ? roomNumber : this.currentRoomNumber;
        if (targetRoom !== null) {
            filtered = filtered.filter(item => 
                item.roomNumber === targetRoom
            );
        }
        
        if (messageType) {
            filtered = filtered.filter(item => item.messageType === messageType);
        }
        
        return filtered;
    }
    
    /**
     * Pulizia storia messaggi
     */
    clearHistory() {
        this.messageHistory = [];
        console.log('🧹 Storia messaggi pulita');
        this.logToUserConsole('info', 'Message History Cleared', 'All message history cleared');
    }
    
    /**
     * Statistiche messaggi (solo per camera corrente)
     */
    getStatistics() {
        const roomMessages = this.getMessageHistory();
        
        const stats = {
            currentRoom: this.currentRoomNumber,
            totalMessages: roomMessages.length,
            byType: {},
            lastMessage: roomMessages[0] || null,
            filterActive: true
        };
        
        roomMessages.forEach(item => {
            // Conteggio per tipo
            stats.byType[item.messageType] = (stats.byType[item.messageType] || 0) + 1;
        });
        
        return stats;
    }
    
    /**
     * Cambia camera di filtro
     */
    setCurrentRoom(roomNumber) {
        const oldRoom = this.currentRoomNumber;
        this.currentRoomNumber = parseInt(roomNumber);
        
        console.log(`🔄 Filtro camera cambiato da ${oldRoom} a ${this.currentRoomNumber}`);
        this.logToUserConsole('info', 'Filter Changed', `Now filtering for Camera ${this.currentRoomNumber}`);
        
        // Pulisci la console e mostra il nuovo stato
        if (window.AmanDashboard && typeof window.AmanDashboard.clearConsole === 'function') {
            window.AmanDashboard.clearConsole();
        }
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
     * Debug: Simulazione messaggio di test per camera corrente
     */
    simulateMessage(messageType = 'DALI_LIGHTS', roomNumber = null) {
        const targetRoom = roomNumber || this.currentRoomNumber;
        let testMessage;
        
        switch (messageType) {
            case 'DALI_LIGHTS':
                testMessage = {
                    "Timestamp": new Date().toISOString(),
                    "nCamera": targetRoom,
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
                
            case 'ENERGIA':
                testMessage = {
                    "Timestamp": new Date().toISOString(),
                    "nCamera": targetRoom,
                    "sNome": "Energia",
                    "nGen": Math.floor(Math.random() * 1000)
                };
                break;
                
            default:
                console.warn('⚠️ Tipo messaggio simulazione non supportato');
                return;
        }
        
        console.log(`🧪 Simulazione messaggio ${messageType} per Camera ${targetRoom}`);
        this.processMessage('Camere/Plc', testMessage);
    }
    
    /**
     * Test filtro camera
     */
    testFilter() {
        console.log('🧪 Testing camera filter...');
        this.logToUserConsole('info', 'Filter Test Started', `Testing filter for Camera ${this.currentRoomNumber}`);
        
        // Simula messaggio per camera corrente (dovrebbe apparire)
        this.simulateMessage('ENERGIA', this.currentRoomNumber);
        
        // Simula messaggio per camera diversa (NON dovrebbe apparire)
        const otherRoom = this.currentRoomNumber === 1 ? 2 : 1;
        console.log(`🧪 Simulando messaggio per Camera ${otherRoom} (dovrebbe essere filtrato)`);
        
        const filteredMessage = {
            "Timestamp": new Date().toISOString(),
            "nCamera": otherRoom,
            "sNome": "Energia",
            "nGen": 999
        };
        
        this.processMessage('Camere/Plc', filteredMessage);
        
        console.log(`✅ Test completato. Solo il messaggio per Camera ${this.currentRoomNumber} dovrebbe essere apparso nella console utente.`);
    }
    
    /**
     * Stato del filtro
     */
    getFilterStatus() {
        return {
            active: true,
            currentRoom: this.currentRoomNumber,
            totalHistoryMessages: this.messageHistory.length,
            filteredHistoryMessages: this.getMessageHistory().length
        };
    }
}

// Export globale
window.MQTTHandlers = MQTTHandlers;