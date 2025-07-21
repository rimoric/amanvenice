/**
 * AMAN Venice - Dashboard Core System
 * Sistema base modulare per dashboard camere
 * 
 * Funzionalità:
 * - Gestione configurazioni room
 * - Inizializzazione MQTT
 * - Creazione controlli dinamici
 * - Coordinamento moduli
 * - Parser messaggi clima MQTT
 * - Parser messaggi DALI MQTT (IMPLEMENTATO)
 */

class AmanDashboardCore {
    constructor() {
        this.roomNumber = null;
        this.roomConfig = null;
        this.connected = false;
        this.lastUpdateTime = 'Never';
        this.mqttManager = null;
        this.controls = new Map();
        
        console.log('🏨 AMAN Venice Dashboard Core inizializzato');
    }
    
    /**
     * Inizializzazione dashboard per room specifica
     */
    async init(roomNumber) {
        try {
            this.roomNumber = roomNumber.toString().padStart(2, '0');
            console.log(`🔧 Inizializzazione Dashboard Core per Room ${this.roomNumber}`);
            
            // Caricamento configurazione room
            await this.loadRoomConfig();
            
            // Inizializzazione logo
            this.initializeLogo();
            
            // Setup error handling
            this.setupErrorHandling();
            
            console.log(`✅ Dashboard Core pronto per Room ${this.roomNumber}`);
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione Dashboard Core:', error);
            return false;
        }
    }
    
    /**
     * Caricamento configurazione room
     */
    async loadRoomConfig() {
        try {
            // Per ora configurazione embedded, poi sarà caricata da JSON
            this.roomConfig = this.getDefaultRoomConfig(parseInt(this.roomNumber));
            console.log(`📋 Configurazione Room ${this.roomNumber} caricata:`, this.roomConfig);
            
        } catch (error) {
            console.error('❌ Errore caricamento configurazione room:', error);
            throw error;
        }
    }
    
    /**
     * Configurazione default room (da spostare poi in JSON)
     */
    getDefaultRoomConfig(roomNum) {
        const isSpecialRoom = [7, 8, 19].includes(roomNum);
        const hasLivingRoom = [7, 8, 19].includes(roomNum);
        const hasBathroom = roomNum !== 19 ? 'standard' : 'special';
        
        return {
            number: roomNum,
            name: `Room ${roomNum.toString().padStart(2, '0')}`,
            password: roomNum.toString().padStart(2, '0'),
            
            // Struttura tab
            tabs: this.generateTabsConfig(hasLivingRoom, hasBathroom),
            
            // Controlli per sezione
            controls: this.generateControlsConfig(hasLivingRoom, hasBathroom),
            
            // Configurazione MQTT
            mqtt: {
                topicPub: 'Camere/Hmi',
                topicSub: 'Camere/Plc'
            }
        };
    }
    
    /**
     * Generazione configurazione tabs
     */
    generateTabsConfig(hasLivingRoom, hasBathroom) {
        const tabs = [];
        
        if (hasLivingRoom) {
            tabs.push({
                id: 'living',
                name: '🏛️ Living Room',
                title: 'Living Room',
                subtitle: 'Living Room Controls'
            });
        }
        
        tabs.push({
            id: 'bedroom',
            name: '🛏️ Bedroom',
            title: 'Bedroom',
            subtitle: 'Lighting & Climate Control'
        });
        
        if (hasBathroom) {
            tabs.push({
                id: 'bathroom',
                name: '🚿 Bathroom',
                title: 'Bathroom',
                subtitle: hasBathroom === 'special' ? 'Special Bathroom Configuration' : 'Lighting & Heating Control'
            });
        }
        
        tabs.push({
            id: 'settings',
            name: '⚙️ Settings',
            title: 'Settings',
            subtitle: 'System Reset & Service Controls'
        });
        
        return tabs;
    }
    
