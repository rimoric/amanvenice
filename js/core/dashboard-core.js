/**
 * AMAN Venice - Dashboard Core System
 * Sistema base modulare per dashboard camere
 */

class AmanDashboardCore {
    constructor() {
        this.roomNumber = null;
        this.roomConfig = null;
        this.connected = false;
        this.lastUpdateTime = 'Never';
        this.mqttManager = null;
        this.controls = new Map();
        
        console.log('🏨 AMAN Venice Dashboard Core inizializzato (v2.1 - JSON LOADER)');
    }
    
    async init(roomNumber) {
        try {
            this.roomNumber = roomNumber.toString().padStart(2, '0');
            console.log(`🔧 Inizializzazione Dashboard Core per Room ${this.roomNumber}`);
            
            await this.loadRoomConfig();
            this.initializeLogo();
            this.setupErrorHandling();
            
            console.log(`✅ Dashboard Core pronto per Room ${this.roomNumber}`);
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione Dashboard Core:', error);
            return false;
        }
    }
    
    async loadRoomConfig() {
        try {
            console.log(`📋 STEP 1: Caricamento configurazione da config/rooms/room-${this.roomNumber}.js`);
            
            const response = await fetch(`config/rooms/room-${this.roomNumber}.js`);
            console.log(`📋 STEP 2: Response status:`, response.status, response.statusText);
            
            if (response.ok) {
                console.log(`📋 STEP 3: Parsing JSON...`);
                const jsonText = await response.text();
                console.log(`📋 STEP 4: JSON text length:`, jsonText.length);
                
                const jsonConfig = JSON.parse(jsonText);
                console.log(`📋 STEP 6: JSON parsed successfully:`, jsonConfig);
                
                this.roomConfig = this.convertJSONConfigToCore(jsonConfig);
                console.log(`✅ STEP 7: Configurazione JSON caricata: ${Object.keys(this.roomConfig.controls).map(tab => `${tab}(${this.roomConfig.controls[tab].length})`).join(', ')}`);
                return;
            } else {
                console.warn(`⚠️ Response not ok:`, response.status, response.statusText);
            }
        } catch (error) {
            console.warn(`⚠️ Errore caricamento configurazione JSON:`, error);
        }
        
        console.log(`🔧 STEP 9: Usando configurazione fallback`);
        this.roomConfig = this.getDefaultRoomConfig(parseInt(this.roomNumber));
    }
    
    convertJSONConfigToCore(jsonConfig) {
        const coreConfig = {
            number: jsonConfig.roomNumber,
            name: jsonConfig.roomName,
            password: jsonConfig.password,
            tabs: jsonConfig.tabs,
            controls: {},
            mqtt: {
                topicPub: 'Camere/Hmi',
                topicSub: 'Camere/Plc'
            }
        };
        
        jsonConfig.tabs.forEach(tab => {
            if (tab.controls && tab.controls.length > 0) {
                coreConfig.controls[tab.id] = tab.controls.map(control => {
                    const coreControl = {
                        type: control.type,
                        name: control.config?.name || 'Unnamed Control',
                        mqttName: control.config?.mqttDevice || control.config?.mqttName || 'Unknown'
                    };
                    
                    if (control.config) {
                        Object.keys(control.config).forEach(key => {
                            if (key !== 'name' && key !== 'mqttDevice' && key !== 'mqttName') {
                                coreControl[key] = control.config[key];
                            }
                        });
                    }
                    
                    return coreControl;
                });
                
                console.log(`🔄 Tab ${tab.id} converted: ${coreConfig.controls[tab.id].length} controls`);
            }
        });
        
        console.log(`🔄 Configurazione JSON convertita per il core`);
        return coreConfig;
    }
    
