/**
 * AMAN Venice Dashboard Base Module
 * Core JavaScript per dashboard modulare
 * 
 * Da includere in tutte le camere come modulo base
 */

// ===== AMAN VENICE DASHBOARD CORE SYSTEM =====

var AmanDashboard = {
    // System state
    roomNumber: null,
    roomName: null,
    roomConfig: null,
    connected: false,
    lastUpdateTime: 'Never',
    
    // MQTT System
    mqttManager: null,
    mqttHandlers: null,
    mqttSenders: null,
    daliController: null,
    
    // UI State
    currentTab: null,
    controls: {},
    
    // Initialize system
    async init() {
        console.log('🏨 AMAN Venice Dashboard System');
        console.log('🔧 Initializing core system...');
        
        // Initialize room from URL or global variable
        this.initializeRoom();
        this.initializeLogo();
        this.setupErrorHandling();
        this.injectBaseHTML();
        
        console.log('🏠 System ready for login');
    },
    
    // Initialize room configuration
    initializeRoom() {
        // Get room number from global variable, URL parameter, or filename
        let roomNum = window.AMAN_ROOM_NUMBER;
        
        if (!roomNum) {
            const urlParams = new URLSearchParams(window.location.search);
            roomNum = urlParams.get('room');
        }
        
        if (!roomNum) {
            // Try to extract from filename (e.g., room-02.html)
            const filename = window.location.pathname.split('/').pop();
            const match = filename.match(/room-(\d+)/);
            roomNum = match ? match[1] : '01';
        }
        
        this.roomNumber = roomNum.toString().padStart(2, '0');
        this.roomName = `Room ${this.roomNumber}`;
        
        console.log(`🏠 Room initialized: ${this.roomName}`);
    },
    
    // Inject base HTML structure into page
    injectBaseHTML() {
        const existingLoader = document.getElementById('roomLoader');
        if (existingLoader) {
            existingLoader.remove();
        }
        
        // Inject base CSS
        this.injectBaseCSS();
        
        // Update page title
        document.title = `AMAN Venice - ${this.roomName}`;
        
        // Inject main HTML structure
        document.body.innerHTML = `
            <!-- Login Screen -->
            <div class="login-screen" id="loginScreen">
                <div class="login-container">
                    <div class="logo">
                        <img src="assets/images/AmanVeniceCameraLogo.png" alt="AMAN Venice Logo" class="logo-image" id="logoImage" style="display: none;">
                        <div class="logo-fallback" id="logoFallback">AMAN</div>
                    </div>
                    <h1 class="login-title" id="loginTitle">${this.roomName} Control</h1>
                    <input type="password" class="password-input" id="passwordInput" placeholder="Enter password" maxlength="10">
                    <button class="login-button" onclick="doLogin()">Enter</button>
                    <div class="error-message" id="errorMessage"></div>
                </div>
            </div>

            <!-- Loading Screen -->
            <div class="loading-screen" id="loadingScreen">
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-text" id="loadingText">Initializing ${this.roomName} Dashboard</div>
                    <div class="loading-details" id="loadingDetails">Setting up room systems...</div>
                </div>
            </div>

            <!-- Main Application -->
            <div class="main-app" id="mainApp">
                <!-- Header -->
                <header class="header"></header>

                <!-- Navigation -->
                <div class="nav-container">
                    <div class="nav-tabs" id="navigationTabs">
                        <!-- Tabs will be loaded dynamically -->
                    </div>
                </div>

                <!-- Content -->
                <div class="content-container">
                    <div id="tabsContainer">
                        <!-- Tab contents will be loaded dynamically -->
                    </div>
                </div>

                <!-- Status Panel -->
                <div class="status-panel">
                    <div class="status-left">
                        <div class="status-item">
                            <div class="status-indicator" id="statusIndicator"></div>
                            <div>
                                <div style="font-weight: bold;" id="roomNameStatus">${this.roomName}</div>
                                <div id="connectionStatus">Disconnected</div>
                            </div>
                        </div>
                    </div>
                    <div class="status-right">
                        <button class="header-btn" onclick="showInfo()">RIMO</button>
                        <button class="header-btn" onclick="toggleConsole()">Console</button>
                    </div>
                </div>
            </div>

            <!-- Info Modal -->
            <div class="info-modal" id="infoModal">
                <div class="info-modal-content">
                    <button class="info-close-btn" onclick="hideInfo()">&times;</button>
                    
                    <div class="info-modal-header">
                        <h2 class="info-modal-title" id="infoTitle">AMAN Venice - ${this.roomName}</h2>
                        <p class="info-modal-subtitle" id="infoSubtitle">Complete Control Dashboard - Developer: RIMO</p>
                    </div>

                    <div class="info-section">
                        <h3 class="info-section-title">🏠 System Information</h3>
                        <div class="system-info-grid">
                            <div class="info-item">
                                <span class="info-label">Room Number:</span>
                                <span class="info-value" id="infoRoomNumber">${this.roomNumber}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Version:</span>
                                <span class="info-value" id="infoVersion">${this.roomName} v1.0</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Last Update:</span>
                                <span class="info-value" id="infoLastUpdate">Never</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">MQTT Status:</span>
                                <span class="info-value" id="infoMqttStatus">Disconnected</span>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <h3 class="info-section-title">📡 Connection Details</h3>
                        <div class="system-info-grid">
                            <div class="info-item">
                                <span class="info-label">MQTT Broker:</span>
                                <span class="info-value">broker.emqx.io:8084</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Publish Topic:</span>
                                <span class="info-value">Camere/Hmi</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Subscribe Topic:</span>
                                <span class="info-value">Camere/Plc</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Status:</span>
                                <span class="info-value" id="infoClientId">Offline</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Console -->
            <div class="console-panel" id="consolePanel">
                <div class="console-header">
                    <div id="consoleTitle">📡 MQTT Console - ${this.roomName}</div>
                    <div>
                        <button class="header-btn" onclick="hideConsole()">Close</button>
                    </div>
                </div>
                <div class="console-content" id="consoleContent">
                    <div class="message-info">[SYSTEM] ${this.roomName} dashboard console initialized</div>
                </div>
            </div>

            <button class="console-toggle" onclick="toggleConsole()">📡</button>
        `;
    },
    
    // Inject base CSS styles
    injectBaseCSS() {
        if (document.getElementById('amanBaseStyles')) return;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'amanBaseStyles';
        styleElement.textContent = `
            /* AMAN Venice Base Styles */
            :root {
                --aman-green: #1a4a3a;
                --aman-gold: #d4af37;
                --wine-medium: #911e42;
                --wine-dark: #641428;
                --gray-light: #e6e6e6;
                --gray-medium: #999999;
                --white: #ffffff;
                --black: #000000;
                --blue: #0066ff;
                --green: #00ff00;
                --yellow: #ffff00;
                --orange: #ff9933;
                --red: #ff3333;
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, var(--aman-green), var(--aman-gold));
                min-height: 100vh;
                display: flex;
                flex-direction: column;
            }

            /* Login Screen */
            .login-screen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, var(--aman-green), var(--aman-gold));
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 2000;
            }

            .login-container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                text-align: center;
                max-width: 400px;
                width: 90%;
            }

            .logo {
                width: 120px;
                height: 120px;
                background: linear-gradient(135deg, var(--aman-green), var(--aman-gold));
                border-radius: 50%;
                margin: 0 auto 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--white);
                font-size: 24px;
                font-weight: bold;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                overflow: hidden;
                position: relative;
            }

            .logo-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                position: absolute;
                top: 0;
                left: 0;
            }

            .logo-fallback {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
                position: relative;
                z-index: 1;
            }

            .login-title {
                color: var(--white);
                font-size: 28px;
                margin-bottom: 30px;
                font-weight: 300;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }

            .password-input {
                width: 100%;
                padding: 15px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 8px;
                font-size: 18px;
                text-align: center;
                margin-bottom: 20px;
                background: rgba(255, 255, 255, 0.2);
                color: var(--white);
                backdrop-filter: blur(5px);
            }

            .password-input::placeholder {
                color: rgba(255, 255, 255, 0.7);
            }

            .password-input:focus {
                outline: none;
                border-color: var(--aman-gold);
                background: rgba(255, 255, 255, 0.3);
            }

            .login-button {
                width: 100%;
                padding: 15px;
                background: linear-gradient(145deg, var(--aman-green), var(--aman-gold));
                color: var(--white);
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 500;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                transition: all 0.3s ease;
            }

            .login-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            }

            .error-message {
                color: #ff6b6b;
                margin-top: 15px;
                font-size: 14px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
            }

            /* Loading Screen */
            .loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(135deg, var(--aman-green), var(--aman-gold));
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 1500;
            }

            .loading-container {
                text-align: center;
                color: var(--white);
            }

            .loading-spinner {
                width: 60px;
                height: 60px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid var(--white);
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
            }

            .loading-text {
                font-size: 18px;
                font-weight: 300;
                opacity: 0.9;
            }

            .loading-details {
                font-size: 14px;
                opacity: 0.7;
                margin-top: 10px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            /* Main App Structure */
            .main-app {
                display: none;
                flex: 1;
                flex-direction: column;
            }

            .main-app.show {
                display: flex;
            }

            .header {
                background: linear-gradient(135deg, var(--aman-green), var(--aman-gold));
                padding: 15px 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }

            .nav-container {
                background: linear-gradient(135deg, var(--aman-green), var(--aman-gold));
                border-bottom: 2px solid var(--aman-gold);
            }

            .nav-tabs {
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
            }

            .nav-tab {
                padding: 15px 25px;
                background: var(--aman-green);
                color: var(--white);
                border: none;
                cursor: pointer;
                font-size: 16px;
                font-weight: 500;
                border-bottom: 3px solid transparent;
                transition: all 0.3s ease;
            }

            .nav-tab:hover {
                background: rgba(26, 74, 58, 0.8);
            }

            .nav-tab.active {
                background: var(--aman-gold);
                color: var(--aman-green);
                border-bottom-color: var(--wine-medium);
            }

            .content-container {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
            }

            .tab-content {
                display: none;
                max-width: 1200px;
                margin: 0 auto;
            }

            .tab-content.active {
                display: block;
            }

            /* Room Header */
            .room-header {
                background: var(--aman-green);
                color: var(--aman-gold);
                padding: 30px;
                border-radius: 12px;
                text-align: center;
                margin-bottom: 30px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            }

            .room-title {
                font-size: 32px;
                font-weight: 300;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 2px;
            }

            .room-subtitle {
                font-size: 16px;
                opacity: 0.8;
            }

            /* Controls Grid */
            .controls-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }

            /* Individual Control Container */
            .control-container {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 15px;
                padding: 20px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                transition: all 0.3s ease;
            }

            .control-container:hover {
                transform: translateY(-5px);
                box-shadow: 0 15px 35px rgba(0,0,0,0.15);
            }

            .status-panel {
                background: var(--aman-green);
                color: var(--white);
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 20px;
            }

            .status-left {
                display: flex;
                align-items: center;
                gap: 20px;
            }

            .status-right {
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
            }

            .status-item {
                display: flex;
                align-items: center;
                gap: 10px;
            }

            .status-indicator {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: var(--red);
            }

            .status-indicator.connected {
                background: var(--green);
            }

            .status-indicator.connecting {
                background: var(--orange);
            }

            .header-btn {
                padding: 8px 16px;
                background: var(--aman-green);
                color: var(--white);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                transition: all 0.3s ease;
            }

            .header-btn:hover {
                background: rgba(26, 74, 58, 0.8);
            }

            /* Console Panel */
            .console-panel {
                display: none;
                position: fixed;
                bottom: 0;
                left: 0;
                right: 0;
                height: 40vh;
                background: rgba(0, 0, 0, 0.95);
                color: var(--green);
                font-family: 'Courier New', monospace;
                z-index: 1000;
                flex-direction: column;
            }

            .console-panel.show {
                display: flex;
            }

            .console-header {
                background: var(--aman-green);
                color: var(--white);
                padding: 10px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .console-content {
                flex: 1;
                padding: 15px;
                overflow-y: auto;
                font-size: 12px;
                line-height: 1.4;
            }

            .console-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 60px;
                height: 60px;
                border-radius: 50%;
                background: var(--aman-green);
                color: var(--white);
                border: none;
                cursor: pointer;
                font-size: 18px;
                z-index: 1001;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }

            .message-sent { color: #ff9966; }
            .message-received { color: #66ff99; }
            .message-info { color: #66ccff; }
            .message-error { color: #ff6666; }

            /* Info Modal */
            .info-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                z-index: 3000;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
            }

            .info-modal.show {
                display: flex;
            }

            .info-modal-content {
                background: var(--white);
                border-radius: 12px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0,0,0,0.4);
                animation: slideInUp 0.3s ease;
                position: relative;
            }

            .info-close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: var(--gray-medium);
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: all 0.3s ease;
            }

            .info-close-btn:hover {
                background: var(--gray-light);
                color: var(--aman-green);
            }

            .info-modal-header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid var(--aman-gold);
                padding-bottom: 20px;
            }

            .info-modal-title {
                color: var(--aman-green);
                font-size: 24px;
                font-weight: 300;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .info-modal-subtitle {
                color: var(--gray-medium);
                font-size: 14px;
            }

            .info-section {
                margin-bottom: 25px;
            }

            .info-section-title {
                color: var(--aman-green);
                font-size: 16px;
                font-weight: 600;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }

            .system-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
            }

            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 15px;
                background: rgba(26, 74, 58, 0.05);
                border-radius: 8px;
                border-left: 4px solid var(--aman-gold);
            }

            .info-label {
                font-weight: 500;
                color: var(--aman-green);
            }

            .info-value {
                font-weight: 600;
                color: var(--gray-medium);
            }

            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Responsive */
            @media (max-width: 768px) {
                .content-container {
                    padding: 15px;
                }
                
                .status-panel {
                    flex-direction: column;
                    gap: 15px;
                }

                .nav-tab {
                    padding: 12px 15px;
                    font-size: 14px;
                }

                .room-title {
                    font-size: 24px;
                }

                .controls-grid {
                    grid-template-columns: 1fr;
                    gap: 15px;
                }
            }
        `;
        
        document.head.appendChild(styleElement);
    },
    
    // Logo initialization
    initializeLogo() {
        setTimeout(() => {
            const logoImage = document.getElementById('logoImage');
            const logoFallback = document.getElementById('logoFallback');
            
            if (!logoImage || !logoFallback) return;
            
            // Try to load the real logo first
            logoImage.onload = () => {
                logoImage.style.display = 'block';
                logoFallback.style.display = 'none';
            };
            
            logoImage.onerror = () => {
                // If real logo fails, use SVG fallback
                logoFallback.style.display = 'flex';
                logoImage.style.display = 'none';
                
                // Create embedded SVG logo as fallback
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
            
            // Set the source to the real logo
            logoImage.src = 'assets/images/AmanVeniceCameraLogo.png';
        }, 100);
    },
    
    // Load room configuration
    async loadRoomConfig() {
        try {
            console.log(`📋 Loading configuration for ${this.roomName}...`);
            
            // Try to load room-specific config
            const configUrl = `config/rooms/room-${this.roomNumber}.json`;
            
            try {
                const response = await fetch(configUrl);
                if (response.ok) {
                    this.roomConfig = await response.json();
                    console.log('✅ Room configuration loaded:', this.roomConfig);
                } else {
                    throw new Error(`Config not found: ${response.status}`);
                }
            } catch (error) {
                console.warn('⚠️ Custom config not found, using default configuration');
                this.roomConfig = this.createDefaultConfig();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Failed to load room configuration:', error);
            this.roomConfig = this.createDefaultConfig();
            return false;
        }
    },
    
    // Create default configuration
    createDefaultConfig() {
        return {
            "roomNumber": parseInt(this.roomNumber),
            "roomName": this.roomName,
            "theme": "aman-venice",
            "tabs": [
                {
                    "id": "bedroom",
                    "name": "🛏️ Bedroom",
                    "controls": [
                        {
                            "type": "dali-light",
                            "zone": "lighting",
                            "config": {"name": "Bedroom Lights", "mqttDevice": "CameraLuci"}
                        }
                    ]
                },
                {
                    "id": "bathroom",
                    "name": "🚿 Bathroom",
                    "controls": [
                        {
                            "type": "dali-light",
                            "zone": "lighting",
                            "config": {"name": "Bathroom Lights", "mqttDevice": "BagnoLuci"}
                        }
                    ]
                },
                {
                    "id": "settings",
                    "name": "⚙️ Settings",
                    "controls": [
                        {
                            "type": "system-reset",
                            "zone": "system",
                            "config": {"name": "System Controls"}
                        }
                    ]
                }
            ]
        };
    },
    
    // Login and setup
    async doLogin(password) {
        console.log('🔐 Login attempt for', this.roomName);
        
        // Validate password
        if (password !== this.roomNumber) {
            throw new Error(`Invalid password. Please enter "${this.roomNumber}" for ${this.roomName}.`);
        }
        
        console.log('✅ Login successful for', this.roomName);
        
        // Show loading
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('loadingScreen').style.display = 'flex';
        
        // Load dashboard
        await this.loadDashboard();
    },
    
    // Load complete dashboard
    async loadDashboard() {
        try {
            this.updateLoadingStatus('Loading room configuration...');
            await this.loadRoomConfig();
            await this.sleep(500);
            
            this.updateLoadingStatus('Initializing MQTT system...');
            await this.initializeMQTT();
            await this.sleep(300);
            
            this.updateLoadingStatus('Setting up user interface...');
            this.setupUI();
            await this.sleep(300);
            
            this.updateLoadingStatus('Connecting to room systems...');
            await this.connectSystems();
            await this.sleep(300);
            
            this.updateLoadingStatus('Finalizing...');
            await this.sleep(200);
            
            // Show main app
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';
            document.getElementById('mainApp').classList.add('show');
            
            // Update status
            this.updateInfoModal();
            
            console.log('🎉', this.roomName, 'Dashboard loaded successfully!');
            this.logToConsole('info', 'Dashboard Ready', `${this.roomName} loaded with MQTT integration`);
            
        } catch (error) {
            console.error('❌ Failed to load dashboard:', error);
            this.showError('Failed to load dashboard: ' + error.message);
            
            // Return to login
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
        }
    },
    
    // Initialize MQTT system
    async initializeMQTT() {
        try {
            console.log('📡 Initializing MQTT system...');
            
            // Check for MQTT classes
            if (typeof MQTTManager === 'undefined') {
                throw new Error('MQTT modules not loaded');
            }
            
            // Initialize MQTT components
            this.mqttManager = new MQTTManager();
            this.mqttHandlers = new MQTTHandlers();
            this.mqttSenders = new MQTTSenders();
            
            // Initialize handlers and senders
            if (!this.mqttHandlers.initialize(this.mqttManager)) {
                throw new Error('Failed to initialize MQTT Handlers');
            }
            
            if (!this.mqttSenders.initialize(this.mqttManager)) {
                throw new Error('Failed to initialize MQTT Senders');
            }
            
            // Initialize DALI controller if needed
            if (this.hasDaliControls()) {
                if (typeof DALIMQTTController === 'undefined') {
                    throw new Error('DALI Controller not available');
                }
                
                this.daliController = new DALIMQTTController('daliControlsContainer');
                if (!this.daliController.initialize(this.mqttHandlers, this.mqttSenders)) {
                    throw new Error('Failed to initialize DALI Controller');
                }
            }
            
            console.log('✅ MQTT system initialized');
            return true;
            
        } catch (error) {
            console.error('❌ MQTT initialization failed:', error);
            // Continue without MQTT (simulation mode)
            this.logToConsole('error', 'MQTT Failed', 'Running in simulation mode: ' + error.message);
            return false;
        }
    },
    
    // Check if room has DALI controls
    hasDaliControls() {
        if (!this.roomConfig || !this.roomConfig.tabs) return false;
        
        return this.roomConfig.tabs.some(tab => 
            tab.controls && tab.controls.some(control => 
                control.type === 'dali-light'
            )
        );
    },
    
    // Setup user interface
    setupUI() {
        console.log('🎨 Setting up user interface...');
        
        // Create navigation tabs
        this.createNavigationTabs();
        
        // Create tab contents
        this.createTabContents();
        
        // Activate first tab
        if (this.roomConfig.tabs && this.roomConfig.tabs.length > 0) {
            this.switchTab(this.roomConfig.tabs[0].id);
        }
        
        console.log('✅ User interface setup complete');
    },
    
    // Create navigation tabs
    createNavigationTabs() {
        const navContainer = document.getElementById('navigationTabs');
        if (!navContainer) return;
        
        navContainer.innerHTML = '';
        
        if (!this.roomConfig.tabs) return;
        
        this.roomConfig.tabs.forEach((tab, index) => {
            const tabButton = document.createElement('button');
            tabButton.className = 'nav-tab' + (index === 0 ? ' active' : '');
            tabButton.textContent = tab.name;
            tabButton.onclick = () => this.switchTab(tab.id, tabButton);
            navContainer.appendChild(tabButton);
        });
    },
    
    // Create tab contents
    createTabContents() {
        const tabsContainer = document.getElementById('tabsContainer');
        if (!tabsContainer) return;
        
        tabsContainer.innerHTML = '';
        
        if (!this.roomConfig.tabs) return;
        
        // Create DALI container if needed
        if (this.hasDaliControls()) {
            const daliContainer = document.createElement('div');
            daliContainer.id = 'daliControlsContainer';
            daliContainer.style.cssText = 'margin: 20px 0;';
            tabsContainer.appendChild(daliContainer);
        }
        
        this.roomConfig.tabs.forEach((tab, index) => {
            const tabContent = document.createElement('div');
            tabContent.id = `${tab.id}-tab`;
            tabContent.className = 'tab-content' + (index === 0 ? ' active' : '');
            
            // Room header
            const roomHeader = document.createElement('div');
            roomHeader.className = 'room-header';
            roomHeader.innerHTML = `
                <h2 class="room-title">${tab.name}</h2>
                <p class="room-subtitle">${this.roomName} - ${tab.subtitle || tab.name.replace(/[🛏️🚿⚙️]/g, '').trim()}</p>
            `;
            
            tabContent.appendChild(roomHeader);
            
            // Controls will be populated by MQTT modules
            if (tab.controls && tab.controls.some(c => c.type === 'dali-light')) {
                const placeholder = document.createElement('div');
                placeholder.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #8B4513;">
                        <h3>💡 Loading DALI Controls...</h3>
                        <p>MQTT system will populate controls automatically</p>
                    </div>
                `;
                tabContent.appendChild(placeholder);
            }
            
            tabsContainer.appendChild(tabContent);
        });
    },
    
    // Connect to room systems
    async connectSystems() {
        try {
            console.log('🔌 Connecting to room systems...');
            
            if (this.mqttManager) {
                // Try to connect to MQTT
                await this.mqttManager.connect();
                
                // Setup connection monitoring
                this.mqttManager.onConnection((connected, error) => {
                    this.updateConnectionStatus(connected, error);
                });
            } else {
                // Simulation mode
                console.log('📋 Running in simulation mode');
                this.simulateConnection();
            }
            
            return true;
        } catch (error) {
            console.warn('⚠️ Connection failed, running in simulation mode:', error);
            this.simulateConnection();
            return false;
        }
    },
    
    // Simulate connection for demo
    simulateConnection() {
        this.connected = true;
        this.updateConnectionStatus(true);
        this.lastUpdateTime = new Date().toLocaleString();
        this.logToConsole('info', 'Simulation Mode', 'Running without real MQTT connection');
    },
    
    // Switch between tabs
    switchTab(tabId, buttonElement = null) {
        // Update navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        if (buttonElement) {
            buttonElement.classList.add('active');
        } else {
            // Find button by tab name
            const tabs = document.querySelectorAll('.nav-tab');
            tabs.forEach(tab => {
                if (tab.textContent === this.roomConfig.tabs.find(t => t.id === tabId)?.name) {
                    tab.classList.add('active');
                }
            });
        }
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        const targetTab = document.getElementById(`${tabId}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
            this.currentTab = tabId;
        }
    },
    
    // Update connection status
    updateConnectionStatus(connected, error = null) {
        this.connected = connected;
        const indicator = document.getElementById('statusIndicator');
        const status = document.getElementById('connectionStatus');
        
        if (!indicator || !status) return;
        
        if (connected) {
            indicator.classList.add('connected');
            indicator.classList.remove('connecting');
            status.textContent = this.mqttManager ? 'MQTT Connected' : 'Simulation Mode';
        } else {
            indicator.classList.remove('connected', 'connecting');
            status.textContent = 'Disconnected';
            if (error) {
                this.logToConsole('error', 'Connection Error', error);
            }
        }
        
        this.updateInfoModal();
    },
    
    // Update loading status
    updateLoadingStatus(message) {
        const details = document.getElementById('loadingDetails');
        if (details) {
            details.textContent = message;
        }
        console.log('⏳', message);
    },
    
    // Update info modal
    updateInfoModal() {
        const elements = {
            infoRoomNumber: this.roomNumber,
            infoLastUpdate: this.lastUpdateTime,
            infoMqttStatus: this.connected ? 
                (this.mqttManager ? 'Connected' : 'Simulation Mode') : 'Disconnected',
            infoClientId: this.mqttManager ? 
                this.mqttManager.config?.clientId || 'Connected' : 'Simulation Mode'
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = elements[id];
            }
        });
    },
    
    // Console logging
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
    },
    
    // Show error
    showError(message) {
        alert('Error: ' + message);
        console.error('❌ Error:', message);
    },
    
    // Setup error handling
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.logToConsole('error', 'System Error', event.error?.message || 'Unknown error');
        });
    },
    
    // Utility function
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// ===== GLOBAL FUNCTIONS =====

