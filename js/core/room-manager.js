/**
 * AMAN Venice - Room Manager (COMPLETO E AGGIORNATO)
 * Gestione layout e navigazione delle room
 * 
 * Funzionalità:
 * - Generazione layout dinamico
 * - Gestione tab navigation
 * - Coordinamento tra sezioni
 * - Integrazione con dashboard core
 * - CONTROLLI DALI MIGLIORATI: Range 10-100%, colori verdi, slider fluido
 * - CONTROLLI TERMOSTATO MIGLIORATI: Step 0.5°C, stati visuali, drag fluido
 * - BUG FIX: Caricamento corretto controlli da tab.controls
 */

class AmanRoomManager {
    constructor(dashboardCore) {
        this.dashboardCore = dashboardCore;
        this.activeTab = null;
        this.loadedSections = new Set();
        
        console.log('🏠 AMAN Room Manager inizializzato (v2.1 - FIXED)');
    }
    
    /**
     * Generazione layout completo dashboard
     */
    async generateLayout() {
        try {
            const roomConfig = this.dashboardCore.getRoomConfig();
            console.log(`🎨 Generazione layout per Room ${roomConfig.number}`);
            
            // Aggiornamento titoli room
            this.updateRoomTitles(roomConfig);
            
            // Generazione navigation tabs
            this.generateNavigationTabs(roomConfig.tabs);
            
            // Generazione contenuti tab
            await this.generateTabContents(roomConfig);
            
            // Attivazione primo tab
            this.activateFirstTab(roomConfig.tabs);
            
            console.log('✅ Layout generato con successo');
            
        } catch (error) {
            console.error('❌ Errore generazione layout:', error);
            throw error;
        }
    }
    
