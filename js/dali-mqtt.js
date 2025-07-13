/**
 * AMAN Venice - DALI MQTT Integration
 * Integrazione controlli DALI con comunicazione MQTT
 * 
 * Funzionalità:
 * - Creazione controlli multipli per zone DALI
 * - Sincronizzazione stati ricevuti da MQTT
 * - Gestione interazioni utente
 * - Integrazione con LuceDALIGlassMorphism.html
 */

class DALIMQTTController {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.mqttHandlers = null;
        this.mqttSenders = null;
        this.activeControls = new Map(); // Mappa controlli attivi per room/zone
        this.roomConfigs = new Map(); // Configurazioni rooms
        
        if (!this.container) {
            console.error(`❌ Container ${containerId} non trovato`);
            return;
        }
        
        console.log('💡 DALI MQTT Controller inizializzato');
    }
    
    /**
     * Inizializzazione con MQTT Handlers e Senders
     */
    initialize(mqttHandlers, mqttSenders) {
        if (!mqttHandlers) {
            console.error('❌ MQTT Handlers richiesto per DALI Controller');
            return false;
        }
        
        if (!mqttSenders) {
            console.error('❌ MQTT Senders richiesto per DALI Controller');
            return false;
        }
        
        this.mqttHandlers = mqttHandlers;
        this.mqttSenders = mqttSenders;
        
        // Registrazione handler per messaggi DALI
        this.mqttHandlers.registerHandler('DALI_LIGHTS', (data) => {
            this.handleDALIUpdate(data);
        });
        
        // Registrazione handler connessione
        this.mqttHandlers.registerHandler('CONNECTION', (status) => {
            this.handleConnectionStatus(status);
        });
        
        console.log('✅ DALI Controller collegato a MQTT Handlers e Senders');
        return true;
    }
    
    /**
     * Gestione aggiornamento dati DALI ricevuti
     */
    handleDALIUpdate(daliData) {
        try {
            console.log(`💡 Aggiornamento DALI per Camera ${daliData.roomNumber} (${daliData.roomType})`);
            
            // Verifica o crea controlli per questa room
            this.ensureRoomControls(daliData.roomNumber, daliData.roomType, daliData.controlName);
            
            // Aggiornamento di tutte le zone
            Object.keys(daliData.zones).forEach(zoneKey => {
                this.updateZoneControl(daliData.roomNumber, zoneKey, daliData.zones[zoneKey]);
            });
            
        } catch (error) {
            console.error('❌ Errore aggiornamento DALI:', error);
        }
    }
    
    /**
     * Assicura che esistano controlli per la room specificata
     */
    ensureRoomControls(roomNumber, roomType, controlName) {
        const roomKey = `room${roomNumber}`;
        
        if (this.roomConfigs.has(roomKey)) {
            // Room già configurata, solo update
            return;
        }
        
        console.log(`🏗️ Creazione controlli DALI per Camera ${roomNumber} (${roomType})`);
        
        // Configurazione room
        const roomConfig = {
            number: roomNumber,
            type: roomType,
            controlName: controlName,
            containerElement: null,
            zones: new Map()
        };
        
        // Creazione container per la room
        this.createRoomContainer(roomConfig);
        
        // Creazione controlli per tutte le zone DALI
        Object.keys(MQTTProtocol.DALI_ZONES).forEach(zoneKey => {
            this.createZoneControl(roomNumber, zoneKey);
        });
        
        this.roomConfigs.set(roomKey, roomConfig);
    }
    
    /**
     * Creazione container per una room
     */
    createRoomContainer(roomConfig) {
        const roomContainer = document.createElement('div');
        roomContainer.id = `roomContainer${roomConfig.number}`;
        roomContainer.className = 'room-dali-container';
        roomContainer.style.cssText = `
            margin: 30px 0;
            padding: 25px;
            background: linear-gradient(135deg, rgba(237, 212, 180, 0.1) 0%, rgba(250, 250, 240, 0.1) 100%);
            border: 1px solid rgba(139, 69, 19, 0.2);
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        `;
        
        // Titolo room
        const roomTitle = document.createElement('h2');
        roomTitle.textContent = `Camera ${roomConfig.number} - ${roomConfig.type} Lights`;
        roomTitle.style.cssText = `
            color: #8B4513;
            margin-bottom: 20px;
            text-align: center;
            font-size: 1.4em;
            font-weight: 600;
        `;
        
        // Container controlli zone
        const zonesContainer = document.createElement('div');
        zonesContainer.id = `zonesContainer${roomConfig.number}`;
        zonesContainer.className = 'zones-grid';
        zonesContainer.style.cssText = `
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-top: 20px;
        `;
        
        roomContainer.appendChild(roomTitle);
        roomContainer.appendChild(zonesContainer);
        this.container.appendChild(roomContainer);
        
        roomConfig.containerElement = roomContainer;
        roomConfig.zonesContainer = zonesContainer;
    }
    
    /**
     * Creazione controllo per una zona specifica
     */
    createZoneControl(roomNumber, zoneKey) {
        const zoneInfo = MQTTProtocol.DALI_ZONES[zoneKey];
        const controlId = MQTTProtocol.generateControlId(roomNumber, 'DALI', zoneInfo.name);
        
        // Container per il controllo singolo
        const zoneContainer = document.createElement('div');
        zoneContainer.id = `container_${controlId}`;
        zoneContainer.innerHTML = this.generateDALIControlHTML(controlId, zoneInfo.label);
        
        // Aggiunta al container zones
        const roomConfig = this.roomConfigs.get(`room${roomNumber}`);
        if (roomConfig && roomConfig.zonesContainer) {
            roomConfig.zonesContainer.appendChild(zoneContainer);
        }
        
        // Inizializzazione controllo
        this.initializeZoneControl(roomNumber, zoneKey, controlId);
        
        console.log(`🎛️ Controllo creato: ${controlId} (${zoneInfo.label})`);
    }
    
    /**
     * Generazione HTML per controllo DALI (basato su LuceDALIGlassMorphism.html)
     */
    generateDALIControlHTML(controlId, zoneLabel) {
        return `
            <div class="dali-controller" id="daliController_${controlId}">
                <!-- LABEL NOME GRUPPO -->
                <div class="group-label uniform-element" id="groupLabel_${controlId}">${zoneLabel}</div>
                
                <!-- CONTROLLI PRINCIPALI: LIVELLO + ON/OFF -->
                <div class="main-controls">
                    <!-- VISUALIZZAZIONE LIVELLO CORRENTE -->
                    <div class="level-display">
                        <div class="level-value uniform-element off" id="levelDisplay_${controlId}">
                            0<span class="level-unit">%</span>
                        </div>
                    </div>
                    
                    <!-- COMANDO ON/OFF -->
                    <div class="power-controls">
                        <button class="power-btn uniform-element active" id="offBtn_${controlId}" onclick="daliMQTT.setPower('${controlId}', 'off')">OFF</button>
                        <button class="power-btn uniform-element" id="onBtn_${controlId}" onclick="daliMQTT.setPower('${controlId}', 'on')">ON</button>
                    </div>
                </div>
                
                <!-- SLIDER IMPOSTAZIONE LIVELLO -->
                <div class="level-control">
                    <div class="level-label">Impostazione Livello</div>
                    <div class="level-slider-container">
                        <div class="level-slider" onclick="daliMQTT.adjustLevel(event, '${controlId}')">
                            <div class="level-fill" id="levelFill_${controlId}" style="width: 0%"></div>
                            <div class="level-thumb" id="levelThumb_${controlId}" style="left: calc(0% - 12px)"></div>
                        </div>
                        <div class="slider-scale">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </div>
                
                <!-- STATUS INDICATOR -->
                <div class="status-indicator">
                    <div class="status-dot off" id="statusDot_${controlId}"></div>
                    <span id="statusText_${controlId}">Luci spente</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Inizializzazione controllo zona con eventi
     */
    initializeZoneControl(roomNumber, zoneKey, controlId) {
        const controlData = {
            roomNumber: roomNumber,
            zoneKey: zoneKey,
            controlId: controlId,
            currentLevel: 0,
            setpoint: 0,
            isOn: false,
            lastUpdate: null
        };
        
        // Registrazione controllo attivo
        this.activeControls.set(controlId, controlData);
        
        // Setup eventi drag per slider
        this.setupSliderEvents(controlId);
    }
    
    /**
     * Setup eventi drag per slider
     */
    setupSliderEvents(controlId) {
        const thumb = document.getElementById(`levelThumb_${controlId}`);
        if (!thumb) return;
        
        let isDragging = false;
        
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            e.preventDefault();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const slider = document.getElementById(`levelFill_${controlId}`).parentElement;
            const rect = slider.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
            
            this.updateControlLevel(controlId, percentage, true);
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }
    
    /**
     * Aggiornamento controllo zona con dati ricevuti
     */
    updateZoneControl(roomNumber, zoneKey, zoneData) {
        const controlId = MQTTProtocol.generateControlId(roomNumber, 'DALI', MQTTProtocol.DALI_ZONES[zoneKey].name);
        
        if (!this.activeControls.has(controlId)) {
            console.warn(`⚠️ Controllo ${controlId} non trovato per aggiornamento`);
            return;
        }
        
        console.log(`🔄 Aggiornamento controllo ${controlId}:`, zoneData);
        
        // Aggiornamento dati controllo
        const controlData = this.activeControls.get(controlId);
        controlData.currentLevel = zoneData.currentLevel;
        controlData.setpoint = zoneData.setpoint;
        controlData.isOn = zoneData.isOn;
        controlData.lastUpdate = new Date().toISOString();
        
        // Aggiornamento UI
        this.updateControlUI(controlId, zoneData);
    }
    
    /**
     * Aggiornamento UI controllo
     */
    updateControlUI(controlId, zoneData) {
        // Aggiornamento display livello
        const levelDisplay = document.getElementById(`levelDisplay_${controlId}`);
        if (levelDisplay) {
            levelDisplay.innerHTML = `${zoneData.currentLevel}<span class="level-unit">%</span>`;
            levelDisplay.classList.toggle('on', zoneData.isOn);
            levelDisplay.classList.toggle('off', !zoneData.isOn);
        }
        
        // Aggiornamento slider
        this.updateSliderUI(controlId, zoneData.setpoint);
        
        // Aggiornamento pulsanti power
        this.updatePowerButtons(controlId, zoneData.isOn);
        
        // Aggiornamento status
        this.updateStatusIndicator(controlId, zoneData.isOn);
    }
    
    /**
     * Aggiornamento slider UI
     */
    updateSliderUI(controlId, level) {
        const fill = document.getElementById(`levelFill_${controlId}`);
        const thumb = document.getElementById(`levelThumb_${controlId}`);
        
        if (fill && thumb) {
            fill.style.width = level + '%';
            thumb.style.left = `calc(${level}% - 12px)`;
            thumb.classList.toggle('active', level > 0);
        }
    }
    
    /**
     * Aggiornamento pulsanti power
     */
    updatePowerButtons(controlId, isOn) {
        const onBtn = document.getElementById(`onBtn_${controlId}`);
        const offBtn = document.getElementById(`offBtn_${controlId}`);
        
        if (onBtn && offBtn) {
            onBtn.classList.toggle('on-active', isOn);
            onBtn.classList.toggle('active', false);
            offBtn.classList.toggle('active', !isOn);
        }
    }
    
    /**
     * Aggiornamento status indicator
     */
    updateStatusIndicator(controlId, isOn) {
        const dot = document.getElementById(`statusDot_${controlId}`);
        const text = document.getElementById(`statusText_${controlId}`);
        
        if (dot && text) {
            dot.classList.toggle('on', isOn);
            dot.classList.toggle('off', !isOn);
            text.textContent = isOn ? 'Luci accese' : 'Luci spente';
        }
    }
    
    /**
     * Gestione click pulsante power
     */
    setPower(controlId, state) {
        const isOn = state === 'on';
        const controlData = this.activeControls.get(controlId);
        
        if (!controlData) return;
        
        console.log(`⚡ Set power ${controlId}: ${state}`);
        
        let newLevel = controlData.setpoint;
        
        if (!isOn) {
            newLevel = 0;
        } else if (controlData.setpoint === 0) {
            newLevel = 50; // Default level quando si accende
        }
        
        this.updateControlLevel(controlId, newLevel, true);
        
        // Invio comando MQTT
        this.sendDALICommand(controlData, newLevel, isOn);
    }
    
    /**
     * Gestione click su slider
     */
    adjustLevel(event, controlId) {
        const slider = event.currentTarget;
        const rect = slider.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(100, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
        
        this.updateControlLevel(controlId, percentage, true);
        
        // Invio comando MQTT
        const controlData = this.activeControls.get(controlId);
        if (controlData) {
            this.sendDALICommand(controlData, percentage);
        }
    }
    
    /**
     * Aggiornamento livello controllo
     */
    updateControlLevel(controlId, level, userTriggered = false) {
        const controlData = this.activeControls.get(controlId);
        if (!controlData) return;
        
        // Aggiornamento dati
        controlData.setpoint = level;
        controlData.isOn = level > 0;
        
        // Aggiornamento UI
        const zoneData = {
            currentLevel: userTriggered ? level : controlData.currentLevel,
            setpoint: level,
            isOn: level > 0
        };
        
        this.updateControlUI(controlId, zoneData);
        
        // Se modificato dall'utente, prepara invio comando MQTT
        if (userTriggered) {
            console.log(`👤 Modifica utente ${controlId}: ${level}%`);
            const controlData = this.activeControls.get(controlId);
            if (controlData) {
                this.sendDALICommand(controlData, level);
            }
        }
    }
    
    /**
     * Gestione stato connessione MQTT
     */
    handleConnectionStatus(status) {
        const indicator = this.createConnectionIndicator(status.connected);
        
        // Aggiornamento indicatori di connessione su tutti i controlli
        this.activeControls.forEach((controlData, controlId) => {
            const controller = document.getElementById(`daliController_${controlId}`);
            if (controller) {
                controller.style.opacity = status.connected ? '1' : '0.7';
            }
        });
    }
    
    /**
     * Creazione indicatore connessione
     */
    createConnectionIndicator(connected) {
        let indicator = document.getElementById('mqttConnectionIndicator');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'mqttConnectionIndicator';
            indicator.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 20px;
                font-size: 0.9em;
                font-weight: 500;
                z-index: 1000;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(indicator);
        }
        
        if (connected) {
            indicator.textContent = '🟢 MQTT Connesso';
            indicator.style.background = 'rgba(76, 175, 80, 0.9)';
            indicator.style.color = 'white';
        } else {
            indicator.textContent = '🔴 MQTT Disconnesso';
            indicator.style.background = 'rgba(244, 67, 54, 0.9)';
            indicator.style.color = 'white';
        }
        
        return indicator;
    }
    
    /**
     * Invio comando DALI al PLC
     */
    sendDALICommand(controlData, level, forceOnOff = null) {
        if (!this.mqttSenders) {
            console.warn('⚠️ MQTT Senders non disponibile');
            return false;
        }
        
        try {
            // Determinazione room type da zone key
            const roomConfig = this.roomConfigs.get(`room${controlData.roomNumber}`);
            if (!roomConfig) {
                console.error(`❌ Configurazione room ${controlData.roomNumber} non trovata`);
                return false;
            }
            
            // Conversione zone key a zone name per mapping
            const zoneName = MQTTProtocol.DALI_ZONES[controlData.zoneKey]?.name;
            if (!zoneName) {
                console.error(`❌ Zone name per ${controlData.zoneKey} non trovato`);
                return false;
            }
            
            console.log(`📤 Invio comando DALI: Camera ${controlData.roomNumber} (${roomConfig.type}) - ${zoneName} → ${level}%`);
            
            // Invio comando combinato tramite MQTT Senders
            return this.mqttSenders.sendDALICommand(
                controlData.roomNumber,
                roomConfig.type,
                zoneName,
                level,
                forceOnOff
            );
            
        } catch (error) {
            console.error('❌ Errore invio comando DALI:', error);
            return false;
        }
    }
    
    /**
     * Invio comando DALI On/Off specifico
     */
    sendDALIOnOff(controlData, isOn) {
        if (!this.mqttSenders) {
            console.warn('⚠️ MQTT Senders non disponibile');
            return false;
        }
        
        try {
            const roomConfig = this.roomConfigs.get(`room${controlData.roomNumber}`);
            if (!roomConfig) {
                console.error(`❌ Configurazione room ${controlData.roomNumber} non trovata`);
                return false;
            }
            
            const zoneName = MQTTProtocol.DALI_ZONES[controlData.zoneKey]?.name;
            if (!zoneName) {
                console.error(`❌ Zone name per ${controlData.zoneKey} non trovato`);
                return false;
            }
            
            console.log(`🔌 Invio comando DALI On/Off: Camera ${controlData.roomNumber} - ${zoneName} → ${isOn ? 'ON' : 'OFF'}`);
            
            return this.mqttSenders.sendDALIOnOff(
                controlData.roomNumber,
                roomConfig.type,
                zoneName,
                isOn
            );
            
        } catch (error) {
            console.error('❌ Errore invio comando DALI On/Off:', error);
            return false;
        }
    }
    
    /**
     * Invio comando DALI Level specifico
     */
    sendDALILevel(controlData, level) {
        if (!this.mqttSenders) {
            console.warn('⚠️ MQTT Senders non disponibile');
            return false;
        }
        
        try {
            const roomConfig = this.roomConfigs.get(`room${controlData.roomNumber}`);
            if (!roomConfig) {
                console.error(`❌ Configurazione room ${controlData.roomNumber} non trovata`);
                return false;
            }
            
            const zoneName = MQTTProtocol.DALI_ZONES[controlData.zoneKey]?.name;
            if (!zoneName) {
                console.error(`❌ Zone name per ${controlData.zoneKey} non trovato`);
                return false;
            }
            
            console.log(`🎛️ Invio comando DALI Level: Camera ${controlData.roomNumber} - ${zoneName} → ${level}%`);
            
            return this.mqttSenders.sendDALILevel(
                controlData.roomNumber,
                roomConfig.type,
                zoneName,
                level
            );
            
        } catch (error) {
            console.error('❌ Errore invio comando DALI Level:', error);
            return false;
        }
    }
    
    /**
     * Test invio comandi per una room
     */
    testDALICommands(roomNumber = 1) {
        console.log(`🧪 Test comandi DALI per Camera ${roomNumber}`);
        
        // Trova tutti i controlli per questa room
        const roomControls = Array.from(this.activeControls.values())
            .filter(control => control.roomNumber === roomNumber);
        
        if (roomControls.length === 0) {
            console.warn(`⚠️ Nessun controllo trovato per Camera ${roomNumber}`);
            return;
        }
        
        // Test sequenziale su tutti i controlli
        roomControls.forEach((controlData, index) => {
            setTimeout(() => {
                console.log(`🧪 Test ${controlData.zoneKey}...`);
                
                // Accendi al 75%
                this.sendDALICommand(controlData, 75);
                
                // Spegni dopo 3 secondi
                setTimeout(() => {
                    this.sendDALICommand(controlData, 0);
                }, 3000);
                
            }, index * 1000);
        });
    }
    
    /**
     * Debug: Status controlli attivi
     */
    getActiveControlsStatus() {
        const status = {};
        this.activeControls.forEach((data, controlId) => {
            status[controlId] = {
                room: data.roomNumber,
                zone: data.zoneKey,
                level: data.currentLevel,
                setpoint: data.setpoint,
                isOn: data.isOn,
                lastUpdate: data.lastUpdate
            };
        });
        return status;
    }
}

// CSS styles injection
const daliCSS = `
<style>
/* DALI Controller Styles */
.dali-controller {
    background: linear-gradient(135deg, #EDD4B4 0%, #FAFAF0 100%);
    border: 1px solid rgba(139, 69, 19, 0.3);
    border-radius: 25px;
    padding: 30px;
    box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.5);
    position: relative;
    overflow: hidden;
    transition: all 0.4s ease;
    width: 100%;
    max-width: 350px;
    margin: 0 auto;
}

.dali-controller::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
    animation: gentle-shimmer 8s infinite linear;
    pointer-events: none;
}