function doLogin() {
    const password = document.getElementById('passwordInput')?.value;
    const errorMsg = document.getElementById('errorMessage');
    
    if (errorMsg) errorMsg.textContent = '';
    
    try {
        AmanDashboard.doLogin(password);
    } catch (error) {
        if (errorMsg) errorMsg.textContent = error.message;
        const input = document.getElementById('passwordInput');
        if (input) input.value = '';
    }
}

function showInfo() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.add('show');
}

function hideInfo() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.remove('show');
}

function toggleConsole() {
    const panel = document.getElementById('consolePanel');
    if (panel) panel.classList.toggle('show');
}

function hideConsole() {
    const panel = document.getElementById('consolePanel');
    if (panel) panel.classList.remove('show');
}

// ===== GLOBAL API =====

window.AmanAPI = {
    // System access
    getRoomNumber: () => AmanDashboard.roomNumber,
    getRoomName: () => AmanDashboard.roomName,
    getRoomConfig: () => AmanDashboard.roomConfig,
    
    // MQTT
    getMQTTManager: () => AmanDashboard.mqttManager,
    getMQTTHandlers: () => AmanDashboard.mqttHandlers,
    getMQTTSenders: () => AmanDashboard.mqttSenders,
    getDALIController: () => AmanDashboard.daliController,
    
    // Status
    isConnected: () => AmanDashboard.connected,
    getCurrentTab: () => AmanDashboard.currentTab,
    
    // Console
    log: (type, header, data) => AmanDashboard.logToConsole(type, header, data),
    
    // Dashboard control
    switchTab: (tabId) => AmanDashboard.switchTab(tabId),
    loadConfig: () => AmanDashboard.loadRoomConfig(),
    
    // System control
    getDashboard: () => AmanDashboard
};

