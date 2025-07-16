case 'thermostat':
                    this.setThermostatPower(control.id, 'on');
                    setTimeout(() => this.adjustThermostatStep(control.id, 2), 1000);
                    setTimeout(() => this.adjustThermostatStep(control.id, -2), 2000);
                    setTimeout(() => this.setThermostatPower(control.id, 'off'), 3000);
                    break;/**
 * AMAN Venice - Control Factory
 * Gestione funzionalità controlli dinamici
 * 
 * Funzionalità:
 * - Controlli DALI (luci)
 * - Controlli On/Off
 * - Controlli Monostable
 * - Integrazione MQTT
 */

class AmanControlFactory {
    constructor(dashboardCore) {
        this.dashboardCore = dashboardCore;
        this.activeControls = new Map();
        
        console.log('🎛️ AMAN Control Factory inizializzato');
    }
    
    /**
     * Inizializzazione factory
     */
    initialize() {
        try {
            // Esposizione API globale per controlli
            this.setupGlobalAPI();
            
            console.log('✅ Control Factory inizializzato');
            return true;
            
        } catch (error) {
            console.error('❌ Errore inizializzazione Control Factory:', error);
            return false;
        }
    }
    
    /**
     * Setup API globale
     */
    setupGlobalAPI() {
        window.roomControls = {
            // DALI Controls
            setDALIPower: (controlId, state) => this.setDALIPower(controlId, state),
            adjustDALILevel: (event, controlId) => this.adjustDALILevel(event, controlId),
            
            // Thermostat Controls
            setThermostatPower: (controlId, state) => this.setThermostatPower(controlId, state),
            adjustThermostatLevel: (event, controlId) => this.adjustThermostatLevel(event, controlId),
            adjustThermostatStep: (controlId, step) => this.adjustThermostatStep(controlId, step),
            
            // On/Off Controls
            toggleOnOff: (controlId) => this.toggleOnOff(controlId),
            
            // Monostable Controls
            executeMonostable: (controlId) => this.executeMonostable(controlId),
            
            // Debug
            getControlStatus: (controlId) => this.getControlStatus(controlId),
            getAllControls: () => this.getAllControls()
        };
    }
    
    /**
     * ===== DALI CONTROLS =====
     */
    
    /**
     * Set DALI Power (On/Off)
     */
    setDALIPower(controlId, state) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            const isOn = state === 'on';
            control.power = isOn;
            
            if (!isOn) {
                control.level = 0;
            } else if (control.level === 0) {
                control.level = 50; // Default level
            }
            
            this.updateDALIDisplay(controlId, control);
            this.sendDALICommand(control);
            
