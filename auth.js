// Authentication JavaScript
class AuthManager {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
        this.init();
    }

    // Enhanced local storage methods
    loadUsers() {
        try {
            const usersString = localStorage.getItem('users');
            console.log('Raw users data from localStorage:', usersString);
            
            if (!usersString) {
                console.log('No users found in localStorage, returning empty array');
                return [];
            }
            
            const users = JSON.parse(usersString);
            console.log('Parsed users array:', users);
            console.log('Number of users before filtering:', users.length);
            
            // Validate user data structure
            const validUsers = users.filter(user => {
                const isValid = user && 
                    user.id && 
                    user.email && 
                    user.name && 
                    user.password;
                
                if (!isValid) {
                    console.warn('Invalid user found and filtered out:', user);
                }
                
                return isValid;
            });
            
            console.log('Number of users after filtering:', validUsers.length);
            return validUsers;
        } catch (error) {
            console.error('Error loading users from localStorage:', error);
            console.error('Error details:', error.message, error.stack);
            return [];
        }
    }

    loadCurrentUser() {
        try {
            const user = JSON.parse(localStorage.getItem('currentUser'));
            if (user && user.id && user.email) {
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error loading current user from localStorage:', error);
            return null;
        }
    }

    saveUsers() {
        try {
            // Check if localStorage is available
            if (typeof(Storage) === "undefined") {
                console.error('localStorage is not available in this browser');
                this.showMessage('localStorage is not available. Cannot save user data.', 'error');
                return false;
            }

            const usersString = JSON.stringify(this.users);
            console.log('Saving users to localStorage:', this.users.length, 'users');
            console.log('Users data to save:', this.users);
            console.log('JSON string length:', usersString.length);
            
            // Try to save
            localStorage.setItem('users', usersString);
            
            // Verify it was saved correctly
            const verification = localStorage.getItem('users');
            if (!verification) {
                console.error('Failed to verify saved data - localStorage returned null');
                this.showMessage('Failed to save user data. Please try again.', 'error');
                return false;
            }
            
            const verifiedUsers = JSON.parse(verification);
            console.log('Verified saved users:', verifiedUsers.length, 'users');
            console.log('Saved users successfully:', verifiedUsers);
            
            return true;
        } catch (error) {
            console.error('Error saving users to localStorage:', error);
            console.error('Error details:', error.message, error.stack);
            
            // Check if it's a quota exceeded error
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                this.showMessage('Storage quota exceeded. Please clear some data or use a different browser.', 'error');
            } else {
                this.showMessage('Error saving user data: ' + error.message, 'error');
            }
            return false;
        }
    }

    saveCurrentUser(user) {
        try {
            localStorage.setItem('currentUser', JSON.stringify(user));
            console.log('Current user saved to localStorage');
        } catch (error) {
            console.error('Error saving current user to localStorage:', error);
            this.showMessage('Error saving session data. Please try again.', 'error');
        }
    }

    // Local storage utilities
    clearAllData() {
        try {
            localStorage.removeItem('users');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('userPreferences');
            localStorage.removeItem('lastLoginTime');
            console.log('All local storage data cleared');
            this.showMessage('All data cleared successfully', 'success');
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            this.showMessage('Error clearing data', 'error');
        }
    }

    exportUserData() {
        try {
            const data = {
                users: this.users,
                currentUser: this.currentUser,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `birthday-buddy-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            this.showMessage('User data exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting user data:', error);
            this.showMessage('Error exporting data', 'error');
        }
    }

    importUserData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.users && Array.isArray(data.users)) {
                    this.users = data.users;
                    this.saveUsers();
                    this.showMessage('User data imported successfully', 'success');
                } else {
                    this.showMessage('Invalid backup file format', 'error');
                }
            } catch (error) {
                console.error('Error importing user data:', error);
                this.showMessage('Error importing data', 'error');
            }
        };
        reader.readAsText(file);
    }

    // User preferences storage
    saveUserPreferences(preferences) {
        try {
            const currentPrefs = this.getUserPreferences();
            const updatedPrefs = { ...currentPrefs, ...preferences };
            localStorage.setItem('userPreferences', JSON.stringify(updatedPrefs));
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    }

    getUserPreferences() {
        try {
            return JSON.parse(localStorage.getItem('userPreferences')) || {};
        } catch (error) {
            console.error('Error loading user preferences:', error);
            return {};
        }
    }

    // Login tracking
    saveLoginTime() {
        try {
            localStorage.setItem('lastLoginTime', new Date().toISOString());
        } catch (error) {
            console.error('Error saving login time:', error);
        }
    }

    getLastLoginTime() {
        try {
            const time = localStorage.getItem('lastLoginTime');
            return time ? new Date(time) : null;
        } catch (error) {
            console.error('Error getting last login time:', error);
            return null;
        }
    }

    // Data validation
    validateUserData(user) {
        const required = ['id', 'name', 'email', 'password'];
        return required.every(field => user && user[field]);
    }

    // Storage quota management
    checkStorageQuota() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            console.error('Storage quota exceeded:', error);
            this.showMessage('Storage space is full. Please clear some data.', 'error');
            return false;
        }
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        console.log('Login form found:', loginForm); // Debug log
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Login form submitted'); // Debug log
                this.login();
            });
        } else {
            console.error('Login form not found!'); // Debug log
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.register();
            });
        }

        // Password toggle
        document.querySelectorAll('.toggle-password').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const input = e.target.previousElementSibling;
                const type = input.type === 'password' ? 'text' : 'password';
                input.type = type;
                e.target.classList.toggle('fa-eye');
                e.target.classList.toggle('fa-eye-slash');
            });
        });

        // Profile photo upload
        const uploadArea = document.getElementById('uploadArea');
        const profilePhoto = document.getElementById('profilePhoto');
        
        if (uploadArea && profilePhoto) {
            // Click to upload
            uploadArea.addEventListener('click', () => {
                profilePhoto.click();
            });

            // File selection
            profilePhoto.addEventListener('change', (e) => {
                this.handlePhotoUpload(e.target.files[0]);
            });

            // Drag and drop
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                    this.handlePhotoUpload(file);
                }
            });
        }

        // Social auth buttons
        document.querySelectorAll('.social-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSocialAuth(btn.classList.contains('google') ? 'google' : 'facebook');
            });
        });

        // Backup login button handler
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            console.log('Login button found, adding click handler'); // Debug log
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Login button clicked'); // Debug log
                this.login();
            });
        } else {
            console.error('Login button not found!'); // Debug log
        }

        // Forgot password handler
        const forgotPasswordLink = document.querySelector('.forgot-password');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordModal();
            });
        }
    }

    checkAuthStatus() {
        // If user is already logged in and on auth pages, redirect to dashboard
        if (this.currentUser && (window.location.pathname.includes('login.html') || window.location.pathname.includes('register.html'))) {
            window.location.href = 'index.html';
        }

        // If user is not logged in and on dashboard, redirect to login
        if (!this.currentUser && window.location.pathname.includes('index.html')) {
            window.location.href = 'login.html';
        }
    }

    async login() {
        console.log('Login method called'); // Debug log
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;

        console.log('Email:', email); // Debug log
        console.log('Password length:', password.length); // Debug log

        if (!email || !password) {
            this.showMessage('Please fill in all fields.', 'error');
            return;
        }

        // Always reload users from localStorage to get the latest data
        this.users = this.loadUsers();
        console.log('Loaded users:', this.users); // Debug log
        console.log('Looking for email:', email); // Debug log
        
        const user = this.users.find(u => u.email && u.email.trim().toLowerCase() === email);
        
        if (!user) {
            console.log('User not found. Available emails:', this.users.map(u => u.email)); // Debug log
            this.showMessage('User not found. Please register first.', 'error');
            return;
        }

        if (user.password !== password) { // In real app, use proper password hashing
            this.showMessage('Invalid password.', 'error');
            return;
        }

        // Login successful
        this.currentUser = user;
        this.saveCurrentUser(user);
        this.saveLoginTime();
        
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        }

        this.showMessage('Login successful! Redirecting...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    async register() {
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms')?.checked || false;
        const profilePhoto = document.getElementById('profilePhoto')?.files[0];

        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            this.showMessage('Please fill in all fields.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        if (!agreeTerms) {
            this.showMessage('Please agree to the terms and conditions.', 'error');
            return;
        }

        // Always reload users from localStorage to get the latest data
        this.users = this.loadUsers();
        console.log('Users before registration:', this.users);
        console.log('Checking for existing email:', email);
        // Check if user already exists (case-insensitive comparison)
        if (this.users.find(u => u.email && u.email.trim().toLowerCase() === email)) {
            this.showMessage('User with this email already exists.', 'error');
            return;
        }

        // Handle profile photo
        let photoUrl = null;
        if (profilePhoto) {
            photoUrl = await this.uploadPhoto(profilePhoto);
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            name: fullName,
            email: email,
            password: password, // In real app, hash the password
            imageUrl: photoUrl || 'https://via.placeholder.com/40',
            createdAt: new Date().toISOString()
        };

        // Validate user data before saving
        if (!this.validateUserData(newUser)) {
            this.showMessage('Invalid user data. Please try again.', 'error');
            return;
        }

        this.users.push(newUser);
        console.log('Users after registration:', this.users);
        console.log('New user added:', newUser);
        
        // Save users and verify it was successful
        const saveSuccess = this.saveUsers();
        if (!saveSuccess) {
            // Remove the user from the array if save failed
            this.users = this.users.filter(u => u.id !== newUser.id);
            this.showMessage('Failed to save registration. Please try again.', 'error');
            return;
        }
        
        // Verify the user was actually saved by reloading
        const reloadedUsers = this.loadUsers();
        const savedUser = reloadedUsers.find(u => u.email === email);
        if (!savedUser) {
            console.error('User was not found after saving!');
            this.showMessage('Registration failed: User was not saved properly. Please try again.', 'error');
            return;
        }
        
        console.log('User successfully saved and verified:', savedUser);

        // Auto login
        this.currentUser = newUser;
        this.saveCurrentUser(newUser);
        this.saveLoginTime();

        this.showMessage('Registration successful! Welcome to Birthday Buddy!', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
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

    handlePhotoUpload(file) {
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
            const preview = document.getElementById('profilePreview');
            const uploadArea = document.getElementById('uploadArea');
            const uploadContent = uploadArea.querySelector('.upload-content');

            preview.src = e.target.result;
            preview.style.display = 'block';
            uploadContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    handleSocialAuth(provider) {
        // In a real app, this would integrate with OAuth providers
        this.showMessage(`${provider} authentication coming soon!`, 'info');
    }

    showForgotPasswordModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('forgotPasswordModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create modal overlay
        const modal = document.createElement('div');
        modal.id = 'forgotPasswordModal';
        modal.className = 'forgot-password-modal';
        modal.innerHTML = `
            <div class="forgot-password-modal-content">
                <div class="modal-header">
                    <h2>Reset Password</h2>
                    <button class="modal-close" onclick="this.closest('.forgot-password-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Enter your email address and a new password to reset your account.</p>
                    <form id="resetPasswordForm" class="reset-password-form">
                        <div class="form-group">
                            <label for="resetEmail">Email Address</label>
                            <div class="input-group">
                                <i class="fas fa-envelope"></i>
                                <input type="email" id="resetEmail" required placeholder="Enter your email">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="newPassword">New Password</label>
                            <div class="input-group">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="newPassword" required placeholder="Enter new password" minlength="6">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="confirmNewPassword">Confirm New Password</label>
                            <div class="input-group">
                                <i class="fas fa-lock"></i>
                                <input type="password" id="confirmNewPassword" required placeholder="Confirm new password" minlength="6">
                            </div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="cancel-btn" onclick="document.getElementById('forgotPasswordModal').remove()">Cancel</button>
                            <button type="submit" class="auth-btn">Reset Password</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Add styles
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            animation: fadeIn 0.3s ease;
        `;

        const modalContent = modal.querySelector('.forgot-password-modal-content');
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 450px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.3s ease;
        `;

        // Add modal styles to head if not exists
        if (!document.getElementById('forgotPasswordModalStyles')) {
            const style = document.createElement('style');
            style.id = 'forgotPasswordModalStyles';
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
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }
                .modal-header h2 {
                    margin: 0;
                    font-size: 24px;
                    color: #333;
                }
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                    padding: 5px;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background 0.2s;
                }
                .modal-close:hover {
                    background: #f0f0f0;
                }
                .modal-body p {
                    color: #666;
                    margin-bottom: 20px;
                }
                .form-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 20px;
                }
                .cancel-btn {
                    flex: 1;
                    padding: 12px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background: white;
                    color: #333;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .cancel-btn:hover {
                    background: #f5f5f5;
                }
            `;
            document.head.appendChild(style);
        }

        // Add event listener for form submission
        modal.querySelector('#resetPasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.resetPassword();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    }

    resetPassword() {
        const email = document.getElementById('resetEmail').value.trim().toLowerCase();
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        // Validation
        if (!email || !newPassword || !confirmNewPassword) {
            this.showMessage('Please fill in all fields.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            this.showMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            this.showMessage('Passwords do not match.', 'error');
            return;
        }

        // Reload users from localStorage
        this.users = this.loadUsers();
        
        // Find user by email
        const user = this.users.find(u => u.email && u.email.trim().toLowerCase() === email);
        
        if (!user) {
            this.showMessage('User not found with this email address.', 'error');
            return;
        }

        // Update password
        user.password = newPassword;
        
        // Update in users array
        const userIndex = this.users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            this.users[userIndex] = user;
            this.saveUsers();
        }

        // Close modal
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) {
            modal.remove();
        }

        this.showMessage('Password reset successfully! You can now login with your new password.', 'success');
        
        // Clear the email input in login form
        const loginEmail = document.getElementById('email');
        if (loginEmail) {
            loginEmail.value = email;
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('rememberMe');
        window.location.href = 'login.html';
    }

    showMessage(message, type = 'info') {
        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `auth-message auth-message-${type}`;
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
            max-width: 300px;
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

    // Utility methods
    isLoggedIn() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    updateUserProfile(updates) {
        if (!this.currentUser) return;

        Object.assign(this.currentUser, updates);
        this.saveCurrentUser(this.currentUser);

        // Update in users array
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
            this.saveUsers();
        }
    }
}

// Initialize auth manager
let authManager;
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired, initializing AuthManager');
    authManager = new AuthManager();
});

// Global functions for local storage management
function logout() {
    if (authManager) {
        authManager.logout();
    }
}

function clearAllData() {
    if (authManager) {
        authManager.clearAllData();
    }
}

function exportUserData() {
    if (authManager) {
        authManager.exportUserData();
    }
}

function importUserData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        if (e.target.files[0] && authManager) {
            authManager.importUserData(e.target.files[0]);
        }
    };
    input.click();
}

function saveUserPreference(key, value) {
    if (authManager) {
        authManager.saveUserPreferences({ [key]: value });
    }
}

function getUserPreference(key) {
    if (authManager) {
        const prefs = authManager.getUserPreferences();
        return prefs[key];
    }
    return null;
}

// Debug function to check localStorage state
function debugLocalStorage() {
    console.log('=== localStorage Debug Info ===');
    console.log('localStorage available:', typeof(Storage) !== "undefined");
    
    const usersString = localStorage.getItem('users');
    console.log('Raw users string:', usersString);
    
    if (usersString) {
        try {
            const users = JSON.parse(usersString);
            console.log('Parsed users array:', users);
            console.log('Number of users:', users.length);
            users.forEach((user, index) => {
                console.log(`User ${index + 1}:`, {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    hasPassword: !!user.password
                });
            });
        } catch (error) {
            console.error('Error parsing users:', error);
        }
    } else {
        console.log('No users found in localStorage');
    }
    
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            console.log('Current user:', JSON.parse(currentUser));
        } catch (error) {
            console.error('Error parsing current user:', error);
        }
    } else {
        console.log('No current user in localStorage');
    }
    
    console.log('=== End Debug Info ===');
    return {
        users: usersString ? JSON.parse(usersString) : [],
        currentUser: currentUser ? JSON.parse(currentUser) : null
    };
}

// Add CSS for auth messages
const authMessageStyles = document.createElement('style');
authMessageStyles.textContent = `
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
`;
document.head.appendChild(authMessageStyles); 