@keyframes gentle-shimmer {
    0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
    50% { transform: rotate(180deg) scale(1.1); opacity: 0.1; }
    100% { transform: rotate(360deg) scale(1); opacity: 0.3; }
}

.dali-controller:hover {
    transform: translateY(-5px) scale(1.02);
    box-shadow: 
        0 30px 80px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.uniform-element {
    font-size: 1em;
    font-weight: 500;
    padding: 12px 20px;
    border-radius: 15px;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(139, 69, 19, 0.2);
    letter-spacing: 0.5px;
    transition: all 0.3s ease;
    box-sizing: border-box;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.group-label {
    color: #8B4513;
    text-align: center;
    margin-bottom: 25px;
    position: relative;
    z-index: 2;
    font-weight: 600;
}

.main-controls {
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    gap: 15px;
    margin: 25px 0;
    position: relative;
    z-index: 2;
}

.level-display {
    flex: 1;
}

.level-value {
    color: #5D4037;
    width: 100%;
    min-width: 80px;
}

.level-value.on {
    background: rgba(255, 193, 7, 0.4);
    color: #8B4513;
    border-color: rgba(255, 193, 7, 0.5);
    box-shadow: 0 4px 15px rgba(255, 193, 7, 0.25);
}

.level-value.off {
    background: rgba(108, 117, 125, 0.3);
    color: #6C757D;
    border-color: rgba(108, 117, 125, 0.4);
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.1);
}

.level-unit {
    font-size: 1em;
    opacity: 0.8;
}

.power-controls {
    display: flex;
    gap: 10px;
}

.power-btn {
    color: #5D4037;
    cursor: pointer;
    min-width: 70px;
}

.power-btn:hover {
    background: rgba(139, 69, 19, 0.25);
    border-color: rgba(139, 69, 19, 0.4);
    transform: translateY(-2px);
    color: #8B4513;
}

.power-btn.active {
    background: rgba(139, 69, 19, 0.3);
    border-color: rgba(139, 69, 19, 0.5);
    color: #8B4513;
    font-weight: 600;
}

.power-btn.on-active {
    background: rgba(255, 193, 7, 0.4);
    border-color: rgba(255, 193, 7, 0.5);
    color: #8B4513;
}

.level-control {
    margin: 30px 0;
    position: relative;
    z-index: 2;
}

.level-label {
    font-size: 0.9em;
    color: #5D4037;
    margin-bottom: 15px;
    text-align: center;
    font-weight: 300;
    letter-spacing: 0.5px;
}

.level-slider-container {
    position: relative;
    padding: 10px 0;
}

.level-slider {
    width: 100%;
    height: 8px;
    background: rgba(139, 69, 19, 0.2);
    border-radius: 4px;
    position: relative;
    cursor: pointer;
    border: 1px solid rgba(139, 69, 19, 0.1);
}

.level-fill {
    height: 100%;
    background: linear-gradient(90deg, rgba(139, 69, 19, 0.8), rgba(255, 193, 7, 0.8));
    border-radius: 4px;
    transition: width 0.3s ease;
    position: relative;
}

.level-thumb {
    position: absolute;
    top: -8px;
    width: 24px;
    height: 24px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    border: 2px solid rgba(139, 69, 19, 0.5);
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.level-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 6px 20px rgba(139, 69, 19, 0.3);
    border-color: rgba(139, 69, 19, 0.7);
}

.level-thumb.active {
    background: rgba(255, 193, 7, 0.9);
    border-color: rgba(255, 193, 7, 0.7);
}

.slider-scale {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-size: 0.7em;
    color: rgba(93, 64, 55, 0.7);
}

.status-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin: 20px 0;
    font-size: 0.85em;
    color: #5D4037;
    position: relative;
    z-index: 2;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    animation: pulse 2s infinite;
}

.status-dot.on {
    background: rgba(255, 193, 7, 0.8);
}

.status-dot.off {
    background: rgba(108, 117, 125, 0.8);
}

@keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
}
</style>
`;

// Injection CSS
if (!document.getElementById('daliMQTTStyles')) {
    const styleElement = document.createElement('div');
    styleElement.id = 'daliMQTTStyles';
    styleElement.innerHTML = daliCSS;
    document.head.appendChild(styleElement);
}

// Export globale
window.DALIMQTTController = DALIMQTTController;