            console.log(`💡 DALI Power ${controlId}: ${state} (${control.level}%)`);
            
        } catch (error) {
            console.error(`❌ Error setting DALI power ${controlId}:`, error);
        }
    }
    
    /**
     * Adjust DALI Level (Slider)
     */
    adjustDALILevel(event, controlId) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            const slider = event.currentTarget;
            const rect = slider.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(100, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
            
            control.level = percentage;
            control.power = percentage > 0;
            
            this.updateDALIDisplay(controlId, control);
            this.sendDALICommand(control);
            
            console.log(`🎛️ DALI Level ${controlId}: ${percentage}%`);
            
        } catch (error) {
            console.error(`❌ Error adjusting DALI level ${controlId}:`, error);
        }
    }
    
    /**
     * Update DALI Display
     */
    updateDALIDisplay(controlId, control) {
        try {
            // Update level display
            const display = document.getElementById(`${controlId}_display`);
            if (display) {
                display.innerHTML = `${control.level}<span class="level-unit">%</span>`;
                display.classList.toggle('on', control.power);
                display.classList.toggle('off', !control.power);
                
                // Visual feedback
                display.style.transform = 'scale(1.05)';
                setTimeout(() => display.style.transform = '', 200);
            }
            
            // Update slider
            const fill = document.getElementById(`${controlId}_fill`);
            const thumb = document.getElementById(`${controlId}_thumb`);
            if (fill && thumb) {
                fill.style.width = control.level + '%';
                thumb.style.left = `calc(${control.level}% - 12px)`;
                thumb.classList.toggle('active', control.power);
            }
            
            // Update buttons
            const onBtn = document.getElementById(`${controlId}_on`);
            const offBtn = document.getElementById(`${controlId}_off`);
            if (onBtn && offBtn) {
                onBtn.classList.toggle('on-active', control.power);
                onBtn.classList.toggle('active', false);
                offBtn.classList.toggle('active', !control.power);
                
                // Visual feedback
                const activeBtn = control.power ? onBtn : offBtn;
                activeBtn.style.transform = 'scale(0.95)';
                setTimeout(() => activeBtn.style.transform = '', 150);
            }
            
            // Update status
            const dot = document.getElementById(`${controlId}_dot`);
            const status = document.getElementById(`${controlId}_status`);
            if (dot && status) {
                dot.classList.toggle('on', control.power);
                dot.classList.toggle('off', !control.power);
                status.textContent = control.power ? 'Lights On' : 'Lights Off';
            }
            
        } catch (error) {
            console.error(`❌ Error updating DALI display ${controlId}:`, error);
        }
    }
    
    /**
     * Send DALI Command via MQTT
     */
    sendDALICommand(control) {
        try {
            const payload = {
                sLocale: control.locale,
                sNome: control.mqttName,
                nLivello: control.level,
                bOnOff: control.power
            };
            
            return this.dashboardCore.sendMQTTMessage(payload);
            
        } catch (error) {
            console.error(`❌ Error sending DALI command:`, error);
            return false;
        }
    }
    
    /**
     * ===== THERMOSTAT CONTROLS =====
     */
    
    /**
     * Set Thermostat Power (On/Off)
     */
    setThermostatPower(controlId, state) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            const isOn = state === 'on';
            control.power = isOn;
            
            this.updateThermostatDisplay(controlId, control);
            this.sendThermostatCommand(control);
            
            console.log(`🌡️ Thermostat Power ${controlId}: ${state} (${control.temperature}°C)`);
            
        } catch (error) {
            console.error(`❌ Error setting thermostat power ${controlId}:`, error);
        }
    }
    
    /**
     * Adjust Thermostat Level (Slider)
     */
    adjustThermostatLevel(event, controlId) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            const slider = event.currentTarget;
            const rect = slider.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
            
            // Convert percentage to temperature
            const tempRange = control.maxTemp - control.minTemp;
            const newTemp = Math.round(control.minTemp + (percentage / 100) * tempRange);
            
            control.temperature = newTemp;
            
            // Auto power management
            if (!control.power) {
                control.power = true;
                this.updateThermostatPowerButtons(controlId, true);
            }
            
            this.updateThermostatDisplay(controlId, control);
            this.sendThermostatCommand(control);
            
            console.log(`🎛️ Thermostat Level ${controlId}: ${newTemp}°C`);
            
        } catch (error) {
            console.error(`❌ Error adjusting thermostat level ${controlId}:`, error);
        }
    }
    
    /**
     * Adjust Thermostat with +/- steps
     */
    adjustThermostatStep(controlId, step) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            let newTemp = control.temperature + step;
            
            // Limit temperature
            if (newTemp < control.minTemp) {
                newTemp = control.minTemp;
            } else if (newTemp > control.maxTemp) {
                newTemp = control.maxTemp;
            }
            
            control.temperature = newTemp;
            
            // Auto power management
            if (!control.power) {
                control.power = true;
                this.updateThermostatPowerButtons(controlId, true);
            }
            
            this.updateThermostatDisplay(controlId, control);
            this.sendThermostatCommand(control);
            
            // Visual feedback on button
            const btnId = step > 0 ? `${controlId}_increase` : `${controlId}_decrease`;
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.style.transform = 'scale(0.9)';
                setTimeout(() => btn.style.transform = '', 150);
            }
            
            console.log(`🌡️ Thermostat Step ${controlId}: ${newTemp}°C (${step > 0 ? '+' : ''}${step})`);
            
        } catch (error) {
            console.error(`❌ Error adjusting thermostat step ${controlId}:`, error);
        }
    }
    
    /**
     * Update Thermostat Display
     */
    updateThermostatDisplay(controlId, control) {
        try {
            // Update setpoint display
            const display = document.getElementById(`${controlId}_display`);
            if (display) {
                display.innerHTML = `${control.temperature}<span class="level-unit">°C</span>`;
                display.classList.toggle('on', control.power);
                display.classList.toggle('off', !control.power);
                
                // Visual feedback
                display.style.transform = 'scale(1.05)';
                setTimeout(() => display.style.transform = '', 200);
            }
            
            // Update measured temperature container state
            this.updateMeasuredContainerState(controlId, control);
            
            // Update slider
            this.updateThermostatSlider(controlId, control);
            
            // Update power buttons
            this.updateThermostatPowerButtons(controlId, control.power);
            
            // Update status
            const dot = document.getElementById(`${controlId}_dot`);
            const status = document.getElementById(`${controlId}_status`);
            if (dot && status) {
                dot.classList.toggle('on', control.power);
                dot.classList.toggle('off', !control.power);
                status.textContent = control.power ? 'Climate On' : 'Climate Off';
            }
            
        } catch (error) {
            console.error(`❌ Error updating thermostat display ${controlId}:`, error);
        }
    }
    
    /**
     * Update Measured Container State
     */
    updateMeasuredContainerState(controlId, control) {
        const measuredContainer = document.getElementById(`${controlId}_measured_container`);
        if (!measuredContainer) return;
        
        if (!control.power) {
            measuredContainer.className = 'measured-temp-container off';
            return;
        }
        
        const setPoint = control.temperature;
        const measured = control.measuredTemp;
        const difference = setPoint - measured;
        const tolerance = 0.5;
        
        // Remove all state classes
        measuredContainer.classList.remove('heating', 'cooling', 'neutral', 'off');
        
        if (Math.abs(difference) <= tolerance) {
            measuredContainer.classList.add('neutral');
        } else if (difference > tolerance) {
            measuredContainer.classList.add('heating');
        } else {
            measuredContainer.classList.add('cooling');
        }
    }
    
    /**
     * Update Thermostat Slider
     */
    updateThermostatSlider(controlId, control) {
        const fill = document.getElementById(`${controlId}_fill`);
        const thumb = document.getElementById(`${controlId}_thumb`);
        if (!fill || !thumb) return;
        
        // Convert temperature to percentage
        const tempRange = control.maxTemp - control.minTemp;
        const percentage = ((control.temperature - control.minTemp) / tempRange) * 100;
        
        fill.style.width = percentage + '%';
        thumb.style.left = `calc(${percentage}% - 12px)`;
        thumb.classList.toggle('active', control.power);
        
        // Visual feedback
        thumb.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.4)';
        setTimeout(() => thumb.style.boxShadow = '', 300);
    }
    
    /**
     * Update Thermostat Power Buttons
     */
    updateThermostatPowerButtons(controlId, isOn) {
        const onBtn = document.getElementById(`${controlId}_on`);
        const offBtn = document.getElementById(`${controlId}_off`);
        
        if (onBtn && offBtn) {
            onBtn.classList.toggle('on-active', isOn);
            onBtn.classList.toggle('active', false);
            offBtn.classList.toggle('active', !isOn);
            
            // Visual feedback
            const activeBtn = isOn ? onBtn : offBtn;
            activeBtn.style.transform = 'scale(0.95)';
            setTimeout(() => activeBtn.style.transform = '', 150);
        }
    }
    
    /**
     * Send Thermostat Command via MQTT
     */
    sendThermostatCommand(control) {
        try {
            const payload = {
                sLocale: control.locale,
                sNome: control.mqttName,
                nTemperatura: control.temperature,
                bOnOff: control.power
            };
            
            return this.dashboardCore.sendMQTTMessage(payload);
            
        } catch (error) {
            console.error(`❌ Error sending thermostat command:`, error);
            return false;
        }
    }
    
    /**
     * Toggle On/Off Control
     */
    toggleOnOff(controlId) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            control.active = !control.active;
            
            this.updateOnOffDisplay(controlId, control);
            this.sendOnOffCommand(control);
            
            console.log(`🔌 On/Off ${controlId}: ${control.active ? 'ON' : 'OFF'}`);
            
        } catch (error) {
            console.error(`❌ Error toggling On/Off ${controlId}:`, error);
        }
    }
    
    /**
     * Update On/Off Display
     */
    updateOnOffDisplay(controlId, control) {
        try {
            const btn = document.getElementById(`${controlId}_btn`);
            const feedback = document.getElementById(`${controlId}_feedback`);
            const dot = document.getElementById(`${controlId}_dot`);
            const status = document.getElementById(`${controlId}_status`);
            
            if (control.active) {
                btn.classList.remove('inactive');
                btn.classList.add('active');
                btn.textContent = control.activeText || 'ON';
                feedback.classList.remove('inactive');
                feedback.classList.add('active');
                feedback.textContent = control.activeFeedback || 'System active';
                dot.classList.remove('inactive');
                dot.classList.add('active');
                status.textContent = 'Online';
            } else {
                btn.classList.remove('active');
                btn.classList.add('inactive');
                btn.textContent = control.inactiveText || 'OFF';
                feedback.classList.remove('active');
                feedback.classList.add('inactive');
                feedback.textContent = control.inactiveFeedback || 'System off';
                dot.classList.remove('active');
                dot.classList.add('inactive');
                status.textContent = 'Offline';
            }
            
            // Visual feedback
            if (btn) {
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => btn.style.transform = '', 150);
            }
            
        } catch (error) {
            console.error(`❌ Error updating On/Off display ${controlId}:`, error);
        }
    }
    
    /**
     * Send On/Off Command via MQTT
     */
    sendOnOffCommand(control) {
        try {
            let payload = {
                sLocale: control.locale
            };
            
            // Special handling for Towel Heater
            if (control.mqttName === 'ScaldaOnOff') {
                payload.bScaldaOnOff = control.active;
            } else {
                payload.sNome = control.mqttName;
                payload.bOnOff = control.active;
            }
            
            return this.dashboardCore.sendMQTTMessage(payload);
            
        } catch (error) {
            console.error(`❌ Error sending On/Off command:`, error);
            return false;
        }
    }
    
    /**
     * ===== MONOSTABLE CONTROLS =====
     */
    
    /**
     * Execute Monostable Command
     */
    executeMonostable(controlId) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control || control.isExecuting) {
                console.warn(`⚠️ Control ${controlId} not available or already executing`);
                return;
            }
            
            control.isExecuting = true;
            
            console.log(`⚡ Executing monostable ${controlId}`);
            
            // Phase 1: Pressed
            this.setMonostablePressed(controlId, control);
            
            // Phase 2: Executing (after 200ms)
            setTimeout(() => {
                this.setMonostableExecuting(controlId, control);
                this.startMonostableCountdown(controlId, control);
            }, 200);
            
            // Phase 3: Completed
            setTimeout(() => {
                this.setMonostableExecuted(controlId, control);
            }, control.executionTime);
            
            // Phase 4: Ready again
            setTimeout(() => {
                this.setMonostableReady(controlId, control);
                control.isExecuting = false;
            }, control.executionTime + control.cooldownTime);
            
            // Send MQTT command
            this.sendMonostableCommand(control);
            
        } catch (error) {
            console.error(`❌ Error executing monostable ${controlId}:`, error);
        }
    }
    
    /**
     * Set Monostable Pressed State
     */
    setMonostablePressed(controlId, control) {
        this.updateMonostableDisplay(controlId, {
            button: { class: 'pressed', text: 'PRESSED' },
            feedback: { class: 'executing', text: 'Command received...' },
            status: { dot: 'executing', text: 'Command' }
        });
    }
    
    /**
     * Set Monostable Executing State
     */
    setMonostableExecuting(controlId, control) {
        this.updateMonostableDisplay(controlId, {
            button: { class: '', text: 'EXECUTING' },
            feedback: { class: 'executing', text: control.executingText },
            status: { dot: 'executing', text: 'Execution' }
        });
    }
    
    /**
     * Set Monostable Executed State
     */
    setMonostableExecuted(controlId, control) {
        this.updateMonostableDisplay(controlId, {
            button: { class: 'executed', text: 'COMPLETED' },
            feedback: { class: 'executed', text: control.completedText },
            status: { dot: 'executed', text: 'Completed' }
        });
        
        // Hide countdown
        const countdown = document.getElementById(`${controlId}_countdown`);
        if (countdown) countdown.style.display = 'none';
    }
    
    /**
     * Set Monostable Ready State
     */
    setMonostableReady(controlId, control) {
        this.updateMonostableDisplay(controlId, {
            button: { class: '', text: control.buttonText },
            feedback: { class: 'ready', text: 'Ready for operation' },
            status: { dot: 'ready', text: 'Ready' }
        });
    }
    
    /**
     * Update Monostable Display
     */
    updateMonostableDisplay(controlId, states) {
        try {
            const btn = document.getElementById(`${controlId}_btn`);
            const feedback = document.getElementById(`${controlId}_feedback`);
            const dot = document.getElementById(`${controlId}_dot`);
            const status = document.getElementById(`${controlId}_status`);
            
            if (btn && states.button) {
                btn.className = `monostable-button uniform-element ${states.button.class}`;
                btn.textContent = states.button.text;
            }
            
            if (feedback && states.feedback) {
                feedback.className = `command-feedback uniform-element ${states.feedback.class}`;
                feedback.textContent = states.feedback.text;
            }
            
            if (dot && states.status) {
                dot.className = `status-dot ${states.status.dot}`;
            }
            
            if (status && states.status) {
                status.textContent = states.status.text;
            }
            
        } catch (error) {
            console.error(`❌ Error updating monostable display ${controlId}:`, error);
        }
    }
    
    /**
     * Start Monostable Countdown
     */
    startMonostableCountdown(controlId, control) {
        const countdown = document.getElementById(`${controlId}_countdown`);
        if (!countdown) return;
        
        countdown.style.display = 'block';
        
        let timeLeft = Math.ceil(control.executionTime / 1000);
        countdown.textContent = timeLeft + 's';
        
        const countdownInterval = setInterval(() => {
            timeLeft--;
            if (timeLeft > 0) {
                countdown.textContent = timeLeft + 's';
            } else {
                clearInterval(countdownInterval);
            }
        }, 1000);
    }
    
    /**
     * Send Monostable Command via MQTT
     */
    sendMonostableCommand(control) {
        try {
            let payload = {
                sLocale: control.locale
            };
            
            // Set specific command based on mqttName
            switch(control.mqttName) {
                case 'ResetLuci':
                    payload.bResetLuci = true;
                    break;
                case 'ResetClima':
                    payload.bResetClima = true;
                    break;
                case 'TurnDown':
                    payload.bTurnDown = true;
                    break;
                default:
                    payload.sNome = control.mqttName;
                    payload.bCommand = true;
            }
            
            return this.dashboardCore.sendMQTTMessage(payload);
            
        } catch (error) {
            console.error(`❌ Error sending monostable command:`, error);
            return false;
        }
    }
    
    /**
     * ===== UTILITY FUNCTIONS =====
     */
    
    /**
     * Get Control Status
     */
    getControlStatus(controlId) {
        const control = this.dashboardCore.getControl(controlId);
        if (!control) return null;
        
        return {
            id: control.id,
            type: control.type,
            name: control.name,
            section: control.section,
            status: this.getControlCurrentStatus(control)
        };
    }
    
    /**
     * Get Control Current Status
     */
    getControlCurrentStatus(control) {
        switch (control.type) {
            case 'dali':
                return {
                    level: control.level,
                    power: control.power,
                    locale: control.locale
                };
                
            case 'thermostat':
                return {
                    temperature: control.temperature,
                    measuredTemp: control.measuredTemp,
                    power: control.power,
                    minTemp: control.minTemp,
                    maxTemp: control.maxTemp,
                    locale: control.locale
                };
                
            case 'onoff':
                return {
                    active: control.active,
                    activeText: control.activeText,
                    inactiveText: control.inactiveText,
                    locale: control.locale
                };
                
            case 'monostable':
                return {
                    isExecuting: control.isExecuting,
                    locale: control.locale
                };
                
            default:
                return { unknown: true };
        }
    }
    
    /**
     * Get All Controls
     */
    getAllControls() {
        return this.dashboardCore.getAllControls().map(control => this.getControlStatus(control.id));
    }
    
    /**
     * Debug: Test All Controls
     */
    testAllControls() {
        console.log('🧪 Testing all controls...');
        
        const controls = this.dashboardCore.getAllControls();
        let index = 0;
        
        const testNext = () => {
            if (index >= controls.length) {
                console.log('✅ All controls tested');
                return;
            }
            
            const control = controls[index];
            console.log(`🧪 Testing ${control.id}...`);
            
            switch (control.type) {
                case 'dali':
                    this.setDALIPower(control.id, 'on');
                    setTimeout(() => this.setDALIPower(control.id, 'off'), 2000);
                    break;
                    
                case 'onoff':
                    this.toggleOnOff(control.id);
                    setTimeout(() => this.toggleOnOff(control.id), 2000);
                    break;
                    
                case 'monostable':
                    this.executeMonostable(control.id);
                    break;
            }
            
            index++;
            setTimeout(testNext, 3000);
        };
        
        testNext();
    }
}

// Export globale
window.AmanControlFactory = AmanControlFactory;