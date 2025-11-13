// Dashboard JavaScript
class BirthdayDashboard {
    constructor() {
        this.birthdays = [];
        
        // Check if user is authenticated
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        // User-specific key for birthdays
        this.userKey = `birthdays_${this.currentUser.email}`;
        // Backend API URL - change this to your actual backend URL
        // For now, we'll use localStorage only
        this.apiUrl = null; // Set to null to use localStorage only
        
        // Edit mode tracking
        this.editingBirthdayId = null;
        
        // Geo-fencing properties
        this.geofencingEnabled = false;
        this.currentLocation = null;
        this.geofences = [];
        this.locationWatcher = null;
        this.geofenceRadius = 1000; // Default 1km radius in meters
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.loadUserData();
        await this.loadBirthdaysFromAPI();
        this.loadGeofencingSettings();
        this.updateStats();
        this.loadUpcomingBirthdays();
        this.updateNotificationBadge();
        await this.requestNotificationPermission(); // Request notification permission
        this.checkBirthdaysToday(); // Check for birthdays today and show WhatsApp popup/notification
        console.log('Dashboard initialized successfully!');
    }

    setupEventListeners() {
        // Mobile menu toggle
        this.setupMobileMenu();

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            // Support both click and touch events for better mobile responsiveness
            const handleNav = (e) => {
                e.preventDefault();
                this.navigateToSection(item.dataset.section);
                // Close mobile menu after navigation
                this.closeMobileMenu();
            };
            item.addEventListener('click', handleNav);
            item.addEventListener('touchend', handleNav);
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
            logoutBtn.addEventListener('touchend', () => {
                this.logout();
            });
        }

