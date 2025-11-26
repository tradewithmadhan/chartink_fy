/**
 * Settings management for ------>kodebuds Chartink's
 * 
 * Handles chart settings persistence and application
 */

// Storage keys
const STORAGE_KEYS = {
    CHART_SETTINGS: 'chartSettings'
};

// Time formats
const TIME_FORMATS = {
    HOUR_12: '12h',
    HOUR_24: '24h'
};

// Default settings configuration (only time-related)
const DEFAULT_SETTINGS = {
    timezone: 'Asia/Kolkata', // Indian Standard Time (UTC+5:30)
    timeFormat: TIME_FORMATS.HOUR_24
};

// Current settings cache (loaded from localStorage or defaults)
let currentSettings = { ...DEFAULT_SETTINGS };

/**
 * Timezone conversion utilities
 * Note: For TradingView Lightweight Charts, timestamps are handled internally
 */

// ...existing code...

/**
 * Get current timezone setting
 * @returns {string} Current timezone
 */
export function getCurrentTimezone() {
    return currentSettings.timezone || 'Asia/Kolkata';
}

/**
 * Get current time format setting
 * @returns {string} Current time format
 */
export function getTimeFormat() {
    return currentSettings.timeFormat || TIME_FORMATS.HOUR_24;
}

/**
 * Storage utilities for settings persistence
 */

/**
 * Load settings from localStorage
 * @returns {object} Loaded settings object
 */
export function loadSettings() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.CHART_SETTINGS);
        if (saved) {
            const parsedSettings = JSON.parse(saved);
            // Merge with defaults to ensure all required properties exist
            currentSettings = { ...DEFAULT_SETTINGS, ...parsedSettings };
            console.log('Settings loaded from localStorage:', currentSettings);
        } else {
            currentSettings = { ...DEFAULT_SETTINGS };
            console.log('Using default settings:', currentSettings);
        }
    } catch (error) {
        console.warn('Failed to load settings, using defaults:', error);
        currentSettings = { ...DEFAULT_SETTINGS };
    }
    return currentSettings;
}

/**
 * Save settings to localStorage and dispatch update event
 * @param {object} settings - Settings object to save
 * @returns {boolean} Success status
 */
export function saveSettings(settings) {
    try {
        // Merge with current settings to preserve any existing values
        const previousSettings = { ...currentSettings };
        currentSettings = { ...DEFAULT_SETTINGS, ...currentSettings, ...settings };

        // Save to localStorage
        localStorage.setItem(STORAGE_KEYS.CHART_SETTINGS, JSON.stringify(currentSettings));

        // Log settings change for debugging
        console.log('Settings updated:', {
            previous: previousSettings,
            current: currentSettings,
            changed: settings
        });

        // Dispatch settings changed event immediately
        dispatchSettingsAppliedEvent(currentSettings);

        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        return false;
    }
}

/**
 * Get current settings (returns a copy to prevent mutation)
 * @returns {object} Current settings object
 */
export function getSettings() {
    return { ...currentSettings };
}

/**
 * Reset settings to defaults and clear localStorage
 * @returns {object} Default settings object
 */
export function resetSettings() {
    currentSettings = { ...DEFAULT_SETTINGS };

    try {
        localStorage.removeItem(STORAGE_KEYS.CHART_SETTINGS);
    } catch (error) {
        console.warn('Failed to clear settings from localStorage:', error);
    }

    dispatchSettingsAppliedEvent(currentSettings);

    return currentSettings;
}

/**
 * Helper function to dispatch settings applied event
 * @param {object} settings - Settings to include in event
 */
function dispatchSettingsAppliedEvent(settings) {
    document.dispatchEvent(new CustomEvent('settingsApplied', {
        detail: settings,
        bubbles: true
    }));
}

// ...removed chart settings application utilities (not needed for time-only settings)...

/**
 * Settings system initialization and event handling
 */

/**
 * Set up event listeners for settings system
 */
function setupSettingsEventListeners() {
    // Listen for settings changes from popup
    document.addEventListener('settingsChanged', (event) => {
        const newSettings = event.detail;
        if (saveSettings(newSettings)) {
            console.log('Settings saved and applied:', newSettings);
        }
    });

    // Listen for settings applied event to update charts
    document.addEventListener('settingsApplied', (event) => {
        console.log('Settings applied event received:', event.detail);
        // This will be handled by the main chart application
        // The event bubbles up so chart application can listen to it
    });
}

/**
 * Initialize settings system
 * @returns {object} Loaded settings
 */
export function initializeSettings() {
    // Load saved settings first
    const settings = loadSettings();

    // Set up event listeners
    setupSettingsEventListeners();

    // Auto-apply settings on page load
    setTimeout(() => {
        dispatchSettingsAppliedEvent(settings);
    }, 100);

    return settings;
}

/**
 * Global API exports for settings management
 */

// Export API for global access (time-only)
window.chartSettings = {
    load: loadSettings,
    save: saveSettings,
    get: getSettings,
    reset: resetSettings,
    init: initializeSettings,
    TIME_FORMATS
};