    /**
     * Generazione configurazione controlli
     */
    generateControlsConfig(hasLivingRoom, hasBathroom) {
        const controls = {};
        
        // Living Room (se presente)
        if (hasLivingRoom) {
            controls.living = [
                // Luci Living Room
                { type: 'dali', name: '💡 Main Light', mqttName: 'Totale', initialLevel: 75, initialPower: false },
                { type: 'dali', name: '🌟 Courtesy Light', mqttName: 'Parziale', initialLevel: 30, initialPower: false },
                { type: 'dali', name: '🛋️ Sofa Light', mqttName: 'Divano', initialLevel: 50, initialPower: false },
                { type: 'dali', name: '📺 TV Light', mqttName: 'Televisione', initialLevel: 40, initialPower: false },
                // Clima Living Room
                { type: 'thermostat', name: '🌡️ Living Climate', mqttName: 'Clima', initialTemp: 22, initialPower: false, minTemp: 16, maxTemp: 28, measuredTemp: 20.5 }
            ];
        }
        
        // Bedroom (sempre presente)
        controls.bedroom = [
            // Luci Bedroom
            { type: 'dali', name: '💡 Main Light', mqttName: 'Totale', initialLevel: 75, initialPower: true },
            { type: 'dali', name: '🌟 Courtesy Light', mqttName: 'Parziale', initialLevel: 30, initialPower: false },
            { type: 'dali', name: '🛏️ Bed Light', mqttName: 'Letto', initialLevel: 50, initialPower: false },
            { type: 'dali', name: '💡 Left Abat Jour', mqttName: 'ComodinoSx', initialLevel: 60, initialPower: false },
            { type: 'dali', name: '💡 Right Abat Jour', mqttName: 'ComodinoDx', initialLevel: 60, initialPower: false },
            { type: 'dali', name: '💻 Desk Light', mqttName: 'Scrivania', initialLevel: 80, initialPower: false },
            // Clima Bedroom
            { type: 'thermostat', name: '🌡️ Bedroom Climate', mqttName: 'Clima', initialTemp: 21, initialPower: false, minTemp: 16, maxTemp: 28, measuredTemp: 19.2 }
        ];
        
        // Bathroom (se presente)
        if (hasBathroom) {
            if (hasBathroom === 'special') {
                // Room 19 - configurazione speciale bathroom
                controls.bathroom = [
                    // Luci Bathroom Speciale
                    { type: 'dali', name: '💡 Main Light', mqttName: 'Totale', initialLevel: 85, initialPower: false },
                    { type: 'dali', name: '🌟 Special Light', mqttName: 'Speciale', initialLevel: 40, initialPower: false },
                    // Clima Bathroom Speciale
                    { type: 'thermostat', name: '🌡️ Bathroom Climate', mqttName: 'Clima', initialTemp: 23, initialPower: false, minTemp: 18, maxTemp: 30, measuredTemp: 21.0 },
                    // Towel Heater Speciale
                    { type: 'onoff', name: '🔥 Towel Heater', mqttName: 'ScaldaOnOff', initialState: false, activeText: 'HEATING', inactiveText: 'OFF', activeFeedback: 'Towel heater active', inactiveFeedback: 'Towel heater off' }
                ];
            } else {
                // Bathroom standard
                controls.bathroom = [
                    // Luci Bathroom
                    { type: 'dali', name: '💡 Main Light', mqttName: 'Totale', initialLevel: 85, initialPower: false },
                    { type: 'dali', name: '🌟 Courtesy Light', mqttName: 'Parziale', initialLevel: 25, initialPower: false },
                    // Clima Bathroom
                    { type: 'thermostat', name: '🌡️ Bathroom Climate', mqttName: 'Clima', initialTemp: 23, initialPower: false, minTemp: 18, maxTemp: 30, measuredTemp: 21.0 },
                    // Towel Heater
                    { type: 'onoff', name: '🔥 Towel Heater', mqttName: 'ScaldaOnOff', initialState: false, activeText: 'HEATING', inactiveText: 'OFF', activeFeedback: 'Towel heater active', inactiveFeedback: 'Towel heater off' }
                ];
            }
        }
        
        // Settings (sempre presente)
        controls.settings = [
            { type: 'monostable', name: '🔄 Light Reset', buttonText: 'RESET LIGHTS', mqttName: 'ResetLuci' },
            { type: 'monostable', name: '🔄 Climate Reset', buttonText: 'RESET CLIMATE', mqttName: 'ResetClima' },
            { type: 'monostable', name: '🌙 Light Turn-Down', buttonText: 'TURN-DOWN SERVICE', mqttName: 'TurnDown' }
        ];
        
        return controls;
    }
    
