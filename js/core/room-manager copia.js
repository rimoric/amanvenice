/**
 * AMAN Venice - Room Manager
 * Gestione layout e navigazione delle room
 * 
 * Funzionalità:
 * - Generazione layout dinamico
 * - Gestione tab navigation
 * - Coordinamento tra sezioni
 * - Integrazione con dashboard core
 */

class AmanRoomManager {
    constructor(dashboardCore) {
        this.dashboardCore = dashboardCore;
        this.activeTab = null;
        this.loadedSections = new Set();
        
        console.log('🏠 AMAN Room Manager inizializzato');
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
     * Generazione contenuti tab
     */
    async generateTabContents(roomConfig) {
        const tabsContainer = document.getElementById('tabsContainer');
        if (!tabsContainer) {
            console.error('❌ Tabs container non trovato');
            return;
        }
        
        // Pulisci container
        tabsContainer.innerHTML = '';
        
        // Genera ogni tab
        for (let i = 0; i < roomConfig.tabs.length; i++) {
            const tab = roomConfig.tabs[i];
            await this.generateTabContent(tab, roomConfig.controls[tab.id] || [], i === 0);
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
     * Generazione HTML controllo DALI
     */
    generateDALIControlHTML(controlId, control) {
        const isOn = control.initialPower;
        const level = isOn ? control.initialLevel : 0;
        
        return `
            <div class="dali-controller" id="${controlId}_controller">
                <div class="group-label uniform-element">${control.name}</div>
                
                <div class="main-controls">
                    <div class="level-display">
                        <div class="level-value uniform-element ${isOn ? 'on' : 'off'}" id="${controlId}_display">
                            ${level}<span class="level-unit">%</span>
                        </div>
                    </div>
                    
                    <div class="power-controls">
                        <button class="power-btn uniform-element ${!isOn ? 'active' : ''}" id="${controlId}_off" onclick="window.roomControls.setDALIPower('${controlId}', 'off')">OFF</button>
                        <button class="power-btn uniform-element ${isOn ? 'on-active' : ''}" id="${controlId}_on" onclick="window.roomControls.setDALIPower('${controlId}', 'on')">ON</button>
                    </div>
                </div>
                
                <div class="level-control">
                    <div class="level-label">Light Level Setting</div>
                    <div class="level-slider-container">
                        <div class="level-slider" onclick="window.roomControls.adjustDALILevel(event, '${controlId}')">
                            <div class="level-fill" id="${controlId}_fill" style="width: ${level}%"></div>
                            <div class="level-thumb ${isOn ? 'active' : ''}" id="${controlId}_thumb" style="left: calc(${level}% - 12px)"></div>
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
                
                <div class="status-indicator">
                    <div class="status-dot ${isOn ? 'on' : 'off'}" id="${controlId}_dot"></div>
                    <span id="${controlId}_status">${isOn ? 'Lights On' : 'Lights Off'}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Generazione HTML controllo On/Off
     */
    generateOnOffControlHTML(controlId, control) {
        const isActive = control.initialState;
        
        return `
            <div class="command-switch" id="${controlId}_controller">
                <div class="command-name uniform-element">${control.name}</div>
                
                <div class="main-controls">
                    <button class="command-button uniform-element ${isActive ? 'active' : 'inactive'}" id="${controlId}_btn" onclick="window.roomControls.toggleOnOff('${controlId}')">
                        ${isActive ? 'ON' : 'OFF'}
                    </button>
                    
                    <div class="command-feedback uniform-element ${isActive ? 'active' : 'inactive'}" id="${controlId}_feedback">
                        ${isActive ? 'System active' : 'System off'}
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
                        ${control.buttonText}
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
            }
        }
        
        this.loadedSections.add(sectionId);
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