    /**
     * Aggiornamento titoli room
     */
    updateRoomTitles(roomConfig) {
        // Aggiorna tutti i riferimenti al numero room
        const updates = {
            loginTitle: `Room ${roomConfig.number.toString().padStart(2, '0')} Control`,
            loadingText: `Initializing Room ${roomConfig.number.toString().padStart(2, '0')} Dashboard`,
            roomNameStatus: `Room ${roomConfig.number.toString().padStart(2, '0')}`,
            consoleTitle: `📡 MQTT Console - Room ${roomConfig.number.toString().padStart(2, '0')}`,
            infoTitle: `AMAN Venice - Room ${roomConfig.number.toString().padStart(2, '0')}`,
            infoVersion: `Room ${roomConfig.number.toString().padStart(2, '0')} v1.0`
        };
        
        Object.keys(updates).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = updates[id];
            }
        });
    }
    
    /**
     * Generazione navigation tabs
     */
    generateNavigationTabs(tabs) {
        const navigationContainer = document.getElementById('navigationTabs');
        if (!navigationContainer) {
            console.error('❌ Navigation container non trovato');
            return;
        }
        
        // Pulisci container
        navigationContainer.innerHTML = '';
        
        // Genera tab buttons
        tabs.forEach((tab, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = `nav-tab ${index === 0 ? 'active' : ''}`;
            tabButton.textContent = tab.name;
            tabButton.onclick = () => this.switchTab(tab.id, tabButton);
            
            navigationContainer.appendChild(tabButton);
        });
        
        console.log(`✅ ${tabs.length} navigation tabs generati`);
    }
    
    /**
     * Generazione contenuti tab - BUG FIX V4 - FORMATO JSON + CORE
     */
    async generateTabContents(roomConfig) {
        const tabsContainer = document.getElementById('tabsContainer');
        if (!tabsContainer) {
            console.error('❌ Tabs container non trovato');
            return;
        }
        
        // Pulisci container
        tabsContainer.innerHTML = '';
        
        console.log(`🔍 DEBUG roomConfig:`, roomConfig);
        console.log(`🔍 DEBUG roomConfig.controls:`, roomConfig.controls);
        
        // Genera ogni tab - FIX: Gestisci entrambi i formati di configurazione
        for (let i = 0; i < roomConfig.tabs.length; i++) {
            const tab = roomConfig.tabs[i];
            
            // NUOVO: Prova prima formato JSON (tab.controls), poi formato core
            let controls = [];
            if (tab.controls && Array.isArray(tab.controls)) {
                // Formato JSON: i controlli sono dentro ogni tab
                controls = tab.controls;
                console.log(`🔍 Tab ${tab.id}: found ${controls.length} controls (JSON format)`, controls);
            } else if (roomConfig.controls && roomConfig.controls[tab.id]) {
                // Formato core: i controlli sono in roomConfig.controls[tabId]
                controls = roomConfig.controls[tab.id];
                console.log(`🔍 Tab ${tab.id}: found ${controls.length} controls (Core format)`, controls);
            } else {
                console.log(`🔍 Tab ${tab.id}: no controls found`);
            }
            
            await this.generateTabContent(tab, controls, i === 0);
        }
    }
    
    /**
     * Generazione contenuto singolo tab
     */
    async generateTabContent(tab, controls, isActive) {
        const tabsContainer = document.getElementById('tabsContainer');
        
        // Creazione tab content
        const tabDiv = document.createElement('div');
        tabDiv.id = `${tab.id}-tab`;
        tabDiv.className = `tab-content ${isActive ? 'active' : ''}`;
        
        // Header sezione
        const headerHTML = `
            <div class="room-header">
                <h2 class="room-title">${tab.name}</h2>
                <p class="room-subtitle">${tab.subtitle}</p>
            </div>
        `;
        
        // Controlli sezione
        const controlsHTML = await this.generateSectionControls(tab.id, controls);
        
        tabDiv.innerHTML = headerHTML + controlsHTML;
        tabsContainer.appendChild(tabDiv);
        
        // Inizializzazione controlli per questa sezione
        await this.initializeSectionControls(tab.id, controls);
        
        console.log(`✅ Tab ${tab.id} generato con ${controls.length} controlli`);
    }
    
    /**
     * Generazione controlli per sezione
     */
    async generateSectionControls(sectionId, controls) {
        if (controls.length === 0) {
            return `
                <div class="controls-grid">
                    <div class="control-container">
                        <div style="text-align: center; padding: 40px; color: #8B4513;">
                            <h3>🚧 Section in Development</h3>
                            <p>Controls for this section will be available soon.</p>
                        </div>
                    </div>
                </div>
            `;
        }
        
        let controlsHTML = '<div class="controls-grid">';
        
        for (let i = 0; i < controls.length; i++) {
            const control = controls[i];
            const containerId = `${sectionId}-${control.name.toLowerCase().replace(/[^a-z]/g, '')}-${i}`;
            
            controlsHTML += `
                <div class="control-container" id="${containerId}">
                    ${await this.generateControlHTML(control, containerId, sectionId)}
                </div>
            `;
        }
        
        controlsHTML += '</div>';
        return controlsHTML;
    }
    
    /**
     * Generazione HTML controllo specifico
     */
    async generateControlHTML(control, containerId, sectionId) {
        const controlId = containerId.replace(/-/g, '_');
        
        switch (control.type) {
            case 'dali':
                return this.generateDALIControlHTML(controlId, control);
                
            case 'onoff':
                return this.generateOnOffControlHTML(controlId, control);
                
            case 'thermostat':
                return this.generateThermostatControlHTML(controlId, control);
                
            case 'monostable':
                return this.generateMonostableControlHTML(controlId, control);
                
            default:
                return `
                    <div style="text-align: center; padding: 20px; color: #dc3545;">
                        <h3>❌ Unknown Control Type</h3>
                        <p>Type: ${control.type}</p>
                    </div>
                `;
        }
    }
    
    /**
     * Generazione HTML controllo DALI - VERSIONE MIGLIORATA
     */
    generateDALIControlHTML(controlId, control) {
        const isOn = control.initialPower || false;
        const level = isOn ? (control.initialLevel || 50) : 0;
        const setLevel = control.initialLevel || 50; // Mantieni setLevel sempre visibile
        
        return `
            <div class="dali-controller" id="${controlId}_controller">
                <!-- LABEL NOME GRUPPO -->
                <div class="group-label uniform-element">${control.name}</div>
                
                <!-- CONTROLLI PRINCIPALI: LIVELLO + ON/OFF -->
                <div class="main-controls">
                    <!-- VISUALIZZAZIONE LIVELLO CORRENTE -->
                    <div class="level-display">
                        <div class="level-value uniform-element ${isOn ? 'on' : 'off'}" id="${controlId}_display">
                            ${level}<span class="level-unit">%</span>
                        </div>
                    </div>
                    
                    <!-- COMANDO ON/OFF con colori verdi -->
                    <div class="power-controls">
                        <button class="power-btn uniform-element ${!isOn ? 'active' : ''}" id="${controlId}_off" onclick="window.roomControls.setDALIPower('${controlId}', 'off')">OFF</button>
                        <button class="power-btn uniform-element ${isOn ? 'active' : ''}" id="${controlId}_on" onclick="window.roomControls.setDALIPower('${controlId}', 'on')">ON</button>
                    </div>
                </div>
                
                <!-- SLIDER IMPOSTAZIONE LIVELLO -->
                <div class="level-control">
                    <div class="level-label">Impostazione Livello</div>
                    <div class="level-slider-container">
                        <div class="level-slider" id="${controlId}_slider" onclick="window.roomControls.adjustDALILevel(event, '${controlId}')">
                            <div class="level-fill" id="${controlId}_fill" style="width: ${setLevel}%"></div>
                            <div class="level-thumb ${setLevel > 0 ? 'active' : ''}" id="${controlId}_thumb" style="left: calc(${setLevel}% - 12px)"></div>
                        </div>
                        <div class="slider-scale">
                            <span>0%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                            <div class="min-indicator">min</div>
                        </div>
                    </div>
                </div>
                
                <!-- STATUS INDICATOR RIMOSSO per DALI -->
            </div>
        `;
    }
    
    /**
     * Generazione HTML controllo TERMOSTATO - VERSIONE MIGLIORATA
     */
    generateThermostatControlHTML(controlId, control) {
        const isOn = control.initialPower || false;
        const temp = control.initialTemp || 22;
        const measuredTemp = control.measuredTemp || 20.0;
        const minTemp = control.minTemp || 16;
        const maxTemp = control.maxTemp || 28;
        
        // Calcola percentuale per slider con step 0.5°C
        const tempRange = maxTemp - minTemp;
        const normalizedTemp = Math.round((temp - minTemp) * 2) / 2; // Arrotonda a 0.5
        const percentage = (normalizedTemp / tempRange) * 100;
        
        // Determina stato iniziale basato su differenza temperatura
        const tempDiff = temp - measuredTemp;
        let initialState = 'neutral';
        if (isOn) {
            if (tempDiff > 1) initialState = 'heating';
            else if (tempDiff < -1) initialState = 'cooling';
        } else {
            initialState = 'off';
        }
        
        return `
            <div class="thermostat-controller" id="${controlId}_controller">
                <!-- LABEL NOME GRUPPO -->
                <div class="group-label uniform-element">${control.name}</div>
                
                <!-- CONTROLLI PRINCIPALI: TEMPERATURA + ON/OFF -->
                <div class="main-controls">
                    <!-- DISPLAY TEMPERATURE -->
                    <div class="level-display">
                        <div class="temperature-display-container">
                            <!-- SETPOINT TEMPERATURE -->
                            <div class="level-value uniform-element setpoint ${isOn ? 'on' : 'off'}" id="${controlId}_display">
                                ${temp}<span class="level-unit">°C</span>
                            </div>
                            <!-- MEASURED TEMPERATURE -->
                            <div class="measured-temp-container ${initialState}" id="${controlId}_measured_container">
                                <div class="measured-temp-label">Misurata</div>
                                <div class="measured-temp-value" id="${controlId}_measured">
                                    ${measuredTemp}<span class="measured-unit">°C</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- COMANDO ON/OFF con colori verdi -->
                    <div class="power-controls">
                        <button class="power-btn uniform-element ${!isOn ? 'active' : ''}" id="${controlId}_off" onclick="window.roomControls.setThermostatPower('${controlId}', 'off')">OFF</button>
                        <button class="power-btn uniform-element ${isOn ? 'active' : ''}" id="${controlId}_on" onclick="window.roomControls.setThermostatPower('${controlId}', 'on')">ON</button>
                    </div>
                </div>
                
                <!-- CONTROLLO TEMPERATURA -->
                <div class="level-control">
                    <div class="level-label">Impostazione Temperatura</div>
                    <div class="level-slider-container">
                        <!-- PULSANTE DIMINUISCI -->
                        <button class="temp-btn decrease" id="${controlId}_decrease" onclick="window.roomControls.adjustThermostatStep('${controlId}', -0.5)">−</button>
                        
                        <!-- SLIDER TEMPERATURA -->
                        <div class="temp-slider" id="${controlId}_slider" onclick="window.roomControls.adjustThermostatLevel(event, '${controlId}')">
                            <div class="level-fill" id="${controlId}_fill" style="width: ${percentage}%"></div>
                            <div class="level-thumb ${isOn ? 'active' : ''}" id="${controlId}_thumb" style="left: calc(${percentage}% - 12px)"></div>
                        </div>
                        
                        <!-- PULSANTE AUMENTA -->
                        <button class="temp-btn increase" id="${controlId}_increase" onclick="window.roomControls.adjustThermostatStep('${controlId}', 0.5)">+</button>
                    </div>
                    
                    <!-- SCALA TEMPERATURE -->
                    <div class="slider-scale">
                        <span>${minTemp}°</span>
                        <span>${Math.round(minTemp + tempRange * 0.25)}°</span>
                        <span>${Math.round(minTemp + tempRange * 0.5)}°</span>
                        <span>${Math.round(minTemp + tempRange * 0.75)}°</span>
                        <span>${maxTemp}°</span>
                    </div>
                </div>
                
                <!-- STATUS CLIMATIZZAZIONE -->
                <div class="climate-status">
                    <div class="climate-indicator ${initialState}" id="${controlId}_climate_indicator">
                        <div class="climate-icon" id="${controlId}_climate_icon">${this.getClimateIcon(initialState)}</div>
                        <span id="${controlId}_climate_status">${this.getClimateStatusText(initialState)}</span>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Metodo helper per icona clima
     */
    getClimateIcon(state) {
        switch(state) {
            case 'heating': return '🔥';
            case 'cooling': return '❄️'; 
            case 'neutral': return '✅';
            case 'off': return '🌡️';
            default: return '🌡️';
        }
    }
    
    /**
     * Metodo helper per testo status clima
     */
    getClimateStatusText(state) {
        switch(state) {
            case 'heating': return 'Riscaldamento';
            case 'cooling': return 'Raffreddamento'; 
            case 'neutral': return 'Temperatura OK';
            case 'off': return 'Spento';
            default: return 'Standby';
        }
    }
    
    /**
     * Generazione HTML controllo On/Off
     */
    generateOnOffControlHTML(controlId, control) {
        const isActive = control.initialState || false;
        const activeText = control.activeText || 'ON';
        const inactiveText = control.inactiveText || 'OFF';
        const activeFeedback = control.activeFeedback || 'System active';
        const inactiveFeedback = control.inactiveFeedback || 'System off';
        
        return `
            <div class="command-switch" id="${controlId}_controller">
                <div class="command-name uniform-element">${control.name}</div>
                
                <div class="main-controls">
                    <button class="command-button uniform-element ${isActive ? 'active' : 'inactive'}" id="${controlId}_btn" onclick="window.roomControls.toggleOnOff('${controlId}')">
                        ${isActive ? activeText : inactiveText}
                    </button>
                    
                    <div class="command-feedback uniform-element ${isActive ? 'active' : 'inactive'}" id="${controlId}_feedback">
                        ${isActive ? activeFeedback : inactiveFeedback}
                    </div>
                </div>
                
                <div class="status-indicator">
                    <div class="status-dot ${isActive ? 'active' : 'inactive'}" id="${controlId}_dot"></div>
                    <span id="${controlId}_status">${isActive ? 'Online' : 'Offline'}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Generazione HTML controllo Monostable
     */
    generateMonostableControlHTML(controlId, control) {
        return `
            <div class="monostable-switch" id="${controlId}_controller">
                <div class="command-name uniform-element">${control.name}</div>
                
                <div class="main-controls">
                    <button class="monostable-button uniform-element" id="${controlId}_btn" onclick="window.roomControls.executeMonostable('${controlId}')">
                        ${control.buttonText || 'EXECUTE'}
                        <span class="countdown-timer" id="${controlId}_countdown" style="display: none;"></span>
                    </button>
                    
                    <div class="command-feedback uniform-element ready" id="${controlId}_feedback">
                        Ready for operation
                    </div>
                </div>
                
                <div class="status-indicator">
                    <div class="status-dot ready" id="${controlId}_dot"></div>
                    <span id="${controlId}_status">Ready</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Inizializzazione controlli sezione
     */
    async initializeSectionControls(sectionId, controls) {
        for (let i = 0; i < controls.length; i++) {
            const control = controls[i];
            const containerId = `${sectionId}-${control.name.toLowerCase().replace(/[^a-z]/g, '')}-${i}`;
            const controlId = containerId.replace(/-/g, '_');
            
            // Registrazione controllo nel dashboard core
            const coreControl = this.dashboardCore.getControl(controlId);
            if (coreControl) {
                console.log(`🔧 Control ${controlId} inizializzato`);
                
                // Setup eventi drag migliorati per controlli DALI
                if (control.type === 'dali') {
                    this.setupDALISliderEvents(controlId);
                }
                
                // Setup eventi drag migliorati per controlli TERMOSTATO
                if (control.type === 'thermostat') {
                    this.setupThermostatSliderEvents(controlId);
                }
            }
        }
        
        this.loadedSections.add(sectionId);
    }
    
    /**
     * Setup eventi drag migliorati per slider DALI
     */
    setupDALISliderEvents(controlId) {
        const thumb = document.getElementById(`${controlId}_thumb`);
        const slider = document.getElementById(`${controlId}_slider`);
        
        if (!thumb || !slider) return;
        
        let isDragging = false;
        let dragOffset = 0;
        
        // Mousedown sul thumb
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            
            // Calcola l'offset del click rispetto al centro del thumb
            const thumbRect = thumb.getBoundingClientRect();
            dragOffset = e.clientX - (thumbRect.left + thumbRect.width / 2);
            
            thumb.classList.add('dragging');
            document.body.classList.add('no-select');
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Click diretto sullo slider (non sul thumb)
        slider.addEventListener('click', (e) => {
            if (e.target === thumb) return; // Ignora se il click è sul thumb
            if (window.roomControls && window.roomControls.adjustDALILevel) {
                window.roomControls.adjustDALILevel(e, controlId);
            }
        });
        
        // Gestione drag globale
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const rect = slider.getBoundingClientRect();
            const adjustedX = e.clientX - dragOffset;
            let percentage = Math.max(0, Math.min(100, Math.round(((adjustedX - rect.left) / rect.width) * 100)));
            
            // Applica range 10-100%
            if (percentage > 0 && percentage < 10) {
                percentage = 10;
            }
            
            // Aggiorna controllo
            if (window.roomControls && window.roomControls.updateDALILevelDirect) {
                window.roomControls.updateDALILevelDirect(controlId, percentage);
            }
            
            e.preventDefault();
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                thumb.classList.remove('dragging');
                document.body.classList.remove('no-select');
            }
        };
        
        // Event listeners globali
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Supporto touch
        thumb.addEventListener('touchstart', (e) => {
            isDragging = true;
            
            const thumbRect = thumb.getBoundingClientRect();
            const touch = e.touches[0];
            dragOffset = touch.clientX - (thumbRect.left + thumbRect.width / 2);
            
            thumb.classList.add('dragging');
            document.body.classList.add('no-select');
            
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const rect = slider.getBoundingClientRect();
            const touch = e.touches[0];
            const adjustedX = touch.clientX - dragOffset;
            let percentage = Math.max(0, Math.min(100, Math.round(((adjustedX - rect.left) / rect.width) * 100)));
            
            // Applica range 10-100%
            if (percentage > 0 && percentage < 10) {
                percentage = 10;
            }
            
            // Aggiorna controllo
            if (window.roomControls && window.roomControls.updateDALILevelDirect) {
                window.roomControls.updateDALILevelDirect(controlId, percentage);
            }
            
            e.preventDefault();
        });
        
        document.addEventListener('touchend', handleMouseUp);
        
        console.log(`✅ Setup drag events DALI per ${controlId}`);
    }
    
    /**
     * Setup eventi drag migliorati per slider Termostato
     */
    setupThermostatSliderEvents(controlId) {
        const thumb = document.getElementById(`${controlId}_thumb`);
        const slider = document.getElementById(`${controlId}_slider`);
        
        if (!thumb || !slider) return;
        
        let isDragging = false;
        let dragOffset = 0;
        
        // Mousedown sul thumb
        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            
            // Calcola l'offset del click rispetto al centro del thumb
            const thumbRect = thumb.getBoundingClientRect();
            dragOffset = e.clientX - (thumbRect.left + thumbRect.width / 2);
            
            thumb.classList.add('dragging');
            document.body.classList.add('no-select');
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        // Click diretto sullo slider (non sul thumb)
        slider.addEventListener('click', (e) => {
            if (e.target === thumb) return; // Ignora se il click è sul thumb
            if (window.roomControls && window.roomControls.adjustThermostatLevel) {
                window.roomControls.adjustThermostatLevel(e, controlId);
            }
        });
        
        // Gestione drag globale
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const rect = slider.getBoundingClientRect();
            const adjustedX = e.clientX - dragOffset;
            let percentage = Math.max(0, Math.min(100, ((adjustedX - rect.left) / rect.width) * 100));
            
            // Converti in temperatura con step 0.5°C
            const control = window.AmanAPI.getCore().getControl(controlId);
            if (control) {
                const tempRange = control.maxTemp - control.minTemp;
                const rawTemp = control.minTemp + (percentage / 100) * tempRange;
                const newTemp = Math.round(rawTemp * 2) / 2; // Step 0.5°C
                
                // Aggiorna controllo direttamente
                if (window.roomControls && window.roomControls.updateThermostatTemperatureDirect) {
                    window.roomControls.updateThermostatTemperatureDirect(controlId, newTemp);
                }
            }
            
            e.preventDefault();
        };
        
        const handleMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                thumb.classList.remove('dragging');
                document.body.classList.remove('no-select');
            }
        };
        
        // Event listeners globali
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        
        // Supporto touch
        thumb.addEventListener('touchstart', (e) => {
            isDragging = true;
            
            const thumbRect = thumb.getBoundingClientRect();
            const touch = e.touches[0];
            dragOffset = touch.clientX - (thumbRect.left + thumbRect.width / 2);
            
            thumb.classList.add('dragging');
            document.body.classList.add('no-select');
            
            e.preventDefault();
        });
        
        document.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            const rect = slider.getBoundingClientRect();
            const touch = e.touches[0];
            const adjustedX = touch.clientX - dragOffset;
            let percentage = Math.max(0, Math.min(100, ((adjustedX - rect.left) / rect.width) * 100));
            
            // Converti in temperatura con step 0.5°C
            const control = window.AmanAPI.getCore().getControl(controlId);
            if (control) {
                const tempRange = control.maxTemp - control.minTemp;
                const rawTemp = control.minTemp + (percentage / 100) * tempRange;
                const newTemp = Math.round(rawTemp * 2) / 2; // Step 0.5°C
                
                // Aggiorna controllo direttamente
                if (window.roomControls && window.roomControls.updateThermostatTemperatureDirect) {
                    window.roomControls.updateThermostatTemperatureDirect(controlId, newTemp);
                }
            }
            
            e.preventDefault();
        });
        
        document.addEventListener('touchend', handleMouseUp);
        
        console.log(`✅ Setup drag events termostato per ${controlId}`);
    }
    
    /**
     * Attivazione primo tab
     */
    activateFirstTab(tabs) {
        if (tabs.length > 0) {
            this.activeTab = tabs[0].id;
        }
    }
    
    /**
     * Switch tra tab
     */
    switchTab(tabId, buttonElement = null) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        if (buttonElement) {
            buttonElement.classList.add('active');
        }
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            this.activeTab = tabId;
            console.log(`📱 Switched to tab: ${tabId}`);
        }
    }
    
    /**
     * Get active tab
     */
    getActiveTab() {
        return this.activeTab;
    }
    
    /**
     * Check if section is loaded
     */
    isSectionLoaded(sectionId) {
        return this.loadedSections.has(sectionId);
    }
    
    /**
     * Get loaded sections
     */
    getLoadedSections() {
        return Array.from(this.loadedSections);
    }
}

// Export globale
window.AmanRoomManager = AmanRoomManager;