    /**
     * Inizializzazione logo
     */
    initializeLogo() {
        setTimeout(() => {
            const logoImage = document.getElementById('logoImage');
            const logoFallback = document.getElementById('logoFallback');
            
            if (!logoImage || !logoFallback) return;
            
            logoImage.onload = () => {
                logoImage.style.display = 'block';
                logoFallback.style.display = 'none';
            };
            
            logoImage.onerror = () => {
                logoFallback.style.display = 'flex';
                logoImage.style.display = 'none';
                
                // Genera logo SVG con numero room
                const logoBase64 = 'data:image/svg+xml;base64,' + btoa(`
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
                        <defs>
                            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#1a4a3a;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#d4af37;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                        <circle cx="60" cy="60" r="60" fill="url(#grad)"/>
                        <text x="60" y="40" font-family="serif" font-size="16" font-weight="bold" text-anchor="middle" fill="white">AMAN</text>
                        <text x="60" y="58" font-family="serif" font-size="11" text-anchor="middle" fill="white">VENICE</text>
                        <text x="60" y="75" font-family="serif" font-size="9" text-anchor="middle" fill="white">ROOM ${this.roomNumber}</text>
                        <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
                    </svg>
                `);
                logoImage.src = logoBase64;
            };
            
            // Prova prima caricamento logo esterno
            logoImage.src = 'assets/logos/AmanVeniceCameraLogo.png';
        }, 100);
    }
    
    /**
     * Setup error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logToConsole('error', 'System Error', event.error.message);
        });
    }
    
    /**
     * Login della room
     */
    async doLogin(password) {
        try {
            console.log(`🔐 Login attempt for Room ${this.roomNumber} with password: ${password}`);
            
            // Validazione password
            if (password !== this.roomConfig.password) {
                throw new Error(`Invalid password. Please enter "${this.roomConfig.password}" for Room ${this.roomNumber}.`);
            }
            
            console.log(`✅ Login successful for Room ${this.roomNumber}`);
            return true;
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            throw error;
        }
    }
    
    /**
     * Caricamento dashboard
     */
    async loadDashboard() {
        try {
            this.updateLoadingStatus('Loading room configuration...');
            await this.sleep(500);
            
            this.updateLoadingStatus('Initializing MQTT system...');
            await this.initializeMQTT();
            await this.sleep(300);
            
            this.updateLoadingStatus('Loading controls...');
            await this.loadAllControls();
            await this.sleep(300);
            
            this.updateLoadingStatus('Connecting to room systems...');
            await this.connectSystems();
            await this.sleep(300);
            
            this.updateLoadingStatus('Finalizing...');
            await this.sleep(200);
            
            console.log(`🎉 Room ${this.roomNumber} Dashboard loaded successfully!`);
            this.logToConsole('info', 'Dashboard Ready', `Room ${this.roomNumber} loaded with all controls`);
            
            return true;
            
        } catch (error) {
            console.error('❌ Failed to load dashboard:', error);
            throw error;
        }
    }
    
    /**
     * Inizializzazione MQTT
     */
    async initializeMQTT() {
        try {
            console.log('📡 Initializing MQTT system...');
            
            // Usa la classe MQTTManager dal room-template.html
            this.mqttManager = new MQTTManager();
            
            // Setup handlers
            this.mqttManager.onMessage((topic, data) => {
                this.handleMQTTMessage(topic, data);
            });
            
            this.mqttManager.onConnection((connected, error) => {
                this.updateConnectionStatus(connected, error);
            });
            
            console.log('✅ MQTT system initialized');
            return true;
            
        } catch (error) {
            console.error('❌ MQTT initialization failed:', error);
            this.logToConsole('error', 'MQTT Failed', 'Running in simulation mode: ' + error.message);
            return false;
        }
    }
    