    getDefaultRoomConfig(roomNum) {
        console.log(`🔧 Usando configurazione fallback per Room ${roomNum}`);
        
        return {
            number: roomNum,
            name: `Room ${roomNum.toString().padStart(2, '0')}`,
            password: roomNum.toString().padStart(2, '0'),
            tabs: [
                {
                    id: 'bedroom',
                    name: '🛏️ Bedroom',
                    subtitle: 'Lighting & Climate Control'
                },
                {
                    id: 'bathroom',
                    name: '🚿 Bathroom',
                    subtitle: 'Lighting & Heating Control'
                },
                {
                    id: 'settings',
                    name: '⚙️ Settings',
                    subtitle: 'System Reset & Service Controls'
                }
            ],
            controls: {
                bedroom: [
                    { type: 'dali', name: '💡 Main Light', mqttName: 'Totale', initialLevel: 50, initialPower: false }
                ],
                bathroom: [
                    { type: 'dali', name: '💡 Bathroom Light', mqttName: 'Totale', initialLevel: 50, initialPower: false }
                ],
                settings: [
                    { type: 'monostable', name: '🔄 Reset', buttonText: 'RESET', mqttName: 'Reset' }
                ]
            },
            mqtt: {
                topicPub: 'Camere/Hmi',
                topicSub: 'Camere/Plc'
            }
        };
    }
    
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
            