// ===== DEBUG GLOBALS =====

window.amanDebug = {
    // MQTT status
    mqttStatus: () => AmanDashboard.mqttManager?.getConnectionStatus() || 'Not initialized',
    
    // DALI controls
    activeControls: () => AmanDashboard.daliController?.getActiveControlsStatus() || 'DALI not initialized',
    
    // Queue status
    queueStatus: () => AmanDashboard.mqttSenders?.getQueueStatus() || 'Senders not initialized',
    
    // Message history
    messageHistory: () => AmanDashboard.mqttHandlers?.getMessageHistory() || 'Handlers not initialized',
    
    // Statistics
    statistics: () => AmanDashboard.mqttHandlers?.getStatistics() || 'Handlers not initialized',
    
    // Simulate DALI message
    simulateDALI: (roomNumber) => {
        if (AmanDashboard.mqttHandlers) {
            AmanDashboard.mqttHandlers.simulateMessage('DALI_LIGHTS', roomNumber || parseInt(AmanDashboard.roomNumber));
        } else {
            console.warn('⚠️ MQTT Handlers not initialized');
        }
    },
    
    // Test DALI commands
    testCommands: (roomNumber) => {
        if (AmanDashboard.daliController) {
            AmanDashboard.daliController.testDALICommands(roomNumber || parseInt(AmanDashboard.roomNumber));
        } else {
            console.warn('⚠️ DALI Controller not initialized');
        }
    },
    
    // System info
    systemInfo: () => ({
        room: AmanDashboard.roomNumber,
        connected: AmanDashboard.connected,
        config: AmanDashboard.roomConfig,
        mqttReady: !!AmanDashboard.mqttManager,
        daliReady: !!AmanDashboard.daliController
    }),
    
    // Force reconnect
    reconnect: () => {
        if (AmanDashboard.mqttManager) {
            AmanDashboard.mqttManager.connect();
        } else {
            console.warn('⚠️ MQTT Manager not initialized');
        }
    }
};

// ===== INITIALIZATION =====

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Starting AMAN Venice Dashboard...');
    console.log('🏠 Room:', window.AMAN_ROOM_NUMBER || 'auto-detect');
    
    try {
        await AmanDashboard.init();
    } catch (error) {
        console.error('❌ Dashboard initialization failed:', error);
    }
});

// Enter key support for login
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen && loginScreen.style.display !== 'none') {
            doLogin();
        }
    }
});

// Click outside modal to close
document.addEventListener('click', function(e) {
    const modal = document.getElementById('infoModal');
    if (modal && e.target === modal) {
        hideInfo();
    }
});

// Escape key to close modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        hideInfo();
        hideConsole();
    }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AmanDashboard, AmanAPI: window.AmanAPI };
}

console.log('✅ AMAN Venice Dashboard Base Module ready');