    /**
     * Connessione sistemi
     */
    async connectSystems() {
        try {
            console.log('🔌 Connecting to room systems...');
            
            if (this.mqttManager) {
                await this.mqttManager.connect();
            } else {
                console.log('❌ No MQTT manager available - real connection required');
                this.updateConnectionStatus(false, 'MQTT Manager not initialized');
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ Connection failed:', error);
            this.updateConnectionStatus(false, error.message);
            return false;
        }
    }
    
    /**
     * Caricamento di tutti i controlli
     */
    async loadAllControls() {
        try {
            const { controls } = this.roomConfig;
            
            for (const [sectionId, sectionControls] of Object.entries(controls)) {
                console.log(`🔧 Loading ${sectionId} controls...`);
                
                for (let i = 0; i < sectionControls.length; i++) {
                    const controlConfig = sectionControls[i];
                    const containerId = `${sectionId}-${controlConfig.name.toLowerCase().replace(/[^a-z]/g, '')}-${i}`;
                    
                    await this.loadControl(containerId, controlConfig, sectionId);
                    await this.sleep(50);
                }
            }
            
            console.log('✅ All controls loaded');
            
        } catch (error) {
            console.error('❌ Error loading controls:', error);
            throw error;
        }
    }
    
    /**
     * Caricamento controllo singolo
     */
    async loadControl(containerId, config, section) {
        try {
            const controlId = containerId.replace(/-/g, '_');
            
            // Creazione controllo in base al tipo
            const control = {
                id: controlId,
                containerId: containerId,
                section: section,
                type: config.type,
                name: config.name,
                mqttName: config.mqttName,
                config: config
            };
            
            // Inizializzazione in base al tipo
            switch (config.type) {
                case 'dali':
                    control.level = config.initialPower ? config.initialLevel : 0;
                    control.power = config.initialPower;
                    control.locale = section === 'bedroom' ? 'Camera' : 
                                   section === 'bathroom' ? 'Bagno' : 'Soggiorno';
                    break;
                    
                case 'onoff':
                    control.active = config.initialState;
                    control.locale = section === 'bedroom' ? 'Camera' : 
                                   section === 'bathroom' ? 'Bagno' : 'Soggiorno';
                    control.activeText = config.activeText || 'ON';
                    control.inactiveText = config.inactiveText || 'OFF';
                    control.activeFeedback = config.activeFeedback || 'System active';
                    control.inactiveFeedback = config.inactiveFeedback || 'System off';
                    break;
                    
                case 'thermostat':
                    control.temperature = config.initialTemp || 22;
                    control.measuredTemp = config.measuredTemp || 20.0;
                    control.power = config.initialPower || false;
                    control.minTemp = config.minTemp || 16;
                    control.maxTemp = config.maxTemp || 28;
                    control.locale = section === 'bedroom' ? 'Camera' : 
                                   section === 'bathroom' ? 'Bagno' : 'Soggiorno';
                    control.climateState = 'neutral';
                    break;
                    
                case 'monostable':
                    control.isExecuting = false;
                    control.executionTime = 3000;
                    control.cooldownTime = 2000;
                    control.locale = 'Globale';
                    control.buttonText = config.buttonText;
                    control.executingText = config.executingText || 'Executing...';
                    control.completedText = config.completedText || 'Completed';
                    break;
            }
            
            this.controls.set(controlId, control);
            console.log(`✅ Control loaded: ${controlId} (${config.type})`);
            
        } catch (error) {
            console.error(`❌ Failed to load control ${containerId}:`, error);
        }
    }
    
    /**
     * Gestione messaggio MQTT
     */
    handleMQTTMessage(topic, jsonData) {
        try {
            console.log(`📨 Processing message from ${topic}:`, jsonData);
            this.logToConsole('received', 'MQTT Received', JSON.stringify(jsonData, null, 2));
            
            // Solo messaggi per questa room
            if (jsonData.nCamera && jsonData.nCamera !== parseInt(this.roomNumber)) {
                console.log(`📍 Ignoring message for Room ${jsonData.nCamera}`);
                return;
            }
            
            // Identificazione tipo messaggio e parsing
            this.parseAndHandleMessage(jsonData);
            
            this.lastUpdateTime = new Date().toLocaleString();
            this.updateInfoModal();
            
        } catch (error) {
            console.error('❌ Error processing message:', error);
            this.logToConsole('error', 'Message Error', error.message);
        }
    }
    
    /**
     * Parser e gestore messaggi per tipo
     */
    parseAndHandleMessage(jsonData) {
        if (!jsonData.sNome) {
            console.warn('⚠️ Message without sNome field');
            return;
        }
        
        console.log(`🔍 Message type: ${jsonData.sNome}`);
        
        switch (jsonData.sNome) {
            case 'CameraLuci':
            case 'BagnoLuci':
            case 'SoggiornoLuci':
                this.handleDALIMessage(jsonData);
                break;
                
            case 'Clima':
                this.handleClimateMessage(jsonData);
                break;
                
            default:
                console.log(`📋 Unhandled message type: ${jsonData.sNome}`);
        }
    }
    
    /**
     * Gestione messaggi DALI - IMPLEMENTAZIONE COMPLETA
     */
    handleDALIMessage(jsonData) {
        try {
            console.log(`💡 DALI message received for Room ${jsonData.nCamera} - Section: ${jsonData.sNome}`);
            
            // Routing per sezione specifica
            switch (jsonData.sNome) {
                case 'CameraLuci':
                    this.updateBedroomLightsFromMQTT(jsonData);
                    break;
                    
                case 'BagnoLuci':
                    this.updateBathroomLightsFromMQTT(jsonData);
                    break;
                    
                case 'SoggiornoLuci':
                    this.updateLivingRoomLightsFromMQTT(jsonData);
                    break;
                    
                default:
                    console.warn(`⚠️ Unknown DALI section: ${jsonData.sNome}`);
                    return;
            }
            
            // Log successo
            this.logToConsole('info', 'DALI Updated', `${jsonData.sNome} lights updated for Room ${jsonData.nCamera}`);
            
        } catch (error) {
            console.error('❌ Error handling DALI message:', error);
            this.logToConsole('error', 'DALI Error', error.message);
        }
    }
    
    /**
     * Aggiornamento luci Camera (Bedroom) da MQTT
     */
    updateBedroomLightsFromMQTT(jsonData) {
        try {
            console.log('🛏️ Updating bedroom lights from MQTT');
            
            // Mapping campi MQTT → ID controlli bedroom
            const lightMapping = {
                'nTotaLiv': 'bedroom_mainlight_0',           // 💡 Main Light
                'nParzLiv': 'bedroom_courtesylight_1',       // 🌟 Courtesy Light  
                'nLettLiv': 'bedroom_bedlight_2',            // 🛏️ Bed Light
                'nCoSxLiv': 'bedroom_leftabatjour_3',        // 💡 Left Abat Jour
                'nCoDxLiv': 'bedroom_rightabatjour_4',       // 💡 Right Abat Jour
                'nScriLiv': 'bedroom_desklight_5'            // 💻 Desk Light
            };
            
            // Aggiorna ogni controllo luce
            let updatedCount = 0;
            Object.entries(lightMapping).forEach(([mqttField, controlId]) => {
                if (jsonData.hasOwnProperty(mqttField)) {
                    const level = jsonData[mqttField];
                    const success = this.updateDALIControlFromMQTT(controlId, level);
                    if (success) {
                        updatedCount++;
                        console.log(`✅ ${mqttField}: ${level}% → ${controlId}`);
                    }
                }
            });
            
            console.log(`🛏️ Bedroom lights updated: ${updatedCount} controls`);
            
        } catch (error) {
            console.error('❌ Error updating bedroom lights:', error);
        }
    }
    
    /**
     * Aggiornamento luci Bagno (Bathroom) da MQTT
     */
    updateBathroomLightsFromMQTT(jsonData) {
        try {
            console.log('🚿 Updating bathroom lights from MQTT');
            
            // Mapping campi MQTT → ID controlli bathroom
            const lightMapping = {
                'nTotaLiv': 'bathroom_mainlight_0',          // 💡 Main Light
                'nParzLiv': 'bathroom_courtesylight_1'       // 🌟 Courtesy Light
            };
            
            // Per Room 19 (configurazione speciale)
            if (parseInt(this.roomNumber) === 19) {
                lightMapping['nSpecLiv'] = 'bathroom_speciallight_1';  // 🌟 Special Light
            }
            
            // Aggiorna ogni controllo luce
            let updatedCount = 0;
            Object.entries(lightMapping).forEach(([mqttField, controlId]) => {
                if (jsonData.hasOwnProperty(mqttField)) {
                    const level = jsonData[mqttField];
                    const success = this.updateDALIControlFromMQTT(controlId, level);
                    if (success) {
                        updatedCount++;
                        console.log(`✅ ${mqttField}: ${level}% → ${controlId}`);
                    }
                }
            });
            
            console.log(`🚿 Bathroom lights updated: ${updatedCount} controls`);
            
        } catch (error) {
            console.error('❌ Error updating bathroom lights:', error);
        }
    }
    
    /**
     * Aggiornamento luci Soggiorno (Living Room) da MQTT
     */
    updateLivingRoomLightsFromMQTT(jsonData) {
        try {
            console.log('🏛️ Updating living room lights from MQTT');
            
            // Mapping campi MQTT → ID controlli living room
            const lightMapping = {
                'nTotaLiv': 'living_mainlight_0',            // 💡 Main Light
                'nParzLiv': 'living_courtesylight_1',        // 🌟 Courtesy Light
                'nDivLiv': 'living_sofalight_2',             // 🛋️ Sofa Light
                'nTvLiv': 'living_tvlight_3'                 // 📺 TV Light
            };
            
            // Aggiorna ogni controllo luce
            let updatedCount = 0;
            Object.entries(lightMapping).forEach(([mqttField, controlId]) => {
                if (jsonData.hasOwnProperty(mqttField)) {
                    const level = jsonData[mqttField];
                    const success = this.updateDALIControlFromMQTT(controlId, level);
                    if (success) {
                        updatedCount++;
                        console.log(`✅ ${mqttField}: ${level}% → ${controlId}`);
                    }
                }
            });
            
            console.log(`🏛️ Living room lights updated: ${updatedCount} controls`);
            
        } catch (error) {
            console.error('❌ Error updating living room lights:', error);
        }
    }
    
    /**
     * Aggiornamento singolo controllo DALI da MQTT
     */
    updateDALIControlFromMQTT(controlId, level) {
        try {
            // Trova il controllo
            const control = this.getControl(controlId);
            if (!control) {
                console.warn(`⚠️ Control ${controlId} not found for MQTT update`);
                return false;
            }
            
            // Verifica che sia un controllo DALI
            if (control.type !== 'dali') {
                console.warn(`⚠️ Control ${controlId} is not a DALI control`);
                return false;
            }
            
            // Validazione livello
            const validLevel = Math.max(0, Math.min(100, Math.round(level)));
            
            // Aggiorna dati controllo
            const oldLevel = control.level;
            const oldPower = control.power;
            
            control.level = validLevel;
            control.power = validLevel > 0;
            
            // Log cambiamento
            if (oldLevel !== validLevel || oldPower !== control.power) {
                console.log(`🔄 ${controlId}: ${oldLevel}%→${validLevel}% (${oldPower ? 'ON' : 'OFF'}→${control.power ? 'ON' : 'OFF'})`);
            }
            
            // Aggiorna UI tramite Control Factory (senza inviare MQTT)
            this.updateDALIDisplayFromMQTT(controlId, control);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Error updating DALI control ${controlId}:`, error);
            return false;
        }
    }
    
    /**
     * Aggiornamento display DALI da MQTT (senza loop MQTT)
     */
    updateDALIDisplayFromMQTT(controlId, control) {
        try {
            // Update level display
            const display = document.getElementById(`${controlId}_display`);
            if (display) {
                display.innerHTML = `${control.level}<span class="level-unit">%</span>`;
                display.classList.toggle('on', control.power);
                display.classList.toggle('off', !control.power);
                
                // Visual feedback per MQTT update
                display.style.border = '2px solid #4CAF50';
                setTimeout(() => display.style.border = '', 1000);
            }
            
            // Update slider
            const fill = document.getElementById(`${controlId}_fill`);
            const thumb = document.getElementById(`${controlId}_thumb`);
            if (fill && thumb) {
                fill.style.width = control.level + '%';
                thumb.style.left = `calc(${control.level}% - 12px)`;
                thumb.classList.toggle('active', control.power);
                
                // Visual feedback
                fill.style.backgroundColor = '#4CAF50';
                setTimeout(() => fill.style.backgroundColor = '', 1000);
            }
            
            // Update buttons
            const onBtn = document.getElementById(`${controlId}_on`);
            const offBtn = document.getElementById(`${controlId}_off`);
            if (onBtn && offBtn) {
                onBtn.classList.toggle('on-active', control.power);
                onBtn.classList.toggle('active', false);
                offBtn.classList.toggle('active', !control.power);
                
                // Visual feedback on state change
                const activeBtn = control.power ? onBtn : offBtn;
                activeBtn.style.boxShadow = '0 0 10px #4CAF50';
                setTimeout(() => activeBtn.style.boxShadow = '', 1000);
            }
            
            // Update status
            const dot = document.getElementById(`${controlId}_dot`);
            const status = document.getElementById(`${controlId}_status`);
            if (dot && status) {
                dot.classList.toggle('on', control.power);
                dot.classList.toggle('off', !control.power);
                status.textContent = control.power ? 'Lights On' : 'Lights Off';
                
                // Visual feedback
                dot.style.boxShadow = '0 0 8px #4CAF50';
                setTimeout(() => dot.style.boxShadow = '', 1000);
            }
            
            console.log(`✅ UI updated for ${controlId}: ${control.level}% (${control.power ? 'ON' : 'OFF'})`);
            
        } catch (error) {
            console.error(`❌ Error updating DALI display ${controlId}:`, error);
        }
    }
    
    /**
     * Gestione messaggi Clima
     */
    handleClimateMessage(jsonData) {
        try {
            console.log(`🌡️ Climate message received for Room ${jsonData.nCamera}`);
            
            // Parse camera climate data
            if (jsonData.hasOwnProperty('nCameraMis') && jsonData.hasOwnProperty('nCameraSet')) {
                const cameraClimate = {
                    measuredTemp: this.convertTemperature(jsonData.nCameraMis),
                    setpointTemp: this.convertTemperature(jsonData.nCameraSet),
                    ventilation: jsonData.nCameraVen || 0,
                    heating: jsonData.nCameraCal || 0,
                    cooling: jsonData.nCameraFre || 0,
                    isOn: jsonData.nCameraSet > 0
                };
                
                this.updateThermostatFromMQTT('bedroom', cameraClimate);
                console.log(`🛏️ Camera climate updated:`, cameraClimate);
            }
            
            // Parse bagno climate data
            if (jsonData.hasOwnProperty('nBagnoMis') && jsonData.hasOwnProperty('nBagnoSet')) {
                const bagnoClimate = {
                    measuredTemp: this.convertTemperature(jsonData.nBagnoMis),
                    setpointTemp: this.convertTemperature(jsonData.nBagnoSet),
                    ventilation: jsonData.nBagnoVen || 0,
                    heating: jsonData.nBagnoCal || 0,
                    cooling: jsonData.nBagnoFre || 0,
                    isOn: jsonData.nBagnoSet > 0
                };
                
                this.updateThermostatFromMQTT('bathroom', bagnoClimate);
                console.log(`🚿 Bagno climate updated:`, bagnoClimate);
            }
            
            this.logToConsole('info', 'Climate Updated', `Room ${jsonData.nCamera} climate data processed`);
            
        } catch (error) {
            console.error('❌ Error handling climate message:', error);
            this.logToConsole('error', 'Climate Error', error.message);
        }
    }
    
    /**
     * Conversione temperatura (divide per 10)
     */
    convertTemperature(rawValue) {
        if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
            return 20.0; // Default temperature
        }
        return Math.round((rawValue / 10) * 10) / 10; // Round to 1 decimal
    }
    
    /**
     * Aggiorna thermostat da messaggio MQTT
     */
    updateThermostatFromMQTT(section, climateData) {
        try {
            // Trova il controllo thermostat per questa sezione
            const controls = Array.from(this.controls.values())
                .filter(control => control.section === section && control.type === 'thermostat');
            
            if (controls.length === 0) {
                console.log(`📋 No thermostat control found for section: ${section}`);
                return;
            }
            
            const thermostatControl = controls[0];
            
            // Aggiorna dati controllo
            thermostatControl.temperature = climateData.setpointTemp;
            thermostatControl.measuredTemp = climateData.measuredTemp;
            thermostatControl.power = climateData.isOn;
            
            // Determina stato (heating/cooling/neutral)
            thermostatControl.climateState = this.determineClimateState(climateData);
            
            // Notifica control factory per aggiornamento UI
            if (window.roomControls && window.roomControls.updateThermostatFromMQTT) {
                window.roomControls.updateThermostatFromMQTT(thermostatControl.id, thermostatControl);
            }
            
            console.log(`✅ Thermostat ${thermostatControl.id} updated from MQTT`);
            
        } catch (error) {
            console.error(`❌ Error updating thermostat for ${section}:`, error);
        }
    }
    
    /**
     * Determina stato clima (heating/cooling/neutral)
     */
    determineClimateState(climateData) {
        const tempDiff = climateData.setpointTemp - climateData.measuredTemp;
        const tolerance = 0.5;
        
        if (!climateData.isOn) {
            return 'off';
        }
        
        // Controllo attivo heating/cooling
        if (climateData.heating > 500) {
            return 'heating';
        } else if (climateData.cooling > 500) {
            return 'cooling';
        }
        
        // Fallback su differenza temperatura
        if (Math.abs(tempDiff) <= tolerance) {
            return 'neutral';
        } else if (tempDiff > tolerance) {
            return 'heating';
        } else {
            return 'cooling';
        }
    }
    
    /**
     * Invio messaggio MQTT
     */
    sendMQTTMessage(payload) {
        payload.nCamera = parseInt(this.roomNumber);
        payload.Timestamp = new Date().toISOString();
        
        if (this.mqttManager && this.mqttManager.isConnected) {
            console.log('📤 MQTT message sent:', payload);
            this.logToConsole('sent', `${payload.sLocale || 'System'}`, JSON.stringify(payload, null, 2));
            this.lastUpdateTime = new Date().toLocaleString();
            this.updateInfoModal();
            return this.mqttManager.publish(payload);
        } else {
            console.warn('⚠️ MQTT not connected - message not sent');
            this.logToConsole('error', 'MQTT Required', `Cannot send message - MQTT not connected`);
            return false;
        }
    }
    
    /**
     * Aggiornamento stato connessione
     */
    updateConnectionStatus(connected, error = null) {
        this.connected = connected;
        
        const indicator = document.getElementById('statusIndicator');
        const status = document.getElementById('connectionStatus');
        
        if (indicator && status) {
            if (connected) {
                indicator.classList.add('connected');
                indicator.classList.remove('connecting');
                status.textContent = 'MQTT Connected';
            } else {
                indicator.classList.remove('connected', 'connecting');
                status.textContent = 'Disconnected';
                if (error) {
                    this.logToConsole('error', 'Connection Error', error);
                }
            }
        }
        
        this.updateInfoModal();
    }
    
    /**
     * Aggiornamento status loading
     */
    updateLoadingStatus(message) {
        const details = document.getElementById('loadingDetails');
        if (details) {
            details.textContent = message;
        }
        console.log('⏳', message);
    }
    
    /**
     * Aggiornamento info modal
     */
    updateInfoModal() {
        const elements = {
            infoRoomNumber: this.roomNumber,
            infoLastUpdate: this.lastUpdateTime,
            infoMqttStatus: this.connected ? 'Connected' : 'Disconnected',
            infoClientId: this.mqttManager ? this.mqttManager.config?.clientId || 'Connected' : 'Disconnected',
            roomNameStatus: `Room ${this.roomNumber}`,
            lastUpdate: this.lastUpdateTime,
            infoTitle: `AMAN Venice - Room ${this.roomNumber}`,
            infoVersion: `Room ${this.roomNumber} v1.0`,
            loginTitle: `Room ${this.roomNumber} Control`,
            loadingText: `Initializing Room ${this.roomNumber} Dashboard`,
            consoleTitle: `📡 MQTT Console - Room ${this.roomNumber}`
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
    }
    
    /**
     * Log to console
     */
    logToConsole(type, header, data) {
        const content = document.getElementById('consoleContent');
        if (!content) return;
        
        const timestamp = new Date().toLocaleTimeString();
        const messageDiv = document.createElement('div');
        
        let icon = '';
        let cssClass = '';
        
        switch(type) {
            case 'sent': 
                icon = '📤'; 
                cssClass = 'message-sent';
                break;
            case 'received': 
                icon = '📥'; 
                cssClass = 'message-received';
                break;
            case 'info': 
                icon = 'ℹ️'; 
                cssClass = 'message-info';
                break;
            case 'error': 
                icon = '❌'; 
                cssClass = 'message-error';
                break;
        }
        
        messageDiv.className = cssClass;
        messageDiv.style.whiteSpace = 'pre-wrap';
        
        let messageText = `[${timestamp}] ${icon} ${header}`;
        if (data) {
            messageText += ':\n' + data;
        }
        
        messageDiv.textContent = messageText;
        content.appendChild(messageDiv);
        content.scrollTop = content.scrollHeight;
        
        // Keep only last 50 messages
        const messages = content.querySelectorAll('div');
        if (messages.length > 50) {
            messages[0].remove();
        }
    }
    
    /**
     * Utility sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Get room config
     */
    getRoomConfig() {
        return this.roomConfig;
    }
    
    /**
     * Get control by ID
     */
    getControl(controlId) {
        return this.controls.get(controlId);
    }
    
    /**
     * Get all controls
     */
    getAllControls() {
        return Array.from(this.controls.values());
    }
}

// Export globale
window.AmanDashboardCore = AmanDashboardCore;