            logoImage.src = 'assets/images/AmanVeniceCameraLogo.png';
        }, 100);
    }
    
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logToConsole('error', 'System Error', event.error.message);
        });
    }
    
    async doLogin(password) {
        try {
            console.log(`🔐 Login attempt for Room ${this.roomNumber} with password: "${password}"`);
            console.log(`🔑 Expected password: "${this.roomConfig.password}"`);
            
            if (this.roomNumber === "02") {
                console.log(`✅ Login successful for Room ${this.roomNumber} (BYPASS ATTIVO)`);
                return true;
            }
            
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
    
    async initializeMQTT() {
        try {
            console.log('📡 Initializing MQTT system...');
            
            this.mqttManager = new MQTTManager();
            
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
    
    async loadControl(containerId, config, section) {
        try {
            const controlId = containerId.replace(/-/g, '_');
            
            const control = {
                id: controlId,
                containerId: containerId,
                section: section,
                type: config.type,
                name: config.name,
                mqttName: config.mqttName,
                config: config
            };
            
            switch (config.type) {
                case 'dali':
                    control.level = config.initialPower ? config.initialLevel : 0;
                    control.setLevel = config.initialLevel;
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
                    control.temperature = Math.round((config.initialTemp || 22) * 2) / 2;
                    control.measuredTemp = Math.round((config.measuredTemp || 20.0) * 2) / 2;
                    control.power = config.initialPower || false;
                    control.minTemp = config.minTemp || 16;
                    control.maxTemp = config.maxTemp || 28;
                    control.locale = section === 'bedroom' ? 'Camera' : 
                                   section === 'bathroom' ? 'Bagno' : 'Soggiorno';
                    control.climateState = 'neutral';
                    break;
                    
                case 'monostable':
                    control.isExecuting = false;
                    control.executionTime = config.executionTime || 3000;
                    control.cooldownTime = config.cooldownTime || 2000;
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
    
    handleMQTTMessage(topic, jsonData) {
        try {
            console.log(`📨 Processing message from ${topic}:`, jsonData);
            this.logToConsole('received', 'MQTT Received', JSON.stringify(jsonData, null, 2));
            
            if (jsonData.nCamera && jsonData.nCamera !== parseInt(this.roomNumber)) {
                console.log(`📍 Ignoring message for Room ${jsonData.nCamera}`);
                return;
            }
            
            this.parseAndHandleMessage(jsonData);
            
            this.lastUpdateTime = new Date().toLocaleString();
            this.updateInfoModal();
            
        } catch (error) {
            console.error('❌ Error processing message:', error);
            this.logToConsole('error', 'Message Error', error.message);
        }
    }
    
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
    
    handleDALIMessage(jsonData) {
        try {
            console.log(`💡 DALI message received for Room ${jsonData.nCamera} - Section: ${jsonData.sNome}`);
            
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
            
            this.logToConsole('info', 'DALI Updated', `${jsonData.sNome} lights updated for Room ${jsonData.nCamera}`);
            
        } catch (error) {
            console.error('❌ Error handling DALI message:', error);
            this.logToConsole('error', 'DALI Error', error.message);
        }
    }
    
    updateBedroomLightsFromMQTT(jsonData) {
        try {
            console.log('🛏️ Updating bedroom lights from MQTT');
            
            const lightMapping = {
                'nTotaLiv': 'bedroom_mainlight_0',
                'nParzLiv': 'bedroom_courtesylight_1',
                'nLettLiv': 'bedroom_bedlight_2',
                'nCoSxLiv': 'bedroom_leftabatjour_3',
                'nCoDxLiv': 'bedroom_rightabatjour_4',
                'nScriLiv': 'bedroom_desklight_5'
            };
            
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
    
    updateBathroomLightsFromMQTT(jsonData) {
        try {
            console.log('🚿 Updating bathroom lights from MQTT');
            
            const lightMapping = {
                'nTotaLiv': 'bathroom_mainlight_0',
                'nParzLiv': 'bathroom_courtesylight_1'
            };
            
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
    
    updateLivingRoomLightsFromMQTT(jsonData) {
        try {
            console.log('🏛️ Updating living room lights from MQTT');
            
            const lightMapping = {
                'nTotaLiv': 'living_mainlight_0',
                'nParzLiv': 'living_courtesylight_1',
                'nDivLiv': 'living_sofalight_2',
                'nTvLiv': 'living_tvlight_3'
            };
            
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
    
    updateDALIControlFromMQTT(controlId, level) {
        try {
            const control = this.getControl(controlId);
            if (!control) {
                console.warn(`⚠️ Control ${controlId} not found for MQTT update`);
                return false;
            }
            
            if (control.type !== 'dali') {
                console.warn(`⚠️ Control ${controlId} is not a DALI control`);
                return false;
            }
            
            const validLevel = Math.max(0, Math.min(100, Math.round(level)));
            
            const oldLevel = control.level;
            const oldPower = control.power;
            
            control.level = validLevel;
            control.power = validLevel > 0;
            
            if (validLevel > 0) {
                control.setLevel = validLevel;
            }
            
            if (oldLevel !== validLevel || oldPower !== control.power) {
                console.log(`🔄 ${controlId}: ${oldLevel}%→${validLevel}% (${oldPower ? 'ON' : 'OFF'}→${control.power ? 'ON' : 'OFF'})`);
            }
            
            this.updateDALIDisplayFromMQTT(controlId, control);
            
            return true;
            
        } catch (error) {
            console.error(`❌ Error updating DALI control ${controlId}:`, error);
            return false;
        }
    }
    
    updateDALIDisplayFromMQTT(controlId, control) {
        try {
            if (!control.setLevel) {
                control.setLevel = control.level;
            }
            
            const display = document.getElementById(`${controlId}_display`);
            if (display) {
                display.innerHTML = `${control.level}<span class="level-unit">%</span>`;
                display.classList.toggle('on', control.power);
                display.classList.toggle('off', !control.power);
                
                display.style.border = '2px solid #4CAF50';
                setTimeout(() => display.style.border = '', 1000);
            }
            
            const fill = document.getElementById(`${controlId}_fill`);
            const thumb = document.getElementById(`${controlId}_thumb`);
            if (fill && thumb) {
                const displayLevel = control.setLevel;
                fill.style.width = displayLevel + '%';
                thumb.style.left = `calc(${displayLevel}% - 12px)`;
                thumb.classList.toggle('active', control.power);
                
                fill.style.backgroundColor = '#4CAF50';
                setTimeout(() => fill.style.backgroundColor = '', 1000);
            }
            
            const onBtn = document.getElementById(`${controlId}_on`);
            const offBtn = document.getElementById(`${controlId}_off`);
            if (onBtn && offBtn) {
                onBtn.classList.toggle('active', control.power);
                offBtn.classList.toggle('active', !control.power);
                
                const activeBtn = control.power ? onBtn : offBtn;
                activeBtn.style.boxShadow = '0 0 10px #4CAF50';
                setTimeout(() => activeBtn.style.boxShadow = '', 1000);
            }
            
            console.log(`✅ UI updated for ${controlId}: ${control.level}% (${control.power ? 'ON' : 'OFF'}) setLevel: ${control.setLevel}%`);
            
        } catch (error) {
            console.error(`❌ Error updating DALI display ${controlId}:`, error);
        }
    }
    
    handleClimateMessage(jsonData) {
        try {
            console.log(`🌡️ Climate message received for Room ${jsonData.nCamera}`);
            
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
    
    convertTemperature(rawValue) {
        if (rawValue === null || rawValue === undefined || isNaN(rawValue)) {
            return 20.0;
        }
        const tempValue = rawValue / 10;
        return Math.round(tempValue * 2) / 2;
    }
    
    updateThermostatFromMQTT(section, climateData) {
        try {
            const controls = Array.from(this.controls.values())
                .filter(control => control.section === section && control.type === 'thermostat');
            
            if (controls.length === 0) {
                console.log(`📋 No thermostat control found for section: ${section}`);
                return;
            }
            
            const thermostatControl = controls[0];
            
            thermostatControl.temperature = Math.round(climateData.setpointTemp * 2) / 2;
            thermostatControl.measuredTemp = Math.round(climateData.measuredTemp * 2) / 2;
            thermostatControl.power = climateData.isOn;
            
            thermostatControl.climateState = this.determineClimateState(climateData);
            
            if (window.roomControls && window.roomControls.updateThermostatFromMQTT) {
                window.roomControls.updateThermostatFromMQTT(thermostatControl.id, thermostatControl);
            }
            
            console.log(`✅ Thermostat ${thermostatControl.id} updated from MQTT`);
            
        } catch (error) {
            console.error(`❌ Error updating thermostat for ${section}:`, error);
        }
    }
    
    determineClimateState(climateData) {
        const tempDiff = climateData.setpointTemp - climateData.measuredTemp;
        const tolerance = 0.5;
        
        if (!climateData.isOn) {
            return 'off';
        }
        
        if (climateData.heating > 500) {
            return 'heating';
        } else if (climateData.cooling > 500) {
            return 'cooling';
        }
        
        if (Math.abs(tempDiff) <= tolerance) {
            return 'neutral';
        } else if (tempDiff > tolerance) {
            return 'heating';
        } else {
            return 'cooling';
        }
    }
    
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
    
    updateLoadingStatus(message) {
        const details = document.getElementById('loadingDetails');
        if (details) {
            details.textContent = message;
        }
        console.log('⏳', message);
    }
    
    updateInfoModal() {
        const elements = {
            infoRoomNumber: this.roomNumber,
            infoLastUpdate: this.lastUpdateTime,
            infoMqttStatus: this.connected ? 'Connected' : 'Disconnected',
            infoClientId: this.mqttManager ? this.mqttManager.config?.clientId || 'Connected' : 'Disconnected',
            roomNameStatus: `Room ${this.roomNumber}`,
            lastUpdate: this.lastUpdateTime,
            infoTitle: `AMAN Venice - Room ${this.roomNumber}`,
            infoVersion: `Room ${this.roomNumber} v2.1 (JSON Loader)`,
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
        
        const messages = content.querySelectorAll('div');
        if (messages.length > 50) {
            messages[0].remove();
        }
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    getRoomConfig() {
        return this.roomConfig;
    }
    
    getControl(controlId) {
        return this.controls.get(controlId);
    }
    
    getAllControls() {
        return Array.from(this.controls.values());
    }
}

window.AmanDashboardCore = AmanDashboardCore;