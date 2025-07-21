/**
 * AMAN Venice - Control Factory (COMPLETO E AGGIORNATO)
 * Gestione funzionalità controlli dinamici
 * 
 * Funzionalità:
 * - Controlli DALI (luci) - MIGLIORATI
 * - Controlli Termostato - MIGLIORATI
 * - Controlli On/Off
 * - Controlli Monostable
 * - Integrazione MQTT
 * - Range DALI 10-100% con visualizzazione 0-100%
 * - Gestione separata setLevel per DALI
 * - Step 0.5°C per termostato
 * - Slider senza oscillazioni
 */

class AmanControlFactory {
    constructor(dashboardCore) {
        this.dashboardCore = dashboardCore;
        this.activeControls = new Map();
        
        console.log('🎛️ AMAN Control Factory inizializzato (v2.0 - DALI + Termostato)');
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
     * Setup API globale - AGGIORNATA
     */
    setupGlobalAPI() {
        window.roomControls = {
            // DALI Controls - MIGLIORATI
            setDALIPower: (controlId, state) => this.setDALIPower(controlId, state),
            adjustDALILevel: (event, controlId) => this.adjustDALILevel(event, controlId),
            updateDALILevelDirect: (controlId, level) => this.updateDALILevelDirect(controlId, level),
            
            // Thermostat Controls - MIGLIORATI
            setThermostatPower: (controlId, state) => this.setThermostatPower(controlId, state),
            adjustThermostatLevel: (event, controlId) => this.adjustThermostatLevel(event, controlId),
            adjustThermostatStep: (controlId, step) => this.adjustThermostatStep(controlId, step),
            updateThermostatFromMQTT: (controlId, control) => this.updateThermostatFromMQTT(controlId, control),
            updateThermostatTemperatureDirect: (controlId, newTemp) => this.updateThermostatTemperatureDirect(controlId, newTemp),
            
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
     * ===== DALI CONTROLS - VERSIONE MIGLIORATA =====
     */
    
    /**
     * Set DALI Power (On/Off) - MIGLIORATO
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
            
            // Inizializza setLevel se non esiste
            if (!control.setLevel) {
                control.setLevel = control.level || 50;
            }
            
            // Gestione setLevel separato
            if (!isOn) {
                // Quando spento, il display mostra 0 ma setLevel rimane invariato
                control.level = 0;
            } else {
                // Quando acceso, usa il setLevel memorizzato
                if (control.setLevel === 0) {
                    control.setLevel = 50; // Default level
                }
                control.level = control.setLevel;
            }
            
            this.updateDALIDisplay(controlId, control);
            this.sendDALICommand(control);
            
            console.log(`💡 DALI Power ${controlId}: ${state} (setLevel: ${control.setLevel}%, display: ${control.level}%)`);
            
        } catch (error) {
            console.error(`❌ Error setting DALI power ${controlId}:`, error);
        }
    }
    
    /**
     * Adjust DALI Level (Slider Click) - MIGLIORATO
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
            let percentage = Math.max(0, Math.min(100, Math.round(((event.clientX - rect.left) / rect.width) * 100)));
            
            // Applica range 10-100%
            if (percentage > 0 && percentage < 10) {
                percentage = 10;
            }
            
            this.updateDALILevelDirect(controlId, percentage);
            
        } catch (error) {
            console.error(`❌ Error adjusting DALI level ${controlId}:`, error);
        }
    }
    
    /**
     * Update DALI Level Direct (per drag e click) - NUOVO
     */
    updateDALILevelDirect(controlId, percentage) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            // Validazione range
            if (percentage > 0 && percentage < 10) {
                percentage = 10;
            }
            
            // Inizializza setLevel se non esiste
            if (!control.setLevel) {
                control.setLevel = 0;
            }
            
            // Aggiorna setLevel (sempre)
            control.setLevel = percentage;
            
            // Auto power management
            if (percentage > 0 && !control.power) {
                control.power = true;
                control.level = percentage;
                this.updateDALIPowerButtons(controlId, true);
            } else if (percentage === 0) {
                control.power = false;
                control.level = 0;
                this.updateDALIPowerButtons(controlId, false);
            } else if (control.power) {
                control.level = percentage;
            }
            
            this.updateDALIDisplay(controlId, control);
            this.sendDALICommand(control);
            
            console.log(`🎛️ DALI Level Direct ${controlId}: ${percentage}% (power: ${control.power})`);
            
        } catch (error) {
            console.error(`❌ Error updating DALI level direct ${controlId}:`, error);
        }
    }
    
    /**
     * Update DALI Display - MIGLIORATO
     */
    updateDALIDisplay(controlId, control) {
        try {
            // Inizializza setLevel se non esiste
            if (!control.setLevel) {
                control.setLevel = control.level || 0;
            }
            
            // Update level display (mostra level corrente, non setLevel)
            const display = document.getElementById(`${controlId}_display`);
            if (display) {
                display.innerHTML = `${control.level}<span class="level-unit">%</span>`;
                display.classList.toggle('on', control.power && control.level > 0);
                display.classList.toggle('off', !control.power || control.level === 0);
                
                // Visual feedback
                display.style.transform = 'scale(1.05)';
                setTimeout(() => display.style.transform = '', 200);
            }
            
            // Update slider (mostra sempre setLevel)
            const fill = document.getElementById(`${controlId}_fill`);
            const thumb = document.getElementById(`${controlId}_thumb`);
            if (fill && thumb) {
                const displayLevel = control.setLevel || 0;
                fill.style.width = displayLevel + '%';
                thumb.style.left = `calc(${displayLevel}% - 12px)`;
                thumb.classList.toggle('active', control.power && displayLevel > 0);
            }
            
            // Update buttons
            this.updateDALIPowerButtons(controlId, control.power);
            
        } catch (error) {
            console.error(`❌ Error updating DALI display ${controlId}:`, error);
        }
    }
    
    /**
     * Update DALI Power Buttons - MIGLIORATO
     */
    updateDALIPowerButtons(controlId, isOn) {
        const onBtn = document.getElementById(`${controlId}_on`);
        const offBtn = document.getElementById(`${controlId}_off`);
        
        if (onBtn && offBtn) {
            onBtn.classList.toggle('active', isOn);
            offBtn.classList.toggle('active', !isOn);
            
            // Visual feedback
            const activeBtn = isOn ? onBtn : offBtn;
            activeBtn.style.transform = 'scale(0.95)';
            setTimeout(() => activeBtn.style.transform = '', 150);
        }
    }
    
    /**
     * Send DALI Command via MQTT
     */
    sendDALICommand(control) {
        try {
            if (!this.dashboardCore.mqttManager || !this.dashboardCore.mqttManager.isConnected) {
                console.warn('⚠️ MQTT not connected - DALI command not sent');
                this.dashboardCore.logToConsole('error', 'MQTT Required', `Cannot send DALI command for ${control.name} - MQTT not connected`);
                return false;
            }
            
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
     * ===== THERMOSTAT CONTROLS - VERSIONE MIGLIORATA =====
     */
    
    /**
     * Set Thermostat Power (On/Off) - MIGLIORATO
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
            
            // Non modificare temperatura quando si spegne/accende
            // Mantieni sempre il setpoint impostato
            
            this.updateThermostatDisplay(controlId, control);
            this.sendThermostatCommand(control);
            
            console.log(`🌡️ Thermostat Power ${controlId}: ${state} (${control.temperature}°C)`);
            
        } catch (error) {
            console.error(`❌ Error setting thermostat power ${controlId}:`, error);
        }
    }
    
    /**
     * Adjust Thermostat Level (Slider) - MIGLIORATO
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
            
            // Converti percentuale in temperatura con step 0.5°C
            const tempRange = control.maxTemp - control.minTemp;
            const rawTemp = control.minTemp + (percentage / 100) * tempRange;
            const newTemp = Math.round(rawTemp * 2) / 2; // Arrotonda a 0.5°C
            
            this.updateThermostatTemperatureDirect(controlId, newTemp);
            
        } catch (error) {
            console.error(`❌ Error adjusting thermostat level ${controlId}:`, error);
        }
    }
    
    /**
     * Adjust Thermostat with +/- steps - MIGLIORATO
     */
    adjustThermostatStep(controlId, step) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) {
                console.error(`❌ Control ${controlId} not found`);
                return;
            }
            
            let newTemp = control.temperature + step;
            
            // Arrotonda a 0.5°C e limita range
            newTemp = Math.round(newTemp * 2) / 2;
            if (newTemp < control.minTemp) {
                newTemp = control.minTemp;
            } else if (newTemp > control.maxTemp) {
                newTemp = control.maxTemp;
            }
            
            this.updateThermostatTemperatureDirect(controlId, newTemp);
            
            // Visual feedback su pulsante
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
     * Update Thermostat Temperature Direct - NUOVO
     */
    updateThermostatTemperatureDirect(controlId, newTemp) {
        try {
            const control = this.dashboardCore.getControl(controlId);
            if (!control) return;
            
            // Arrotonda a 0.5°C
            newTemp = Math.round(newTemp * 2) / 2;
            
            // Limita al range
            if (newTemp < control.minTemp) newTemp = control.minTemp;
            if (newTemp > control.maxTemp) newTemp = control.maxTemp;
            
            control.temperature = newTemp;
            
            // Auto power management migliorato
            if (!control.power) {
                control.power = true;
                this.updateThermostatPowerButtons(controlId, true);
            }
            
            this.updateThermostatDisplay(controlId, control);
            this.sendThermostatCommand(control);
            
            console.log(`🎯 Thermostat Direct ${controlId}: ${newTemp}°C`);
            
        } catch (error) {
            console.error(`❌ Error updating thermostat temperature direct ${controlId}:`, error);
        }
    }
    
    /**
     * Update Thermostat Display - MIGLIORATO
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
            
            // Update slider position
            this.updateThermostatSlider(controlId, control);
            
            // Update power buttons
            this.updateThermostatPowerButtons(controlId, control.power);
            
            // Update climate status
            this.updateClimateStatus(controlId, control);
            
            // Update measured temperature container state
            this.updateMeasuredContainerState(controlId, control);
            
        } catch (error) {
            console.error(`❌ Error updating thermostat display ${controlId}:`, error);
        }
    }
    
    /**
     * Update Climate Status - NUOVO
     */
    updateClimateStatus(controlId, control) {
        const indicator = document.getElementById(`${controlId}_climate_indicator`);
        const icon = document.getElementById(`${controlId}_climate_icon`);
        const status = document.getElementById(`${controlId}_climate_status`);
        
        if (!indicator || !icon || !status) return;
        
        let state = 'off';
        let statusText = 'Spento';
        let iconText = '🌡️';
        
        if (control.power) {
            const tempDiff = control.temperature - (control.measuredTemp || 20);
            const tolerance = 0.5;
            
            if (Math.abs(tempDiff) <= tolerance) {
                state = 'neutral';
                statusText = 'Temperatura OK';
                iconText = '✅';
            } else if (tempDiff > tolerance) {
                state = 'heating';
                statusText = 'Riscaldamento';
                iconText = '🔥';
            } else {
                state = 'cooling';
                statusText = 'Raffreddamento';
                iconText = '❄️';
            }
        }
        
        // Remove all state classes
        indicator.classList.remove('heating', 'cooling', 'neutral', 'off');
        indicator.classList.add(state);
        
        icon.textContent = iconText;
        status.textContent = statusText;
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
        const measured = control.measuredTemp || 20;
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
     * Update Thermostat Slider - MIGLIORATO
     */
    updateThermostatSlider(controlId, control) {
        const fill = document.getElementById(`${controlId}_fill`);
        const thumb = document.getElementById(`${controlId}_thumb`);
        if (!fill || !thumb) return;
        
        // Calcola percentuale con precisione 0.5°C
        const tempRange = control.maxTemp - control.minTemp;
        const normalizedTemp = control.temperature - control.minTemp;
        const percentage = (normalizedTemp / tempRange) * 100;
        
        fill.style.width = percentage + '%';
        thumb.style.left = `calc(${percentage}% - 12px)`;
        thumb.classList.toggle('active', control.power);
        
        // Visual feedback
        if (control.power) {
            fill.style.boxShadow = '0 2px 8px rgba(46, 125, 50, 0.3)';
            setTimeout(() => fill.style.boxShadow = '', 300);
        }
    }
    
    /**
     * Update Thermostat Power Buttons
     */
    updateThermostatPowerButtons(controlId, isOn) {
        const onBtn = document.getElementById(`${controlId}_on`);
        const offBtn = document.getElementById(`${controlId}_off`);
        
        if (onBtn && offBtn) {
            onBtn.classList.toggle('active', isOn);
            offBtn.classList.toggle('active', !isOn);
            
            // Visual feedback
            const activeBtn = isOn ? onBtn : offBtn;
            activeBtn.style.transform = 'scale(0.95)';
            setTimeout(() => activeBtn.style.transform = '', 150);
        }
    }
    
    /**
     * Update Thermostat from MQTT data
     */
    updateThermostatFromMQTT(controlId, mqttControl) {
        try {
            console.log(`🌡️ Updating thermostat ${controlId} from MQTT`);
            
            // Update local control data
            const localControl = this.dashboardCore.getControl(controlId);
            if (!localControl) {
                console.error(`❌ Local control ${controlId} not found`);
                return;
            }
            
            // Update control with MQTT data - arrotonda a 0.5°C
            localControl.temperature = Math.round(mqttControl.temperature * 2) / 2;
            localControl.measuredTemp = Math.round(mqttControl.measuredTemp * 2) / 2;
            localControl.power = mqttControl.power;
            localControl.climateState = mqttControl.climateState;
            
            // Update UI without sending MQTT (avoid loops)
            this.updateThermostatDisplayFromMQTT(controlId, localControl);
            
            console.log(`✅ Thermostat ${controlId} UI updated from MQTT`);
            
        } catch (error) {
            console.error(`❌ Error updating thermostat from MQTT ${controlId}:`, error);
        }
    }
    
    /**
     * Update Thermostat Display from MQTT (no MQTT send)
     */
    updateThermostatDisplayFromMQTT(controlId, control) {
        try {
            // Update setpoint display
            const display = document.getElementById(`${controlId}_display`);
            if (display) {
                display.innerHTML = `${control.temperature}<span class="level-unit">°C</span>`;
                display.classList.toggle('on', control.power);
                display.classList.toggle('off', !control.power);
                
                // Visual feedback for MQTT update
                display.style.border = '2px solid #4CAF50';
                setTimeout(() => display.style.border = '', 1000);
            }
            
            // Update measured temperature
            const measuredDisplay = document.getElementById(`${controlId}_measured`);
            if (measuredDisplay) {
                measuredDisplay.innerHTML = `${control.measuredTemp}<span class="measured-unit">°C</span>`;
                
                // Visual feedback for measured temp update
                measuredDisplay.style.transform = 'scale(1.1)';
                setTimeout(() => measuredDisplay.style.transform = '', 300);
            }
            
            // Update measured container state based on MQTT climate state
            this.updateMeasuredContainerStateFromMQTT(controlId, control);
            
            // Update slider position
            this.updateThermostatSlider(controlId, control);
            
            // Update power buttons
            this.updateThermostatPowerButtons(controlId, control.power);
            
            // Update climate status
            this.updateClimateStatus(controlId, control);
            
        } catch (error) {
            console.error(`❌ Error updating thermostat display from MQTT ${controlId}:`, error);
        }
    }
    
    /**
     * Update Measured Container State from MQTT
     */
    updateMeasuredContainerStateFromMQTT(controlId, control) {
        const measuredContainer = document.getElementById(`${controlId}_measured_container`);
        if (!measuredContainer) return;
        
        // Remove all state classes
        measuredContainer.classList.remove('heating', 'cooling', 'neutral', 'off');
        
        // Add class based on MQTT climate state
        if (!control.power) {
            measuredContainer.classList.add('off');
        } else {
            measuredContainer.classList.add(control.climateState || 'neutral');
        }
        
        // Visual feedback for state change
        measuredContainer.style.boxShadow = '0 8px 20px rgba(76, 175, 80, 0.3)';
        setTimeout(() => measuredContainer.style.boxShadow = '', 1000);
    }
    
    /**
     * Send Thermostat Command via MQTT
     */
    sendThermostatCommand(control) {
        try {
            if (!this.dashboardCore.mqttManager || !this.dashboardCore.mqttManager.isConnected) {
                console.warn('⚠️ MQTT not connected - Thermostat command not sent');
                this.dashboardCore.logToConsole('error', 'MQTT Required', `Cannot send Thermostat command for ${control.name} - MQTT not connected`);
                return false;
            }
            
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
     * ===== ON/OFF CONTROLS =====
     */
    
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
            if (!this.dashboardCore.mqttManager || !this.dashboardCore.mqttManager.isConnected) {
                console.warn('⚠️ MQTT not connected - On/Off command not sent');
                this.dashboardCore.logToConsole('error', 'MQTT Required', `Cannot send On/Off command for ${control.name} - MQTT not connected`);
                return false;
            }
            
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
            if (!this.dashboardCore.mqttManager || !this.dashboardCore.mqttManager.isConnected) {
                console.warn('⚠️ MQTT not connected - Monostable command not sent');
                this.dashboardCore.logToConsole('error', 'MQTT Required', `Cannot send Monostable command for ${control.name} - MQTT not connected`);
                return false;
            }
            
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
                    setLevel: control.setLevel,
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
                    
                case 'thermostat':
                    this.setThermostatPower(control.id, 'on');
                    setTimeout(() => this.adjustThermostatStep(control.id, 1), 1000);
                    setTimeout(() => this.adjustThermostatStep(control.id, -1), 2000);
                    setTimeout(() => this.setThermostatPower(control.id, 'off'), 3000);
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