/**
 * AMAN Venice - MQTT Manager
 * Gestione connessione WebSocket MQTT con broker EMQX
 * 
 * Configurazione:
 * - Broker: broker.emqx.io:8084 (WebSocket)
 * - Topic Subscribe: Camere/Plc
 * - Topic Publish: Camere/Hmi
 * - QoS: 1
 */

class MQTTManager {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 secondi
        
        // Configurazione MQTT
        this.config = {
            broker: 'broker.emqx.io',
            port: 8084,
            protocol: 'wss',
            topicSubscribe: 'Camere/Plc',
            topicPublish: 'Camere/Hmi',
            qos: 1,
            clientId: `aman_venice_${Math.random().toString(16).substr(2, 8)}`
        };
        
        // Callback handlers
        this.messageHandlers = [];
        this.connectionHandlers = [];
        
        console.log('🏨 AMAN Venice MQTT Manager inizializzato');
    }
    
    /**
     * Connessione al broker MQTT
     */
    async connect() {
        try {
            console.log('🔌 Connessione al broker MQTT...');
            
            // Verifica disponibilità libreria Paho MQTT
            if (typeof Paho === 'undefined' || !Paho.MQTT) {
                throw new Error('Libreria Paho MQTT non disponibile. Includere: https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.0.1/mqttws31.min.js');
            }
            
            // Creazione client MQTT
            this.client = new Paho.MQTT.Client(
                this.config.broker,
                this.config.port,
                this.config.clientId
            );
            
            // Configurazione callback
            this.client.onConnectionLost = this.onConnectionLost.bind(this);
            this.client.onMessageArrived = this.onMessageArrived.bind(this);
            
            // Opzioni di connessione
            const connectOptions = {
                onSuccess: this.onConnect.bind(this),
                onFailure: this.onConnectFailure.bind(this),
                useSSL: false,
                cleanSession: true,
                keepAliveInterval: 60,
                timeout: 10
            };
            
            // Connessione
            this.client.connect(connectOptions);
            
        } catch (error) {
            console.error('❌ Errore inizializzazione MQTT:', error);
            this.notifyConnectionHandlers(false, error.message);
        }
    }
    
    /**
     * Callback successo connessione
     */
    onConnect() {
        console.log('✅ Connesso al broker MQTT');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Sottoscrizione topic di ricezione
        this.subscribe();
        
        // Notifica handlers
        this.notifyConnectionHandlers(true);
    }
    
    /**
     * Callback errore connessione
     */
    onConnectFailure(error) {
        console.error('❌ Errore connessione MQTT:', error.errorMessage);
        this.isConnected = false;
        
        // Tentativo riconnessione
        this.scheduleReconnect();
        
        // Notifica handlers
        this.notifyConnectionHandlers(false, error.errorMessage);
    }
    
    /**
     * Callback perdita connessione
     */
    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.warn('⚠️ Connessione MQTT persa:', responseObject.errorMessage);
            this.isConnected = false;
            
            // Tentativo riconnessione
            this.scheduleReconnect();
            
            // Notifica handlers
            this.notifyConnectionHandlers(false, responseObject.errorMessage);
        }
    }
    
    /**
     * Sottoscrizione topic di ricezione
     */
    subscribe() {
        if (!this.client || !this.isConnected) return;
        
        try {
            this.client.subscribe(this.config.topicSubscribe, {
                qos: this.config.qos,
                onSuccess: () => {
                    console.log(`📡 Sottoscritto al topic: ${this.config.topicSubscribe}`);
                },
                onFailure: (error) => {
                    console.error('❌ Errore sottoscrizione:', error);
                }
            });
        } catch (error) {
            console.error('❌ Errore sottoscrizione topic:', error);
        }
    }
    
    /**
     * Callback ricezione messaggi
     */
    onMessageArrived(message) {
        try {
            const topic = message.destinationName;
            const payload = message.payloadString;
            
            console.log(`📨 Messaggio ricevuto su ${topic}:`, payload);
            
            // Parse JSON
            let jsonData;
            try {
                jsonData = JSON.parse(payload);
            } catch (parseError) {
                console.error('❌ Errore parsing JSON:', parseError);
                return;
            }
            
            // Notifica message handlers
            this.notifyMessageHandlers(topic, jsonData);
            
        } catch (error) {
            console.error('❌ Errore elaborazione messaggio:', error);
        }
    }
    
    /**
     * Invio messaggio MQTT
     */
    publish(payload) {
        if (!this.client || !this.isConnected) {
            console.warn('⚠️ MQTT non connesso, impossibile inviare messaggio');
            return false;
        }
        
        try {
            const message = new Paho.MQTT.Message(JSON.stringify(payload));
            message.destinationName = this.config.topicPublish;
            message.qos = this.config.qos;
            
            this.client.send(message);
            
            console.log(`📤 Messaggio inviato su ${this.config.topicPublish}:`, payload);
            return true;
            
        } catch (error) {
            console.error('❌ Errore invio messaggio:', error);
            return false;
        }
    }
    
    /**
     * Programmazione riconnessione
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Massimo numero di tentativi riconnessione raggiunto');
            return;
        }
        
        this.reconnectAttempts++;
        console.log(`🔄 Tentativo riconnessione ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay/1000}s...`);
        
        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
    }
    
    /**
     * Registrazione handler messaggi
     */
    onMessage(handler) {
        if (typeof handler === 'function') {
            this.messageHandlers.push(handler);
        }
    }
    
    /**
     * Registrazione handler connessione
     */
    onConnection(handler) {
        if (typeof handler === 'function') {
            this.connectionHandlers.push(handler);
        }
    }
    
    /**
     * Notifica handler messaggi
     */
    notifyMessageHandlers(topic, data) {
        this.messageHandlers.forEach(handler => {
            try {
                handler(topic, data);
            } catch (error) {
                console.error('❌ Errore message handler:', error);
            }
        });
    }
    
    /**
     * Notifica handler connessione
     */
    notifyConnectionHandlers(connected, error = null) {
        this.connectionHandlers.forEach(handler => {
            try {
                handler(connected, error);
            } catch (error) {
                console.error('❌ Errore connection handler:', error);
            }
        });
    }
    
    /**
     * Disconnessione
     */
    disconnect() {
        if (this.client && this.isConnected) {
            this.client.disconnect();
            console.log('🔌 Disconnesso da MQTT');
        }
        this.isConnected = false;
    }
    
    /**
     * Stato connessione
     */
    getConnectionStatus() {
        return {
            connected: this.isConnected,
            clientId: this.config.clientId,
            broker: `${this.config.broker}:${this.config.port}`,
            subscribed: this.config.topicSubscribe,
            publish: this.config.topicPublish
        };
    }
}

// Istanza singleton
window.MQTTManager = MQTTManager;