        // Add birthday form
        const addBirthdayForm = document.getElementById('addBirthdayForm');
        if (addBirthdayForm) {
            addBirthdayForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addBirthday();
            });
        }

        // Notification bell
        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) {
            notificationBell.addEventListener('click', () => {
                this.showNotifications();
            });
            notificationBell.addEventListener('touchend', () => {
                this.showNotifications();
            });
        }

        // Birthday photo upload
        this.setupPhotoUpload();

        // Geo-fencing settings
        this.setupGeofencingEventListeners();

        // Notification settings
        this.setupNotificationEventListeners();
    }

    setupMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');

        if (!mobileMenuToggle || !sidebar || !overlay) return;

        // Toggle menu
        const toggleMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        };

        // Close menu
        const closeMenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        };

        // Open/close menu
        mobileMenuToggle.addEventListener('click', toggleMenu);
        mobileMenuToggle.addEventListener('touchend', (e) => {
            e.preventDefault();
            toggleMenu(e);
        });

        // Close on overlay click
        overlay.addEventListener('click', closeMenu);
        overlay.addEventListener('touchend', closeMenu);

        // Close on window resize (if resizing to desktop)
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    closeMobileMenu() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        if (sidebar && overlay) {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    setupNotificationEventListeners() {
        // Browser notifications toggle
        const browserNotificationsToggle = document.getElementById('browserNotifications');
        if (browserNotificationsToggle) {
            browserNotificationsToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                localStorage.setItem('browserNotificationsEnabled', enabled);
                this.updateNotificationStatus();
                
                if (enabled && Notification.permission === 'default') {
                    this.requestNotificationPermission();
                }
            });
        }

        // Request permission button
        const requestBtn = document.getElementById('requestNotificationPermissionBtn');
        if (requestBtn) {
            requestBtn.addEventListener('click', async () => {
                await this.requestNotificationPermission();
                this.updateNotificationStatus();
            });
        }

        // Update notification status on load
        this.updateNotificationStatus();
    }

    updateNotificationStatus() {
        const statusDiv = document.getElementById('notificationStatus');
        const requestBtn = document.getElementById('requestNotificationPermissionBtn');
        const browserNotificationsToggle = document.getElementById('browserNotifications');
        
        if (!statusDiv) return;

        const permission = Notification.permission;
        // Load saved preference (default to true if not set)
        const savedPreference = localStorage.getItem('browserNotificationsEnabled');
        const enabledPreference = savedPreference === null ? true : savedPreference === 'true';

        if (!('Notification' in window)) {
            statusDiv.innerHTML = '<span style="color: #dc3545;">❌ Browser does not support notifications</span>';
            if (requestBtn) requestBtn.style.display = 'none';
            if (browserNotificationsToggle) browserNotificationsToggle.checked = false;
            return;
        }

        if (permission === 'granted') {
            statusDiv.innerHTML = '<span style="color: #28a745;">✅ Notifications enabled - You will receive birthday alerts</span>';
            if (requestBtn) requestBtn.style.display = 'none';
            if (browserNotificationsToggle) browserNotificationsToggle.checked = enabledPreference;
        } else if (permission === 'denied') {
            statusDiv.innerHTML = '<span style="color: #dc3545;">❌ Notifications blocked - Please enable in browser settings</span>';
            if (requestBtn) requestBtn.style.display = 'block';
            if (browserNotificationsToggle) browserNotificationsToggle.checked = false;
        } else {
            statusDiv.innerHTML = '<span style="color: #ffa500;">⚠️ Click the button below to enable notifications</span>';
            if (requestBtn) requestBtn.style.display = 'block';
            if (browserNotificationsToggle) browserNotificationsToggle.checked = enabledPreference;
        }
    }

    setupGeofencingEventListeners() {
        // Geo-fencing toggle
        const geofencingToggle = document.getElementById('geofencingToggle');
        if (geofencingToggle) {
            console.log('Setting up geofencing toggle event listener');
            geofencingToggle.addEventListener('change', (e) => {
                console.log('Geofencing toggle changed to:', e.target.checked);
                this.toggleGeofencing(e.target.checked);
            });
        } else {
            console.error('Geofencing toggle not found!');
        }

        // Background location toggle
        const backgroundLocationToggle = document.getElementById('backgroundLocation');
        if (backgroundLocationToggle) {
            backgroundLocationToggle.addEventListener('change', (e) => {
                this.toggleBackgroundLocation(e.target.checked);
            });
        }

        // Share location toggle
        const shareLocationToggle = document.getElementById('shareLocation');
        if (shareLocationToggle) {
            shareLocationToggle.addEventListener('change', (e) => {
                this.toggleLocationSharing(e.target.checked);
            });
        }
    }

    loadGeofencingSettings() {
        // Load geo-fencing settings from localStorage
        const settings = JSON.parse(localStorage.getItem(`geofencing_${this.currentUser.email}`)) || {
            enabled: false,
            backgroundLocation: false,
            shareLocation: false,
            geofences: [],
            radius: 1000
        };

        this.geofencingEnabled = settings.enabled;
        this.geofences = settings.geofences;
        this.geofenceRadius = settings.radius;

        // Update UI toggles
        const geofencingToggle = document.getElementById('geofencingToggle');
        const backgroundLocationToggle = document.getElementById('backgroundLocation');
        const shareLocationToggle = document.getElementById('shareLocation');
        
        if (geofencingToggle) {
            geofencingToggle.checked = this.geofencingEnabled;
            console.log('Geofencing toggle set to:', this.geofencingEnabled);
        }
        if (backgroundLocationToggle) backgroundLocationToggle.checked = settings.backgroundLocation;
        if (shareLocationToggle) shareLocationToggle.checked = settings.shareLocation;

        // Update location status
        this.updateLocationStatus();

        // Start geo-fencing if enabled
        if (this.geofencingEnabled) {
            console.log('Starting geo-fencing from saved settings');
            this.startGeofencing();
        }
    }

    saveGeofencingSettings() {
        const settings = {
            enabled: this.geofencingEnabled,
            backgroundLocation: document.getElementById('backgroundLocation')?.checked || false,
            shareLocation: document.getElementById('shareLocation')?.checked || false,
            geofences: this.geofences,
            radius: this.geofenceRadius
        };

        localStorage.setItem(`geofencing_${this.currentUser.email}`, JSON.stringify(settings));
        console.log('Geofencing settings saved to localStorage:', settings);
    }

    async toggleGeofencing(enabled) {
        console.log('Toggle geo-fencing called with:', enabled);
        this.geofencingEnabled = enabled;
        
        if (enabled) {
            const permission = await this.requestLocationPermission();
            if (permission === 'granted') {
                this.startGeofencing();
                this.showMessage('Geo-fencing enabled! Location tracking started.', 'success');
            } else {
                this.geofencingEnabled = false;
                const geofencingToggle = document.getElementById('geofencingToggle');
                if (geofencingToggle) geofencingToggle.checked = false;
                
                // Show detailed help for enabling location
                this.showLocationHelp();
                this.saveGeofencingSettings();
                this.updateLocationStatus();
                return;
            }
        } else {
            this.stopGeofencing();
            this.showMessage('Geo-fencing disabled.', 'info');
        }

        this.saveGeofencingSettings();
        this.updateLocationStatus();
        console.log('Geo-fencing settings saved. Enabled:', this.geofencingEnabled);
    }

    showLocationHelp() {
        const helpMessage = `
            <div style="text-align: left; line-height: 1.5;">
                <h4 style="margin: 0 0 10px 0;">How to Enable Location Access:</h4>
                <p><strong>Chrome/Edge:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Click the lock icon in the address bar</li>
                    <li>Change "Location" to "Allow"</li>
                    <li>Refresh the page</li>
                </ul>
                <p><strong>Firefox:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Click the shield icon in the address bar</li>
                    <li>Click "Site Permissions" → "Location"</li>
                    <li>Select "Allow" and refresh</li>
                </ul>
                <p><strong>Safari:</strong></p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Safari → Preferences → Websites → Location</li>
                    <li>Set this website to "Allow"</li>
                </ul>
                <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
                    After enabling, try toggling geo-fencing again.
                </p>
            </div>
        `;
        
        // Create a modal-like help dialog
        const helpDialog = document.createElement('div');
        helpDialog.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10001;
            max-width: 400px;
            max-height: 80vh;
            overflow-y: auto;
            border: 1px solid #ddd;
        `;
        
        helpDialog.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="margin: 0; color: #333;">Location Permission Required</h3>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
            </div>
            ${helpMessage}
            <div style="margin-top: 20px; text-align: center;">
                <button onclick="this.parentElement.parentElement.remove(); dashboard.retryLocationPermission();" 
                        style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer;">
                    Try Again
                </button>
            </div>
        `;
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
        `;
        overlay.onclick = () => {
            overlay.remove();
            helpDialog.remove();
        };
        
        document.body.appendChild(overlay);
        document.body.appendChild(helpDialog);
    }

    async retryLocationPermission() {
        this.showMessage('Requesting location permission...', 'info');
        const permission = await this.requestLocationPermission();
        if (permission === 'granted') {
            this.geofencingEnabled = true;
            const geofencingToggle = document.getElementById('geofencingToggle');
            if (geofencingToggle) geofencingToggle.checked = true;
            this.startGeofencing();
            this.saveGeofencingSettings();
            this.updateLocationStatus();
            this.showMessage('Location permission granted! Geo-fencing enabled.', 'success');
        }
    }

    toggleBackgroundLocation(enabled) {
        if (enabled && !this.geofencingEnabled) {
            this.showMessage('Please enable geo-fencing first to use background location.', 'error');
            const backgroundLocationToggle = document.getElementById('backgroundLocation');
            if (backgroundLocationToggle) backgroundLocationToggle.checked = false;
            return;
        }

        this.saveGeofencingSettings();
        this.showMessage(`Background location ${enabled ? 'enabled' : 'disabled'}.`, 'info');
    }

    toggleLocationSharing(enabled) {
        this.saveGeofencingSettings();
        this.showMessage(`Location sharing ${enabled ? 'enabled' : 'disabled'}.`, 'info');
    }

    async requestLocationPermission() {
        // Check if running on HTTPS (required for geolocation)
        if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            this.showMessage('Geolocation requires HTTPS. Please access this website via HTTPS.', 'error');
            return 'denied';
        }

        if (!navigator.geolocation) {
            this.showMessage('Geolocation is not supported by this browser.', 'error');
            return 'denied';
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                () => resolve('granted'),
                (error) => {
                    console.error('Location permission error:', error);
                    let errorMessage = 'Location permission denied.';
                    
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is unavailable. Please check your device settings.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please try again.';
                            break;
                        default:
                            errorMessage = 'An unknown error occurred while getting location.';
                    }
                    
                    this.showMessage(errorMessage, 'error');
                    resolve('denied');
                },
                { 
                    timeout: 15000, 
                    enableHighAccuracy: true,
                    maximumAge: 60000 // 1 minute
                }
            );
        });
    }

    startGeofencing() {
        if (!navigator.geolocation) {
            this.showMessage('Geolocation is not supported by this browser.', 'error');
            return;
        }

        // Get initial location
        this.getCurrentLocation();

        // Start watching location
        this.locationWatcher = navigator.geolocation.watchPosition(
            (position) => {
                // Only update if location has changed significantly (more than 10 meters)
                const newLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp
                };

                if (!this.currentLocation || this.hasLocationChangedSignificantly(newLocation)) {
                    this.currentLocation = newLocation;
                    this.checkGeofences();
                    this.updateLocationStatus();
                }
            },
            (error) => {
                console.error('Location error:', error);
                this.showMessage('Unable to get your location. Please check your settings.', 'error');
            },
            {
                enableHighAccuracy: false, // Use lower accuracy for stability
                timeout: 10000,
                maximumAge: 60000 // 1 minute - update less frequently
            }
        );

        console.log('Geo-fencing started');
    }

    stopGeofencing() {
        if (this.locationWatcher) {
            navigator.geolocation.clearWatch(this.locationWatcher);
            this.locationWatcher = null;
        }
        this.currentLocation = null;
        this.updateLocationStatus();
        console.log('Geo-fencing stopped');
    }

    async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };
                    this.updateLocationStatus();
                    resolve(this.currentLocation);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000
                }
            );
        });
    }

    checkGeofences() {
        if (!this.currentLocation || this.geofences.length === 0) return;

        this.geofences.forEach(geofence => {
            const distance = this.calculateDistance(
                this.currentLocation.latitude,
                this.currentLocation.longitude,
                geofence.latitude,
                geofence.longitude
            );

            if (distance <= this.geofenceRadius / 1000) { // Convert to km
                this.triggerGeofenceAlert(geofence, distance);
            }
        });

        // Only update the geofence list if the settings page is currently open
        const settingsSection = document.getElementById('settings');
        if (settingsSection && settingsSection.classList.contains('active')) {
            this.updateGeofenceListDistances();
        }
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in kilometers
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // Distance in kilometers
        return distance;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    hasLocationChangedSignificantly(newLocation) {
        if (!this.currentLocation) return true;
        
        // Calculate distance between old and new location
        const distance = this.calculateDistance(
            this.currentLocation.latitude,
            this.currentLocation.longitude,
            newLocation.latitude,
            newLocation.longitude
        );
        
        // Only consider it changed if moved more than 10 meters
        return distance > 0.01; // 0.01 km = 10 meters
    }

    triggerGeofenceAlert(geofence, distance) {
        const message = `You're near ${geofence.name}! (${distance.toFixed(2)} km away)`;
        this.showMessage(message, 'info');
        
        // Check if there are any birthdays in this area
        this.checkBirthdaysInArea(geofence, distance);
    }

    checkBirthdaysInArea(geofence, distance) {
        // This would typically check against a database of birthday locations
        // For now, we'll just show a generic message
        if (distance < 0.5) { // Within 500m
            this.showMessage('You might be near someone\'s birthday location!', 'success');
        }
    }

    updateLocationStatus() {
        const locationStatus = document.querySelector('.stat-card:nth-child(4) .stat-number');
        if (locationStatus) {
            if (this.geofencingEnabled && this.currentLocation) {
                locationStatus.textContent = 'Active';
                locationStatus.style.color = '#28a745';
            } else if (this.geofencingEnabled) {
                locationStatus.textContent = 'Loading...';
                locationStatus.style.color = '#ffa500';
            } else {
                locationStatus.textContent = 'Inactive';
                locationStatus.style.color = '#dc3545';
            }
        }
        
        // Also update the toggle state to ensure UI consistency
        const geofencingToggle = document.getElementById('geofencingToggle');
        if (geofencingToggle && geofencingToggle.checked !== this.geofencingEnabled) {
            geofencingToggle.checked = this.geofencingEnabled;
            console.log('Updated toggle state to match geofencingEnabled:', this.geofencingEnabled);
        }
    }

    addGeofence(name, latitude, longitude, radius = null) {
        const geofence = {
            id: Date.now().toString(),
            name: name,
            latitude: latitude,
            longitude: longitude,
            radius: radius || this.geofenceRadius,
            createdAt: new Date().toISOString()
        };

        this.geofences.push(geofence);
        this.saveGeofencingSettings();
        this.showMessage(`Geofence "${name}" added successfully!`, 'success');
    }

    removeGeofence(geofenceId) {
        this.geofences = this.geofences.filter(g => g.id !== geofenceId);
        this.saveGeofencingSettings();
        this.showMessage('Geofence removed successfully!', 'success');
    }

    getGeofences() {
        return this.geofences;
    }

    // Testing methods for laptop development
    simulateLocationChange() {
        if (!this.geofencingEnabled) {
            this.showMessage('Please enable geo-fencing first', 'error');
            return;
        }

        // Simulate moving to a different location (larger movement for testing)
        const newLat = this.currentLocation.latitude + (Math.random() - 0.5) * 0.02; // ±0.01 degrees (~1km)
        const newLng = this.currentLocation.longitude + (Math.random() - 0.5) * 0.02;
        
        this.currentLocation = {
            latitude: newLat,
            longitude: newLng,
            accuracy: this.currentLocation.accuracy,
            timestamp: Date.now()
        };

        this.checkGeofences();
        this.updateLocationStatus();
        
        // Only update distances if settings page is open
        const settingsSection = document.getElementById('settings');
        if (settingsSection && settingsSection.classList.contains('active')) {
            this.updateGeofenceListDistances();
        }
        
        this.showMessage(`Simulated move to: ${newLat.toFixed(6)}, ${newLng.toFixed(6)}`, 'info');
    }

    addTestGeofence() {
        if (!this.currentLocation) {
            this.showMessage('Please enable geo-fencing and get current location first', 'error');
            return;
        }

        // Add a test geofence near current location
        const testLat = this.currentLocation.latitude + (Math.random() - 0.5) * 0.002; // Very close
        const testLng = this.currentLocation.longitude + (Math.random() - 0.5) * 0.002;
        
        this.addGeofence(`Test Location ${this.geofences.length + 1}`, testLat, testLng, 500); // 500m radius
        this.loadGeofenceList();
        
        this.showMessage('Test geofence added! Try "Simulate Move" to test proximity alerts.', 'success');
    }

    showLocationInfo() {
        if (!this.currentLocation) {
            this.showMessage('No location data available. Enable geo-fencing first.', 'error');
            return;
        }

        const info = `
            📍 Current Location:
            Latitude: ${this.currentLocation.latitude.toFixed(6)}
            Longitude: ${this.currentLocation.longitude.toFixed(6)}
            Accuracy: ${this.currentLocation.accuracy ? this.currentLocation.accuracy.toFixed(1) + 'm' : 'Unknown'}
            Timestamp: ${new Date(this.currentLocation.timestamp).toLocaleTimeString()}
            
            🎯 Geofence Status:
            Total Geofences: ${this.geofences.length}
            Geofence Radius: ${this.geofenceRadius}m
            Tracking Enabled: ${this.geofencingEnabled ? 'Yes' : 'No'}
        `;

        alert(info);
    }

    updateGeofenceListDistances() {
        // Update distances without refreshing the entire list
        const geofenceItems = document.querySelectorAll('.geofence-item');
        
        geofenceItems.forEach((item, index) => {
            const geofence = this.geofences[index];
            if (!geofence || !this.currentLocation) return;

            const distance = this.calculateDistance(
                this.currentLocation.latitude,
                this.currentLocation.longitude,
                geofence.latitude,
                geofence.longitude
            );

            const isNearby = distance <= this.geofenceRadius / 1000;
            const distanceElement = item.querySelector('.geofence-info p:last-child');
            
            if (distanceElement) {
                // Only update if the distance has changed significantly (more than 10 meters)
                const currentText = distanceElement.textContent;
                const newDistanceText = `${distance.toFixed(2)} km`;
                
                if (!currentText.includes(newDistanceText)) {
                    distanceElement.innerHTML = `<span style="color: ${isNearby ? '#28a745' : '#666'}; font-weight: ${isNearby ? 'bold' : 'normal'};">Distance: ${newDistanceText} ${isNearby ? '📍 NEARBY!' : ''}</span>`;
                }
            }
        });
    }

    refreshSettingsUI() {
        // Refresh all toggle states to ensure they match the saved settings
        const geofencingToggle = document.getElementById('geofencingToggle');
        const backgroundLocationToggle = document.getElementById('backgroundLocation');
        const shareLocationToggle = document.getElementById('shareLocation');
        
        if (geofencingToggle) {
            geofencingToggle.checked = this.geofencingEnabled;
            console.log('Refreshed geofencing toggle to:', this.geofencingEnabled);
        }
        
        if (backgroundLocationToggle) {
            const settings = JSON.parse(localStorage.getItem(`geofencing_${this.currentUser.email}`)) || {};
            backgroundLocationToggle.checked = settings.backgroundLocation || false;
        }
        
        if (shareLocationToggle) {
            const settings = JSON.parse(localStorage.getItem(`geofencing_${this.currentUser.email}`)) || {};
            shareLocationToggle.checked = settings.shareLocation || false;
        }
        
        this.updateLocationStatus();
    }

    updateGeofenceRadius(radius) {
        this.geofenceRadius = parseInt(radius);
        this.saveGeofencingSettings();
        this.showMessage(`Geofence radius updated to ${radius}m`, 'success');
    }

    showAddGeofenceForm() {
        const name = prompt('Enter geofence name:');
        if (!name) return;

        const lat = prompt('Enter latitude (e.g., 40.7128):');
        if (!lat || isNaN(lat)) {
            this.showMessage('Invalid latitude', 'error');
            return;
        }

        const lng = prompt('Enter longitude (e.g., -74.0060):');
        if (!lng || isNaN(lng)) {
            this.showMessage('Invalid longitude', 'error');
            return;
        }

        this.addGeofence(name, parseFloat(lat), parseFloat(lng));
        this.loadGeofenceList();
    }

    async addCurrentLocationAsGeofence() {
        if (!this.geofencingEnabled) {
            this.showMessage('Please enable geo-fencing first', 'error');
            return;
        }

        if (!this.currentLocation) {
            this.showMessage('Getting your current location...', 'info');
            try {
                await this.getCurrentLocation();
            } catch (error) {
                this.showMessage('Unable to get current location', 'error');
                return;
            }
        }

        const name = prompt('Enter geofence name:');
        if (!name) return;

        this.addGeofence(name, this.currentLocation.latitude, this.currentLocation.longitude);
        this.loadGeofenceList();
    }

    loadGeofenceList() {
        const container = document.getElementById('geofenceList');
        if (!container) return;

        container.innerHTML = '';

        if (this.geofences.length === 0) {
            container.innerHTML += '<p class="no-geofences">No geofences added yet.</p>';
            return;
        }

        this.geofences.forEach(geofence => {
            const geofenceItem = document.createElement('div');
            geofenceItem.className = 'geofence-item';
            
            // Calculate distance to current location if available
            let distanceInfo = '';
            if (this.currentLocation) {
                const distance = this.calculateDistance(
                    this.currentLocation.latitude,
                    this.currentLocation.longitude,
                    geofence.latitude,
                    geofence.longitude
                );
                const isNearby = distance <= this.geofenceRadius / 1000;
                distanceInfo = `<p style="color: ${isNearby ? '#28a745' : '#666'}; font-weight: ${isNearby ? 'bold' : 'normal'};">Distance: ${distance.toFixed(2)} km ${isNearby ? '📍 NEARBY!' : ''}</p>`;
            }
            
            geofenceItem.innerHTML = `
                <div class="geofence-info">
                    <h4>${geofence.name}</h4>
                    <p>${geofence.latitude.toFixed(6)}, ${geofence.longitude.toFixed(6)}</p>
                    <p>Radius: ${geofence.radius}m</p>
                    ${distanceInfo}
                </div>
                <button class="remove-geofence-btn" onclick="dashboard.removeGeofence('${geofence.id}'); dashboard.loadGeofenceList();">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            container.appendChild(geofenceItem);
        });
    }

    loadUserData() {
        document.getElementById('userName').textContent = this.currentUser.name;
        document.getElementById('userEmail').textContent = this.currentUser.email;
        if (this.currentUser.imageUrl) {
            document.getElementById('userAvatar').src = this.currentUser.imageUrl;
        }
    }

    navigateToSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update page title and subtitle
        this.updatePageHeader(sectionName);

        // Close mobile menu after navigation
        this.closeMobileMenu();

        // Load geofence list when settings section is opened
        if (sectionName === 'settings') {
            this.loadGeofenceList();
            // Refresh settings to ensure UI is in sync
            this.refreshSettingsUI();
            // Update notification status
            this.updateNotificationStatus();
        }
        
        // Reset form when navigating to add-birthday section (unless editing)
        if (sectionName === 'add-birthday' && !this.editingBirthdayId) {
            this.resetForm();
        }
    }

    updatePageHeader(sectionName) {
        const titles = {
            'overview': {
                title: 'Dashboard Overview',
                subtitle: 'Welcome back! Here\'s what\'s happening with your birthdays.'
            },
            'birthdays': {
                title: 'My Birthdays',
                subtitle: 'Manage all your birthday contacts and reminders.'
            },
            'add-birthday': {
                title: 'Add Birthday',
                subtitle: 'Add a new birthday to your collection.'
            },
            'settings': {
                title: 'Settings',
                subtitle: 'Customize your birthday buddy experience.'
            }
        };

        const header = titles[sectionName];
        if (header) {
            document.getElementById('pageTitle').textContent = header.title;
            document.getElementById('pageSubtitle').textContent = header.subtitle;
        }
    }

    async loadBirthdaysFromAPI() {
        // If no API URL is set, use localStorage
        if (!this.apiUrl) {
            this.birthdays = JSON.parse(localStorage.getItem(this.userKey)) || [];
            this.loadBirthdays();
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/birthdays`);
            if (!response.ok) {
                throw new Error('Failed to fetch birthdays');
            }
            this.birthdays = await response.json();
            this.loadBirthdays();
        } catch (error) {
            console.error('Error loading birthdays:', error);
            this.showMessage('Failed to load birthdays. Using local data.', 'error');
            // Fallback to localStorage if API fails
            this.birthdays = JSON.parse(localStorage.getItem(this.userKey)) || [];
            this.loadBirthdays();
        }
    }

    async addBirthday() {
        const formData = {
            name: document.getElementById('personName').value,
            date: document.getElementById('birthDate').value,
            relationship: document.getElementById('relationship').value,
            phoneNumber: document.getElementById('phoneNumber').value.trim() || null,
            email: document.getElementById('email').value.trim() || null,
            notes: document.getElementById('notes').value,
            userId: this.currentUser.email || 'default'
        };

        if (!formData.name || !formData.date) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        // Handle photo upload
        const photoFile = document.getElementById('birthdayPhoto')?.files[0];
        if (photoFile) {
            formData.photoUrl = await this.uploadPhoto(photoFile);
        }

        // If no API URL is set, use localStorage directly
        if (!this.apiUrl) {
            // Always reload the latest list before adding/updating
            let currentList = JSON.parse(localStorage.getItem(this.userKey)) || [];
            
            // Check if we're editing an existing birthday
            if (this.editingBirthdayId) {
                // Update existing birthday
                const birthdayIndex = currentList.findIndex(b => (b._id || b.id) === this.editingBirthdayId);
                if (birthdayIndex !== -1) {
                    // Keep the original ID and preserve photo if not uploading new one
                    const existingBirthday = currentList[birthdayIndex];
                    const updatedBirthday = {
                        ...formData,
                        id: existingBirthday.id || existingBirthday._id,
                        _id: existingBirthday._id || existingBirthday.id,
                        photoUrl: photoFile ? formData.photoUrl : (existingBirthday.photoUrl || formData.photoUrl)
                    };
                    currentList[birthdayIndex] = updatedBirthday;
                    localStorage.setItem(this.userKey, JSON.stringify(currentList));
                    this.birthdays = JSON.parse(localStorage.getItem(this.userKey)) || [];
                    this.showMessage('Birthday updated successfully!', 'success');
                    this.editingBirthdayId = null; // Clear edit mode
                    this.resetForm();
                    this.loadBirthdays();
                    this.updateStats();
                    this.loadUpcomingBirthdays();
                    this.updateNotificationBadge();
                    
                    // Check if updated birthday date is today - if so, send notification
                    this.checkAndSendUpdatedBirthdayNotification(updatedBirthday);
                    
                    // Update notification badge to reflect changes
                    this.updateNotificationBadge();
                    
                    // If birthday has contact info (phone or email), show message sending popup after update
                    // This allows user to send message immediately after updating
                    if (updatedBirthday.phoneNumber || updatedBirthday.email) {
                        setTimeout(() => {
                            this.showBirthdayPopup(updatedBirthday);
                        }, 2500); // Show after the success message and notification
                    }
                    
                    // Navigate back to birthdays section
                    setTimeout(() => {
                        this.navigateToSection('birthdays');
                    }, 1500);
                    return;
                } else {
                    this.showMessage('Birthday not found to update.', 'error');
                    this.editingBirthdayId = null;
                    return;
                }
            }
            
            // Adding new birthday
            const newBirthday = {
                ...formData,
                id: Date.now().toString()
            };
            currentList.push(newBirthday);
            localStorage.setItem(this.userKey, JSON.stringify(currentList));
            // Immediately reload from localStorage to update UI
            this.birthdays = JSON.parse(localStorage.getItem(this.userKey)) || [];
            this.showMessage('Birthday added successfully!', 'success');
            this.resetForm();
            this.loadBirthdays();
            this.updateStats();
            this.loadUpcomingBirthdays();
            this.updateNotificationBadge();
            this.checkBirthdaysToday(); // Check if the newly added birthday is today
            // Navigate back to birthdays section
            setTimeout(() => {
                this.navigateToSection('birthdays');
            }, 1500);
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/birthdays`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Failed to add birthday');
            }

            const newBirthday = await response.json();
            this.birthdays.push(newBirthday);

            this.showMessage('Birthday added successfully!', 'success');
            this.resetForm();
            this.loadBirthdays();
            this.updateStats();
            this.loadUpcomingBirthdays();

            // Navigate back to birthdays section
            setTimeout(() => {
                this.navigateToSection('birthdays');
            }, 1500);
        } catch (error) {
            console.error('Error adding birthday:', error);
            this.showMessage('Backend not available. Using local storage instead.', 'info');
            
            // Fallback to localStorage
            const newBirthday = {
                ...formData,
                id: Date.now().toString()
            };
            this.birthdays.push(newBirthday);
            localStorage.setItem(this.userKey, JSON.stringify(this.birthdays));
            
            this.showMessage('Birthday added to local storage!', 'success');
            this.resetForm();
            this.loadBirthdays();
            this.updateStats();
            this.loadUpcomingBirthdays();
            this.updateNotificationBadge();

            // Navigate back to birthdays section
            setTimeout(() => {
                this.navigateToSection('birthdays');
            }, 1500);
        }
    }

    resetForm() {
        document.getElementById('addBirthdayForm').reset();
        
        // Reset photo preview
        const preview = document.getElementById('birthdayPhotoPreview');
        const uploadArea = document.getElementById('birthdayPhotoUpload');
        if (uploadArea) {
            const uploadContent = uploadArea.querySelector('.upload-content');
            if (preview) preview.style.display = 'none';
            if (uploadContent) uploadContent.style.display = 'block';
        }
        
        // Reset form title and button text
        const formTitle = document.querySelector('#add-birthday h2');
        if (formTitle) {
            formTitle.textContent = 'Add New Birthday';
        }
        
        const saveBtn = document.querySelector('#addBirthdayForm .save-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Save Birthday';
        }
        
        // Clear edit mode
        this.editingBirthdayId = null;
    }

    setupPhotoUpload() {
        const uploadArea = document.getElementById('birthdayPhotoUpload');
        const photoInput = document.getElementById('birthdayPhoto');
        const preview = document.getElementById('birthdayPhotoPreview');

        if (uploadArea && photoInput) {
            uploadArea.addEventListener('click', () => {
                photoInput.click();
            });

            photoInput.addEventListener('change', (e) => {
                this.handleBirthdayPhotoUpload(e.target.files[0]);
            });
        }
    }

    async uploadPhoto(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            reader.readAsDataURL(file);
        });
    }

    handleBirthdayPhotoUpload(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showMessage('Please select an image file.', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showMessage('Image size should be less than 5MB.', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('birthdayPhotoPreview');
            const uploadArea = document.getElementById('birthdayPhotoUpload');
            const uploadContent = uploadArea.querySelector('.upload-content');

            preview.src = e.target.result;
            preview.style.display = 'block';
            uploadContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    loadBirthdays() {
        const container = document.getElementById('allBirthdays');
        container.innerHTML = '';

        if (this.birthdays.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-birthday-cake"></i>
                    <h3>No birthdays yet</h3>
                    <p>Add your first birthday to get started!</p>
                    <button class="add-btn" onclick="dashboard.navigateToSection('add-birthday')">
                        <i class="fas fa-plus"></i>
                        Add Birthday
                    </button>
                </div>
            `;
            return;
        }

        this.birthdays.forEach(birthday => {
            const card = this.createBirthdayCard(birthday);
            container.appendChild(card);
        });
    }

    createBirthdayCard(birthday) {
        const card = document.createElement('div');
        card.className = 'birthday-card';
        
        const daysUntil = this.getDaysUntilBirthday(birthday.date);
        const isToday = daysUntil === 0;
        const isUpcoming = daysUntil <= 7 && daysUntil > 0;

        // Use photo if available, otherwise use initials
        const avatarContent = birthday.photoUrl ? 
            `<img src="${birthday.photoUrl}" alt="${birthday.name}" class="birthday-photo">` :
            `<span>${birthday.name.charAt(0).toUpperCase()}</span>`;

        card.innerHTML = `
            <div class="birthday-card-header">
                <div class="birthday-card-avatar ${birthday.photoUrl ? 'has-photo' : ''}">
                    ${avatarContent}
                </div>
                <div class="birthday-card-info">
                    <h3>${birthday.name}</h3>
                    <p>${birthday.relationship} • ${this.formatDate(birthday.date)}</p>
                    ${birthday.notes ? `<p class="notes">${birthday.notes}</p>` : ''}
                </div>
            </div>
            <div class="birthday-status ${isToday ? 'today' : isUpcoming ? 'upcoming' : ''}">
                ${isToday ? '<span class="badge today">Today!</span>' : 
                  isUpcoming ? `<span class="badge upcoming">${daysUntil} days</span>` : 
                  `<span class="badge">${daysUntil} days</span>`}
            </div>
            <div class="birthday-card-actions">
                <button class="action-btn edit" onclick="dashboard.editBirthday('${birthday._id || birthday.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete" onclick="dashboard.deleteBirthday('${birthday._id || birthday.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return card;
    }

    loadUpcomingBirthdays() {
        const container = document.getElementById('upcomingBirthdays');
        const upcoming = this.birthdays
            .map(birthday => ({
                ...birthday,
                daysUntil: this.getDaysUntilBirthday(birthday.date)
            }))
            .filter(birthday => birthday.daysUntil <= 30)
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5);

        container.innerHTML = '';

        if (upcoming.length === 0) {
            container.innerHTML = '<p class="no-upcoming">No upcoming birthdays in the next 30 days.</p>';
            return;
        }

        upcoming.forEach(birthday => {
            const item = document.createElement('div');
            item.className = 'birthday-item';
            
            const isToday = birthday.daysUntil === 0;
            
            item.innerHTML = `
                <div class="birthday-avatar">
                    ${birthday.name.charAt(0).toUpperCase()}
                </div>
                <div class="birthday-info">
                    <h4>${birthday.name}</h4>
                    <p>${birthday.relationship}</p>
                </div>
                <div class="birthday-date">
                    <div class="date">${this.formatDate(birthday.date)}</div>
                    <div class="days-left">
                        ${isToday ? 'Today!' : `${birthday.daysUntil} days left`}
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }

    updateStats() {
        const totalContacts = this.birthdays.length;
        const thisMonth = this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const now = new Date();
            return birthDate.getMonth() === now.getMonth();
        }).length;

        const nextBirthday = this.birthdays
            .map(birthday => ({
                ...birthday,
                daysUntil: this.getDaysUntilBirthday(birthday.date)
            }))
            .filter(birthday => birthday.daysUntil > 0)
            .sort((a, b) => a.daysUntil - b.daysUntil)[0];

        const nextBirthdayText = nextBirthday ? `${nextBirthday.daysUntil} days` : 'None';

        // Update stats
        document.querySelector('.stat-card:nth-child(1) .stat-number').textContent = totalContacts;
        document.querySelector('.stat-card:nth-child(2) .stat-number').textContent = thisMonth;
        document.querySelector('.stat-card:nth-child(3) .stat-number').textContent = nextBirthdayText;
    }

    getDaysUntilBirthday(birthDate) {
        const today = new Date();
        const birthday = new Date(birthDate);
        
        // Set this year's birthday
        const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
        
        // If this year's birthday has passed, calculate for next year
        if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(today.getFullYear() + 1);
        }
        
        const diffTime = thisYearBirthday - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
        });
    }

    editBirthday(id) {
        const birthday = this.birthdays.find(b => (b._id || b.id) === id);
        if (!birthday) {
            this.showMessage('Birthday not found.', 'error');
            return;
        }

        // Store the birthday ID being edited
        this.editingBirthdayId = id;

        // Navigate to add-birthday section
        this.navigateToSection('add-birthday');

        // Populate form with birthday data
        document.getElementById('personName').value = birthday.name || '';
        document.getElementById('birthDate').value = birthday.date || '';
        document.getElementById('relationship').value = birthday.relationship || 'friend';
        document.getElementById('phoneNumber').value = birthday.phoneNumber || '';
        document.getElementById('email').value = birthday.email || '';
        document.getElementById('notes').value = birthday.notes || '';

        // Update form title and button text
        const formTitle = document.querySelector('#add-birthday h2');
        if (formTitle) {
            formTitle.textContent = 'Edit Birthday';
        }

        const saveBtn = document.querySelector('#addBirthdayForm .save-btn');
        if (saveBtn) {
            saveBtn.textContent = 'Update Birthday';
        }

        // Scroll to top of form
        const formContainer = document.querySelector('.form-container');
        if (formContainer) {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        this.showMessage(`Editing ${birthday.name}'s birthday...`, 'info');
    }

    async deleteBirthday(id) {
        if (confirm('Are you sure you want to delete this birthday?')) {
            // If no API URL is set, use localStorage directly
            if (!this.apiUrl) {
                let currentList = JSON.parse(localStorage.getItem(this.userKey)) || [];
                currentList = currentList.filter(b => (b._id || b.id) !== id);
                localStorage.setItem(this.userKey, JSON.stringify(currentList));
                // Immediately reload from localStorage to update UI
                this.birthdays = JSON.parse(localStorage.getItem(this.userKey)) || [];
                this.showMessage('Birthday deleted successfully!', 'success');
                this.loadBirthdays();
                this.updateStats();
                this.loadUpcomingBirthdays();
                this.updateNotificationBadge();
                return;
            }

            try {
                const response = await fetch(`${this.apiUrl}/birthdays/${id}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete birthday');
                }

                this.birthdays = this.birthdays.filter(b => (b._id || b.id) !== id);
                
                this.showMessage('Birthday deleted successfully!', 'success');
                this.loadBirthdays();
                this.updateStats();
                this.loadUpcomingBirthdays();
            } catch (error) {
                console.error('Error deleting birthday:', error);
                this.showMessage('Backend not available. Deleting from local storage.', 'info');
                
                // Fallback to localStorage
                this.birthdays = this.birthdays.filter(b => (b._id || b.id) !== id);
                localStorage.setItem(this.userKey, JSON.stringify(this.birthdays));
                
                this.showMessage('Birthday deleted from local storage!', 'success');
                this.loadBirthdays();
                this.updateStats();
                this.loadUpcomingBirthdays();
                this.updateNotificationBadge();
            }
        }
    }

    showNotifications() {
        console.log('=== showNotifications called ===');
        
        // Refresh birthdays list to ensure we have the latest data
        this.birthdays = JSON.parse(localStorage.getItem(this.userKey)) || [];
        console.log('Refreshed birthdays count:', this.birthdays.length);
        
        // Get dynamic notifications based on current data
        const notifications = this.getDynamicNotifications();
        
        console.log('Showing notifications. Count:', notifications.length);
        console.log('Notifications:', notifications);
        
        // Always update the badge to match the actual notifications
        this.updateNotificationBadge();
        
        if (notifications.length === 0) {
            this.showMessage('No new notifications at the moment.', 'info');
            return;
        }

        // Remove any existing notification modal first
        const existingModal = document.querySelector('.notification-overlay');
        if (existingModal) {
            console.log('Removing existing notification modal');
            existingModal.remove();
        }

        // Create a better notification display
        console.log('Creating notification modal with', notifications.length, 'notifications');
        this.showNotificationModal(notifications);
    }

    getDynamicNotifications() {
        const notifications = [];
        const today = new Date();
        
        console.log('=== NOTIFICATION DEBUG ===');
        console.log('Total birthdays:', this.birthdays.length);
        console.log('Today:', today.toDateString());
        
        // Check for birthdays today
        const todayBirthdays = this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const isToday = birthDate.getMonth() === today.getMonth() && 
                           birthDate.getDate() === today.getDate();
            console.log(`${birthday.name}: ${birthDate.toDateString()} - Today? ${isToday}`);
            return isToday;
        });
        
        console.log('Birthdays today:', todayBirthdays.length);
        
        if (todayBirthdays.length > 0) {
            todayBirthdays.forEach(birthday => {
                notifications.push({
                    type: 'birthday-today',
                    message: `🎉 ${birthday.name}'s birthday is today!`,
                    priority: 'high'
                });
            });
        }

        // Check for birthdays tomorrow
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowBirthdays = this.birthdays.filter(birthday => {
            const birthDate = new Date(birthday.date);
            const isTomorrow = birthDate.getMonth() === tomorrow.getMonth() && 
                              birthDate.getDate() === tomorrow.getDate();
            console.log(`${birthday.name}: ${birthDate.toDateString()} - Tomorrow? ${isTomorrow}`);
            return isTomorrow;
        });
        
        console.log('Birthdays tomorrow:', tomorrowBirthdays.length);
        
        if (tomorrowBirthdays.length > 0) {
            tomorrowBirthdays.forEach(birthday => {
                notifications.push({
                    type: 'birthday-tomorrow',
                    message: `🎂 ${birthday.name}'s birthday is tomorrow!`,
                    priority: 'medium'
                });
            });
        }

        // Check for upcoming birthdays (next 7 days) - but exclude today and tomorrow
        const upcomingBirthdays = this.birthdays
            .map(birthday => ({
                ...birthday,
                daysUntil: this.getDaysUntilBirthday(birthday.date)
            }))
            .filter(birthday => {
                const isUpcoming = birthday.daysUntil > 1 && birthday.daysUntil <= 7;
                console.log(`${birthday.name}: ${birthday.daysUntil} days - Upcoming? ${isUpcoming}`);
                return isUpcoming;
            })
            .sort((a, b) => a.daysUntil - b.daysUntil);

        console.log('Upcoming birthdays (2-7 days):', upcomingBirthdays.length);

        if (upcomingBirthdays.length > 0) {
            upcomingBirthdays.forEach(birthday => {
                notifications.push({
                    type: 'birthday-upcoming',
                    message: `📅 ${birthday.name}'s birthday is in ${birthday.daysUntil} day${birthday.daysUntil > 1 ? 's' : ''}`,
                    priority: 'low'
                });
            });
        }

        // Check for geofencing alerts - only show if user is actually near a geofence
        if (this.geofencingEnabled && this.currentLocation && this.geofences.length > 0) {
            const nearbyGeofences = this.geofences.filter(geofence => {
                const distance = this.calculateDistance(
                    this.currentLocation.latitude,
                    this.currentLocation.longitude,
                    geofence.latitude,
                    geofence.longitude
                );
                const isNearby = distance <= this.geofenceRadius / 1000;
                console.log(`Geofence ${geofence.name}: ${distance.toFixed(2)}km - Nearby? ${isNearby}`);
                return isNearby;
            });

            console.log('Nearby geofences:', nearbyGeofences.length);

            if (nearbyGeofences.length > 0) {
                nearbyGeofences.forEach(geofence => {
                    const distance = this.calculateDistance(
                        this.currentLocation.latitude,
                        this.currentLocation.longitude,
                        geofence.latitude,
                        geofence.longitude
                    );
                    notifications.push({
                        type: 'geofence-nearby',
                        message: `📍 You're near ${geofence.name} (${distance.toFixed(2)} km away)`,
                        priority: 'medium'
                    });
                });
            }
        }

        // Only add welcome message if user has no birthdays AND this is their first visit
        const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
        console.log('Has visited before:', hasVisitedBefore);
        console.log('Birthdays count:', this.birthdays.length);
        
        if (this.birthdays.length === 0 && !hasVisitedBefore) {
            console.log('Adding welcome message');
            notifications.push({
                type: 'system',
                message: '👋 Welcome! Add your first birthday to get started.',
                priority: 'low'
            });
            // Mark as visited
            localStorage.setItem('hasVisitedBefore', 'true');
        }

        // Only show feature notification once per session
        const hasShownFeatureNotification = sessionStorage.getItem('hasShownFeatureNotification');
        console.log('Has shown feature notification:', hasShownFeatureNotification);
        console.log('Geofencing enabled:', this.geofencingEnabled);
        
        if (!this.geofencingEnabled && !hasShownFeatureNotification) {
            console.log('Adding feature notification');
            notifications.push({
                type: 'feature',
                message: '🎯 Try the new geo-fencing feature to get location-based birthday alerts!',
                priority: 'low'
            });
            // Mark as shown for this session
            sessionStorage.setItem('hasShownFeatureNotification', 'true');
        }

        console.log('Final notification count:', notifications.length);
        console.log('Notifications:', notifications.map(n => n.message));
        console.log('=== END DEBUG ===');

        return notifications;
    }

    showNotificationModal(notifications) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            -webkit-overflow-scrolling: touch;
        `;

        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            position: relative;
            z-index: 10001;
        `;

        // Group notifications by priority
        const highPriority = notifications.filter(n => n.priority === 'high');
        const mediumPriority = notifications.filter(n => n.priority === 'medium');
        const lowPriority = notifications.filter(n => n.priority === 'low');

        modal.innerHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-bottom: 1px solid #dee2e6;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; color: #333; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-bell" style="color: #007bff;"></i>
                        Notifications (${notifications.length})
                    </h3>
                    <button onclick="this.closest('.notification-overlay').remove()" 
                            style="background: none; border: none; font-size: 20px; cursor: pointer; color: #666;">×</button>
                </div>
            </div>
            <div style="max-height: 60vh; overflow-y: auto;">
                ${this.renderNotificationSection('High Priority', highPriority, '#dc3545')}
                ${this.renderNotificationSection('Medium Priority', mediumPriority, '#ffa500')}
                ${this.renderNotificationSection('Low Priority', lowPriority, '#17a2b8')}
            </div>
            <div style="padding: 15px; border-top: 1px solid #dee2e6; text-align: center;">
                <button onclick="this.closest('.notification-overlay').remove()" 
                        style="background: #007bff; color: white; border: none; padding: 8px 20px; border-radius: 6px; cursor: pointer;">
                    Close
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        overlay.className = 'notification-overlay';
        document.body.appendChild(overlay);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    renderNotificationSection(title, notifications, color) {
        if (notifications.length === 0) return '';
        
        // Map notification types to readable labels and icons
        const typeLabels = {
            'birthday-today': { label: '🎉 Birthday Today', icon: '🎂' },
            'birthday-tomorrow': { label: '📅 Birthday Tomorrow', icon: '📆' },
            'birthday-upcoming': { label: '⏰ Upcoming Birthday', icon: '📅' },
            'geofence-nearby': { label: '📍 Location Alert', icon: '🗺️' },
            'feature': { label: '✨ Feature', icon: '⭐' },
            'system': { label: 'ℹ️ System', icon: '🔔' }
        };
        
        return `
            <div style="padding: 15px; border-bottom: 1px solid #eee;">
                <h4 style="margin: 0 0 10px 0; color: ${color}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ${title}
                </h4>
                ${notifications.map(notification => {
                    const typeInfo = typeLabels[notification.type] || { label: 'Notification', icon: '🔔' };
                    return `
                    <div style="padding: 12px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px; border-left: 3px solid ${color};">
                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                            <span style="font-size: 16px;">${typeInfo.icon}</span>
                            <span style="font-weight: 600; color: #333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${typeInfo.label}</span>
                        </div>
                        <p style="margin: 0; color: #333; font-size: 14px; padding-left: 24px;">${notification.message}</p>
                    </div>
                `;
                }).join('')}
            </div>
        `;
    }

    updateNotificationBadge() {
        const notifications = this.getDynamicNotifications();
        const notificationBell = document.querySelector('.notification-bell');
        
        if (notificationBell) {
            // Remove existing badge or count (handle both class names)
            const existingBadge = notificationBell.querySelector('.notification-badge');
            const existingCount = notificationBell.querySelector('.notification-count');
            
            if (existingBadge) {
                existingBadge.remove();
            }
            if (existingCount) {
                existingCount.remove();
            }
            
            // Only add badge if there are actual notifications
            if (notifications.length > 0) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = notifications.length > 99 ? '99+' : notifications.length;
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #dc3545;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    border: 2px solid white;
                    animation: pulse 2s infinite;
                    z-index: 1000;
                `;
                notificationBell.style.position = 'relative';
                notificationBell.appendChild(badge);
            }
        }
    }

    async requestNotificationPermission() {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notifications');
            return false;
        }

        // Check if permission is already granted
        if (Notification.permission === 'granted') {
            return true;
        }

        // Check if permission was previously denied
        if (Notification.permission === 'denied') {
            console.log('Notification permission was denied');
            return false;
        }

        // Request permission (only once - browser will remember)
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                console.log('Notification permission granted');
                // Show a test notification to confirm it works
                this.showTestNotification();
                return true;
            } else {
                console.log('Notification permission denied');
                return false;
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    }

    showTestNotification() {
        if (Notification.permission === 'granted') {
            const notification = new Notification('Birthday Buddy Notifications Enabled! 🎉', {
                body: 'You will receive notifications on birthdays',
                icon: 'https://via.placeholder.com/64',
                badge: 'https://via.placeholder.com/32',
                tag: 'notification-enabled',
                silent: false
            });

            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            setTimeout(() => notification.close(), 3000);
        }
    }

    checkBirthdaysToday() {
        console.log('=== checkBirthdaysToday called ===');
        const today = new Date();
        const todayKey = today.toDateString();
        
        console.log('Today:', todayKey);
        console.log('Total birthdays:', this.birthdays.length);
        
        // Clean up old entries (keep only today's)
        const shownToday = JSON.parse(localStorage.getItem('whatsappShownToday') || '{}');
        const cleanedShownToday = {};
        Object.keys(shownToday).forEach(key => {
            if (key.startsWith(todayKey)) {
                cleanedShownToday[key] = shownToday[key];
            }
        });
        localStorage.setItem('whatsappShownToday', JSON.stringify(cleanedShownToday));

        const todayBirthdays = this.birthdays.filter(birthday => {
            if (!birthday.date) {
                console.log('Birthday missing date:', birthday.name);
                return false;
            }
            
            const birthDate = new Date(birthday.date);
            const isToday = birthDate.getMonth() === today.getMonth() && 
                           birthDate.getDate() === today.getDate();
            
            console.log(`Checking ${birthday.name}: ${birthday.date} -> ${birthDate.toDateString()} - Today? ${isToday}`);
            return isToday;
        });

        console.log('Birthdays today:', todayBirthdays.length);
        
        if (todayBirthdays.length === 0) {
            console.log('No birthdays today');
            return;
        }

        todayBirthdays.forEach((birthday, index) => {
            const birthdayKey = `${todayKey}_${birthday.id || birthday._id}`;
            
            console.log(`[${index + 1}/${todayBirthdays.length}] Processing:`, birthday.name);
            console.log('  - Key:', birthdayKey);
            console.log('  - Phone:', birthday.phoneNumber || 'None');
            console.log('  - Email:', birthday.email || 'None');
            
            // Send browser notification first (if enabled) - always send
            try {
                this.sendBirthdayNotification(birthday);
            } catch (error) {
                console.error('Error sending notification:', error);
            }
            
            // ALWAYS show birthday popup (WhatsApp/Gmail) automatically for birthdays today
            // Use increasing delay for multiple birthdays to avoid overlap
            setTimeout(() => {
                try {
                    // Only show popup if birthday has contact info (phone or email)
                    if (birthday.phoneNumber || birthday.email) {
                        console.log('✅ Showing birthday popup for:', birthday.name);
                        this.showBirthdayPopup(birthday);
                    } else {
                        // If no contact info, show a message suggesting to add contact info
                        console.log('⚠️ No contact info for:', birthday.name);
                        this.showMessage(`🎉 ${birthday.name}'s birthday is today! Add phone number or email to send wishes.`, 'info');
                    }
                } catch (error) {
                    console.error('Error showing birthday popup:', error);
                    this.showMessage(`Error showing birthday popup for ${birthday.name}`, 'error');
                }
            }, 1500 + (index * 500)); // Stagger multiple birthdays
            
            // Mark as shown (but still show popup - this is just for tracking)
            cleanedShownToday[birthdayKey] = true;
            localStorage.setItem('whatsappShownToday', JSON.stringify(cleanedShownToday));
        });
        
        console.log('=== checkBirthdaysToday completed ===');
    }

    checkAndSendUpdatedBirthdayNotification(updatedBirthday) {
        // Check if the updated birthday date is today
        const today = new Date();
        const birthDate = new Date(updatedBirthday.date);
        const isToday = birthDate.getMonth() === today.getMonth() && 
                       birthDate.getDate() === today.getDate();
        
        if (isToday) {
            const todayKey = today.toDateString();
            const birthdayKey = `${todayKey}_${updatedBirthday.id || updatedBirthday._id}`;
            
            // Check if we've already shown notification today for this birthday
            const shownToday = JSON.parse(localStorage.getItem('whatsappShownToday') || '{}');
            
            // Reset the "shown" flag so we can show it again after update
            // This ensures automatic message sending works after updates
            delete shownToday[birthdayKey];
            localStorage.setItem('whatsappShownToday', JSON.stringify(shownToday));
            
            // Send browser notification
            this.sendBirthdayNotification(updatedBirthday);
            
            // ALWAYS show birthday popup after update if it's today (automatic message sending)
            // This ensures the popup appears even if it was shown before
            setTimeout(() => {
                if (updatedBirthday.phoneNumber || updatedBirthday.email) {
                    this.showBirthdayPopup(updatedBirthday);
                } else {
                    this.showMessage(`🎉 ${updatedBirthday.name}'s birthday is today! Add phone number or email to send wishes.`, 'info');
                }
            }, 2000); // Slightly longer delay to show "Birthday updated successfully!" message first
        }
    }

    sendBirthdayNotification(birthday) {
        // Check if notifications are enabled in settings
        const notificationsEnabled = localStorage.getItem('browserNotificationsEnabled') !== 'false';
        if (!notificationsEnabled) {
            return;
        }

        // Check if notifications are supported and permitted
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }

        const defaultMessage = `🎉 Happy Birthday ${birthday.name}! 🎂\n\nWishing you a wonderful day filled with joy and happiness! 🎈`;
        const notificationId = `birthday_${birthday.id || birthday._id}_${Date.now()}`;

        // Create notification with action buttons
        let notificationBody = '';
        if (birthday.phoneNumber && birthday.email) {
            notificationBody = 'Click to send a birthday wish (WhatsApp or Gmail)';
        } else if (birthday.phoneNumber) {
            notificationBody = 'Click to send a birthday wish on WhatsApp';
        } else if (birthday.email) {
            notificationBody = 'Click to send a birthday wish on Gmail';
        } else {
            notificationBody = 'Click to send a birthday wish';
        }

        const notification = new Notification(`🎉 It's ${birthday.name}'s Birthday!`, {
            body: notificationBody,
            icon: 'https://via.placeholder.com/128?text=🎂',
            badge: 'https://via.placeholder.com/64?text=📱',
            tag: notificationId,
            requireInteraction: false, // Notification will stay until clicked
            silent: false,
            data: {
                birthdayId: birthday.id || birthday._id,
                phoneNumber: birthday.phoneNumber,
                email: birthday.email,
                message: defaultMessage,
                name: birthday.name,
                date: birthday.date
            }
        });

        // Handle notification click - open WhatsApp or Gmail directly in ONE CLICK!
        // Store reference to dashboard instance for use in notification click handler
        const dashboardInstance = this;
        notification.onclick = (event) => {
            event.preventDefault();
            window.focus();
            
            const data = notification.data;
            if (!data) {
                console.error('Notification data is missing');
                notification.close();
                return;
            }
            
            // Find birthday from current list or use data from notification
            let birthday = dashboardInstance.birthdays.find(b => (b.id || b._id) === data.birthdayId);
            
            // If not found in current list, create from notification data
            if (!birthday) {
                birthday = {
                    id: data.birthdayId,
                    _id: data.birthdayId,
                    name: data.name,
                    phoneNumber: data.phoneNumber,
                    email: data.email,
                    date: data.date || new Date().toISOString().split('T')[0]
                };
            }
            
            // Always show popup to let user choose WhatsApp or Gmail
            // This ensures the message sending option is always available
            dashboardInstance.showBirthdayPopup(birthday);
            
            notification.close();
        };

        // Auto-close notification after 10 seconds if not clicked
        setTimeout(() => {
            notification.close();
        }, 10000);
    }

    getBirthdayVideoLinks() {
        // Return array of free animated birthday video links
        return [
            {
                name: 'Animated Birthday Cake',
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                description: '🎂 Beautiful animated birthday cake'
            },
            {
                name: 'Birthday Balloons Animation',
                url: 'https://giphy.com/gifs/birthday-happy-birthday-balloons-xT9IgG50Fb7Mi0prB6',
                description: '🎈 Colorful birthday balloons'
            },
            {
                name: 'Birthday Celebration Video',
                url: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
                description: '🎉 Celebration animation'
            },
            {
                name: 'Custom Video',
                url: '',
                description: 'Enter your own video URL'
            }
        ];
    }

    createGmailLink(email, name, message, includeVideo = false, videoUrl = '') {
        // Create Gmail compose link with pre-filled recipient, subject, and body
        let fullMessage = message;
        
        if (includeVideo && videoUrl) {
            fullMessage += `\n\n🎬 Watch this special birthday animation for you:\n${videoUrl}`;
        }
        
        const subject = encodeURIComponent(`🎉 Happy Birthday ${name}!`);
        const body = encodeURIComponent(fullMessage);
        // Gmail compose URL
        return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`;
    }

    createWhatsAppLink(phoneNumber, message, includeVideo = false, videoUrl = '') {
        // Clean phone number (remove spaces, dashes, etc.)
        const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
        
        let fullMessage = message;
        
        if (includeVideo && videoUrl) {
            fullMessage += `\n\n🎬 Watch this special birthday animation for you:\n${videoUrl}`;
        }
        
        // Encode message for URL
        const encodedMessage = encodeURIComponent(fullMessage);
        // Create WhatsApp link
        return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    }

    showBirthdayPopup(birthday) {
        console.log('showBirthdayPopup called for:', birthday.name);
        
        if (!birthday) {
            console.error('showBirthdayPopup: birthday is null or undefined');
            return;
        }
        
        // Remove existing popup if any
        const existingPopup = document.getElementById('birthdayPopup');
        if (existingPopup) {
            console.log('Removing existing popup');
            existingPopup.remove();
        }

        // Create popup overlay
        const overlay = document.createElement('div');
        overlay.id = 'birthdayPopup';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10002;
            animation: fadeIn 0.3s ease;
        `;

        // Create popup content
        const popup = document.createElement('div');
        popup.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            text-align: center;
            position: relative;
            z-index: 10003;
        `;

        // Default birthday message
        const defaultMessage = `🎉 Happy Birthday ${birthday.name}! 🎂\n\nWishing you a wonderful day filled with joy and happiness! 🎈`;

        // Create WhatsApp link
        const whatsappLink = birthday.phoneNumber 
            ? this.createWhatsAppLink(birthday.phoneNumber, defaultMessage)
            : null;

        popup.innerHTML = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
                <h2 style="margin: 0 0 10px 0; color: #333; font-size: 24px;">It's ${birthday.name}'s Birthday!</h2>
                <p style="color: #666; margin: 0; font-size: 16px;">Send them a birthday wish</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 20px; text-align: left;">
                <h3 style="margin: 0 0 10px 0; color: #333; font-size: 18px;">Birthday Message:</h3>
                <textarea id="birthdayMessage" style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; font-family: inherit; resize: vertical; min-height: 80px;" rows="4">${defaultMessage}</textarea>
            </div>

            <div style="background: #e8f4f8; padding: 15px; border-radius: 12px; margin-bottom: 20px; text-align: left; border: 1px solid #b3e5fc;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                    <input type="checkbox" id="includeVideo" style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                    <label for="includeVideo" style="margin: 0; cursor: pointer; font-weight: 600; color: #333; font-size: 16px;">
                        🎬 Include Animated Birthday Video
                    </label>
                </div>
                <div id="videoSelection" style="display: none; margin-top: 10px;">
                    <label style="display: block; margin-bottom: 8px; color: #666; font-size: 14px;">Choose Video:</label>
                    <select id="videoUrlSelect" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: white;">
                        ${this.getBirthdayVideoLinks().map((video, index) => 
                            `<option value="${video.url}" ${index === 0 ? 'selected' : ''}>${video.description} - ${video.name}</option>`
                        ).join('')}
                    </select>
                    <input type="text" id="customVideoUrl" placeholder="Or enter custom video URL" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-top: 8px; display: none;">
                </div>
            </div>

            <div style="display: flex; gap: 10px; flex-direction: column;">
                ${birthday.phoneNumber ? `
                    <button id="whatsappSendBtn" style="width: 100%; padding: 14px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fab fa-whatsapp" style="font-size: 20px;"></i>
                        Send via WhatsApp
                    </button>
                ` : `
                    <button id="whatsappSendBtnManual" style="width: 100%; padding: 14px; background: #25D366; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fab fa-whatsapp" style="font-size: 20px;"></i>
                        Send via WhatsApp (Manual Number)
                    </button>
                `}
                
                ${birthday.email ? `
                    <button id="gmailSendBtn" style="width: 100%; padding: 14px; background: #EA4335; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fab fa-google" style="font-size: 20px;"></i>
                        Send via Gmail
                    </button>
                ` : `
                    <button id="gmailSendBtnManual" style="width: 100%; padding: 14px; background: #EA4335; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i class="fab fa-google" style="font-size: 20px;"></i>
                        Send via Gmail (Manual Email)
                    </button>
                `}
            </div>
            
            <button id="closeBirthdayPopup" style="width: 100%; padding: 10px; background: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; cursor: pointer; margin-top: 10px;">
                Close
            </button>
        `;

        overlay.appendChild(popup);
        document.body.appendChild(overlay);

        // Add event listeners
        const messageTextarea = document.getElementById('birthdayMessage');
        const includeVideoCheckbox = document.getElementById('includeVideo');
        const videoSelection = document.getElementById('videoSelection');
        const videoUrlSelect = document.getElementById('videoUrlSelect');
        const customVideoUrl = document.getElementById('customVideoUrl');

        // Toggle video selection visibility
        includeVideoCheckbox.addEventListener('change', () => {
            if (includeVideoCheckbox.checked) {
                videoSelection.style.display = 'block';
            } else {
                videoSelection.style.display = 'none';
            }
        });

        // Handle custom video URL option
        videoUrlSelect.addEventListener('change', () => {
            if (videoUrlSelect.value === '' || videoUrlSelect.options[videoUrlSelect.selectedIndex].text.includes('Custom Video')) {
                customVideoUrl.style.display = 'block';
                customVideoUrl.required = true;
            } else {
                customVideoUrl.style.display = 'none';
                customVideoUrl.required = false;
            }
        });

        // Helper function to get selected video URL
        const getVideoUrl = () => {
            if (!includeVideoCheckbox.checked) return '';
            
            if (customVideoUrl.style.display === 'block' && customVideoUrl.value) {
                return customVideoUrl.value.trim();
            }
            
            return videoUrlSelect.value || '';
        };
        
        // WhatsApp button
        if (birthday.phoneNumber) {
            document.getElementById('whatsappSendBtn').addEventListener('click', () => {
                const message = messageTextarea.value;
                const videoUrl = getVideoUrl();
                const includeVideo = includeVideoCheckbox.checked && videoUrl;
                const whatsappUrl = this.createWhatsAppLink(birthday.phoneNumber, message, includeVideo, videoUrl);
                window.open(whatsappUrl, '_blank');
                overlay.remove();
            });
        } else {
            document.getElementById('whatsappSendBtnManual').addEventListener('click', () => {
                const phoneNumber = prompt('Enter WhatsApp number with country code (e.g., +1234567890):');
                if (phoneNumber && phoneNumber.trim()) {
                    const message = messageTextarea.value;
                    const videoUrl = getVideoUrl();
                    const includeVideo = includeVideoCheckbox.checked && videoUrl;
                    const whatsappUrl = this.createWhatsAppLink(phoneNumber.trim(), message, includeVideo, videoUrl);
                    window.open(whatsappUrl, '_blank');
                    overlay.remove();
                }
            });
        }

        // Gmail button
        if (birthday.email) {
            document.getElementById('gmailSendBtn').addEventListener('click', () => {
                const message = messageTextarea.value;
                const videoUrl = getVideoUrl();
                const includeVideo = includeVideoCheckbox.checked && videoUrl;
                const gmailUrl = this.createGmailLink(birthday.email, birthday.name, message, includeVideo, videoUrl);
                window.open(gmailUrl, '_blank');
                overlay.remove();
            });
        } else {
            document.getElementById('gmailSendBtnManual').addEventListener('click', () => {
                const email = prompt('Enter email address (e.g., person@example.com):');
                if (email && email.trim()) {
                    const message = messageTextarea.value;
                    const videoUrl = getVideoUrl();
                    const includeVideo = includeVideoCheckbox.checked && videoUrl;
                    const gmailUrl = this.createGmailLink(email.trim(), birthday.name, message, includeVideo, videoUrl);
                    window.open(gmailUrl, '_blank');
                    overlay.remove();
                }
            });
        }

        document.getElementById('closeBirthdayPopup').addEventListener('click', () => {
            overlay.remove();
        });

        // Close when clicking outside
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // Add CSS animations if not already added
        if (!document.getElementById('whatsappPopupStyles')) {
            const style = document.createElement('style');
            style.id = 'whatsappPopupStyles';
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from {
                        transform: translateY(20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }


    // Method to clear all notification flags (for debugging)
    clearNotificationFlags() {
        localStorage.removeItem('hasVisitedBefore');
        sessionStorage.removeItem('hasShownFeatureNotification');
        console.log('Notification flags cleared');
        this.showMessage('Notification flags cleared. Refresh the page.', 'info');
        
        // Force update the notification badge immediately
        this.updateNotificationBadge();
    }
    
    // Method to completely reset notification system
    resetNotificationSystem() {
        // Clear all flags
        localStorage.removeItem('hasVisitedBefore');
        sessionStorage.removeItem('hasShownFeatureNotification');
        
        // Clear any existing badge
        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) {
            const existingBadge = notificationBell.querySelector('.notification-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
        }
        
        // Force recalculate notifications
        const notifications = this.getDynamicNotifications();
        console.log('Reset notification count:', notifications.length);
        
        // Update badge with correct count
        this.updateNotificationBadge();
        
        this.showMessage('Notification system reset. Check console for details.', 'info');
    }
    
    // Simple method to force clear the notification badge
    clearNotificationBadge() {
        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) {
            const existingBadge = notificationBell.querySelector('.notification-badge');
            if (existingBadge) {
                existingBadge.remove();
                console.log('Badge manually cleared');
            } else {
                console.log('No badge found to clear');
            }
        }
        this.showMessage('Notification badge cleared.', 'info');
    }
    
    // Force update badge with specific count (for testing)
    forceUpdateBadge(count) {
        const notificationBell = document.querySelector('.notification-bell');
        if (notificationBell) {
            // Remove existing badge
            const existingBadge = notificationBell.querySelector('.notification-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add new badge with specified count
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'notification-badge';
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #dc3545;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    border: 2px solid white;
                    animation: pulse 2s infinite;
                    z-index: 1000;
                `;
                notificationBell.style.position = 'relative';
                notificationBell.appendChild(badge);
                console.log(`Forced badge update with count: ${count}`);
            }
        }
        this.showMessage(`Badge forced to show: ${count}`, 'info');
    }

    showMessage(message, type = 'info') {
        // Create a temporary message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${type}`;
        messageDiv.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideInRight 0.3s ease;
        `;

        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            info: '#17a2b8'
        };
        messageDiv.style.backgroundColor = colors[type] || colors.info;

        // Add to page
        document.body.appendChild(messageDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            // Clear user data
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberMe');
            
            // Redirect to login page
            window.location.href = 'login.html';
        }
    }
}

// Global functions for HTML onclick handlers
function showAddBirthdayForm() {
    dashboard.navigateToSection('add-birthday');
}

function hideAddBirthdayForm() {
    if (dashboard) {
        // Clear edit mode when canceling
        dashboard.editingBirthdayId = null;
        dashboard.resetForm();
        dashboard.navigateToSection('birthdays');
    }
}

// Initialize dashboard when page loads
let dashboard;
document.addEventListener('DOMContentLoaded', function() {
    dashboard = new BirthdayDashboard();
});

// Add CSS for additional styles
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .empty-state {
        text-align: center;
        padding: 60px 20px;
        color: #666;
    }
    
    .empty-state i {
        font-size: 48px;
        color: #ccc;
        margin-bottom: 20px;
    }
    
    .empty-state h3 {
        margin-bottom: 10px;
        color: #333;
    }
    
    .empty-state p {
        margin-bottom: 30px;
    }
    
    .birthday-status {
        margin: 15px 0;
    }
    
    .badge {
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        background: #e9ecef;
        color: #666;
    }
    
    .badge.today {
        background: #ff6b6b;
        color: white;
    }
    
    .badge.upcoming {
        background: #ffa500;
        color: white;
    }
    
    .notes {
        font-size: 12px;
        color: #888;
        margin-top: 5px;
    }
    
    .no-upcoming {
        text-align: center;
        color: #666;
        font-style: italic;
    }
    
    /* Geo-fencing styles */
    .geofence-controls {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    }
    
    .add-geofence-btn, .use-current-location-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: #007bff;
        color: white;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: background-color 0.3s;
    }
    
    .add-geofence-btn:hover, .use-current-location-btn:hover {
        background: #0056b3;
    }
    
    .use-current-location-btn {
        background: #28a745;
    }
    
    .use-current-location-btn:hover {
        background: #1e7e34;
    }
    
    .geofence-list {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .geofence-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        margin-bottom: 10px;
        background: white;
    }
    
    .geofence-info h4 {
        margin: 0 0 5px 0;
        color: #333;
        font-size: 16px;
    }
    
    .geofence-info p {
        margin: 2px 0;
        color: #666;
        font-size: 14px;
    }
    
    .remove-geofence-btn {
        background: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 8px 12px;
        cursor: pointer;
        transition: background-color 0.3s;
    }
    
    .remove-geofence-btn:hover {
        background: #c82333;
    }
    
    .no-geofences {
        text-align: center;
        color: #666;
        font-style: italic;
        padding: 20px;
    }
    
    #geofenceRadius {
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        font-size: 14px;
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.1);
        }
        100% {
            transform: scale(1);
        }
    }
`;
document.head.appendChild(additionalStyles); 