/**
 * Settings popup utilities
 */

/**
 * Create settings popup HTML content
 * @param {object} settings - Current settings
 * @returns {string} HTML content
 */
function createSettingsPopupHTML(settings) {
    return `
        <div class="settings-header">
            <h3>Chart Settings</h3>
            <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="settings-content">
            <div class="settings-layout">
                <div class="settings-categories">
                    <div class="category-item active" data-category="time">
                        <span class="category-icon">🕐</span>
                        <span class="category-label">Time Settings</span>
                    </div>
                </div>
                <div class="settings-panel">
                    <div class="panel-content" data-panel="time">
                        ${createTimezoneSettingGroup(settings)}
                        ${createTimeFormatSettingGroup(settings)}
                    </div>
                </div>
            </div>
        </div>
        <div class="settings-footer">
            <button class="apply-btn" onclick="applySettingsFromPopup()">Apply</button>
        </div>
    `;
}

/**
 * Create theme setting group HTML
 * @param {object} settings - Current settings
 * @returns {string} HTML content
 */
function createThemeSettingGroup(settings) {
    return `
        // ...removed unused create*SettingGroup functions...
                <span class="checkmark"></span>
                Show Legend
            </label>
            <div class="legend-options" style="margin-left: 24px; margin-top: 8px; ${legendOptionsStyle}">
                <label class="checkbox-wrapper" style="margin-bottom: 4px;">
                    <input type="checkbox" id="legend-symbol-toggle" ${settings.legendShowSymbol !== false ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    Show Symbol
                </label>
                <label class="checkbox-wrapper" style="margin-bottom: 4px;">
                    <input type="checkbox" id="legend-ohlc-toggle" ${settings.legendShowOHLC !== false ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    Show OHLC Values
                </label>
                <label class="checkbox-wrapper">
                    <input type="checkbox" id="legend-time-toggle" ${settings.legendShowTime !== false ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    Show Time
                </label>
            </div>
        </div>
    `;
}

/**
 * Create timezone setting group HTML
 * @param {object} settings - Current settings
 * @returns {string} HTML content
 */
function createTimezoneSettingGroup(settings) {
    const timezones = [
        { value: 'UTC', label: 'UTC' },
        { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
        { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
        { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
        { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' }
    ];

    const options = timezones.map(tz =>
        `<option value="${tz.value}" ${settings.timezone === tz.value ? 'selected' : ''}>${tz.label}</option>`
    ).join('');

    return `
        <div class="setting-group">
            <label>Timezone</label>
            <select id="timezone-selector">
                ${options}
            </select>
        </div>
    `;
}

/**
 * Create time format setting group HTML
 * @param {object} settings - Current settings
 * @returns {string} HTML content
 */
function createTimeFormatSettingGroup(settings) {
    return `
        <div class="setting-group">
            <label>Time Format</label>
            <select id="time-format-selector">
                <option value="${TIME_FORMATS.HOUR_24}" ${settings.timeFormat === TIME_FORMATS.HOUR_24 ? 'selected' : ''}>24 Hour (14:30)</option>
                <option value="${TIME_FORMATS.HOUR_12}" ${settings.timeFormat === TIME_FORMATS.HOUR_12 ? 'selected' : ''}>12 Hour (2:30 PM)</option>
            </select>
        </div>
    `;
}

/**
 * Position settings popup near settings button
 * @param {HTMLElement} popup - Popup element
 */
function positionSettingsPopup(popup) {
    // Center the popup on the page
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
}

/**
 * Set up legend toggle interaction
 * @param {HTMLElement} popup - Popup element
 */
// ...removed setupLegendToggleInteraction (not needed)...

/**
 * Set up click outside to close functionality
 * @param {HTMLElement} popup - Popup element
 */
function setupClickOutsideToClose(popup) {
    const settingsBtn = document.getElementById('settings-btn');

    setTimeout(() => {
        document.addEventListener('click', function closePopup(e) {
            if (!popup.contains(e.target) && !settingsBtn?.contains(e.target)) {
                popup.remove();
                document.removeEventListener('click', closePopup);
            }
        });
    }, 100);
}

/**
 * Show settings popup dialog
 */
export function showSettingsPopup() {
    // Remove existing popup and backdrop if any
    const existingPopup = document.getElementById('settings-popup');
    const existingBackdrop = document.getElementById('settings-backdrop');
    if (existingPopup) {
        existingPopup.remove();
        existingBackdrop?.remove();
        return;
    }

    // Get current settings (reload from localStorage to ensure freshness)
    loadSettings();
    const settings = getSettings();
    console.log('Showing settings popup with current settings:', settings);

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'settings-backdrop';
    backdrop.className = 'settings-backdrop';

    // Create settings popup
    const popup = document.createElement('div');
    popup.id = 'settings-popup';
    popup.className = 'settings-popup';
    popup.innerHTML = createSettingsPopupHTML(settings);

    document.body.appendChild(backdrop);
    document.body.appendChild(popup);

    // Position popup at center
    positionSettingsPopup(popup);

    // Add animation
    setTimeout(() => {
        backdrop.classList.add('visible');
        popup.classList.add('visible');
    }, 10);

    // Close on backdrop click
    backdrop.addEventListener('click', () => {
        popup.remove();
        backdrop.remove();
    });

    // Update close button to also remove backdrop
    const closeBtn = popup.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = () => {
            popup.remove();
            backdrop.remove();
        };
    }
}

// Function to apply settings from popup
window.applySettingsFromPopup = function () {
    const newSettings = {
        timezone: document.getElementById('timezone-selector').value,
        timeFormat: document.getElementById('time-format-selector').value
    };
    if (saveSettings(newSettings)) {
        console.log('Settings saved:', newSettings);
    }
    document.getElementById('settings-popup').remove();
    document.getElementById('settings-backdrop')?.remove();
};

// Inject settings-related CSS styles
export function injectSettingsStyles() {
    const style = document.createElement('style');
    style.id = 'settings-styles';
    style.innerHTML = `
        /* Settings Backdrop */
        .settings-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s ease;
            pointer-events: none;
        }
        
        .settings-backdrop.visible {
            opacity: 1;
            pointer-events: auto;
        }
        
        /* Settings Popup Styles */
        .settings-popup {
            position: fixed;
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            z-index: 1001;
            min-width: 600px;
            max-width: 800px;
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
            transition: all 0.2s ease;
            pointer-events: none;
        }
        
        .settings-popup.visible {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            pointer-events: auto;
        }
        
        .settings-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid var(--border-color);
            background: var(--bg-element);
            border-top-left-radius: 6px;
            border-top-right-radius: 6px;
        }
        
        .settings-header h3 {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--text-primary);
        }
        
        .close-btn {
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 3px;
            transition: all 0.15s ease;
        }
        
        .close-btn:hover {
            background: var(--bg-hover);
            color: var(--text-primary);
        }
        
        .settings-content {
            padding: 0;
            max-height: 500px;
            overflow: hidden;
        }
        
        .settings-layout {
            display: flex;
            min-height: 400px;
        }
        
        /* Left Column - Categories */
        .settings-categories {
            width: 200px;
            background: var(--bg-element);
            border-right: 1px solid var(--border-color);
            padding: 12px 0;
        }
        
        .category-item {
            display: flex;
            align-items: center;
            padding: 12px 16px;
            cursor: pointer;
            transition: all 0.15s ease;
            border-left: 3px solid transparent;
        }
        
        .category-item:hover {
            background: var(--bg-hover);
        }
        
        .category-item.active {
            background: var(--bg-secondary);
            border-left-color: var(--accent-blue);
        }
        
        .category-icon {
            font-size: 18px;
            margin-right: 10px;
        }
        
        .category-label {
            font-size: 13px;
            font-weight: 500;
            color: var(--text-primary);
        }
        
        /* Right Column - Settings Panel */
        .settings-panel {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
        }
        
        .panel-content {
            display: block;
        }
        
        .setting-group {
            margin-bottom: 20px;
        }
        
        .setting-group:last-child {
            margin-bottom: 0;
        }
        
        .setting-group > label:first-child {
            display: block;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 8px;
        }
        
        .setting-group select {
            width: 100%;
            background: var(--bg-element);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            color: var(--text-primary);
            padding: 8px 12px;
            font-size: 13px;
            outline: none;
            transition: border-color 0.15s ease;
        }
        
        .setting-group select:focus {
            border-color: var(--accent-blue);
        }
        
        .checkbox-wrapper {
            display: flex;
            align-items: center;
            cursor: pointer;
            font-size: 13px;
            color: var(--text-primary);
        }
        
        .checkbox-wrapper input[type="checkbox"] {
            display: none;
        }
        
        .checkmark {
            width: 18px;
            height: 18px;
            background: var(--bg-element);
            border: 1px solid var(--border-color);
            border-radius: 2px;
            margin-right: 10px;
            position: relative;
            transition: all 0.15s ease;
        }
        
        .checkbox-wrapper input[type="checkbox"]:checked + .checkmark {
            background: var(--accent-blue);
            border-color: var(--accent-blue);
        }
        
        .checkbox-wrapper input[type="checkbox"]:checked + .checkmark:after {
            content: "✓";
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 11px;
            font-weight: bold;
        }
        
        .settings-footer {
            display: flex;
            justify-content: flex-end;
            padding: 16px 20px;
            border-top: 1px solid var(--border-color);
            background: var(--bg-element);
            border-bottom-left-radius: 6px;
            border-bottom-right-radius: 6px;
        }
        
        .apply-btn {
            background: var(--accent-blue);
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 20px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.15s ease;
        }
        
        .apply-btn:hover {
            background: #1e53e5;
        }
        
        /* Legend Options Styling */
        .legend-options {
            transition: all 0.2s ease;
        }
        
        .legend-options .checkbox-wrapper {
            font-size: 12px;
            color: var(--text-secondary);
        }
        
        .legend-options .checkmark {
            width: 16px;
            height: 16px;
            margin-right: 8px;
        }
    `;

    document.head.appendChild(style);
}
