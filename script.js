// Dashboard JavaScript
class BirthdayDashboard {
    constructor() {
        this.birthdays = JSON.parse(localStorage.getItem('birthdays')) || [];
        this.currentUser = JSON.parse(localStorage.getItem('userData')) || {
            name: 'John Doe',
            email: 'john.doe@gmail.com',
            imageUrl: 'https://via.placeholder.com/40'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.loadBirthdays();
        this.updateStats();
        this.loadUpcomingBirthdays();
        console.log('Dashboard initialized successfully!');
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateToSection(item.dataset.section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.logout();
        });

        // Add birthday form
        document.getElementById('addBirthdayForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addBirthday();
        });

        // Notification bell
        document.querySelector('.notification-bell').addEventListener('click', () => {
            this.showNotifications();
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
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionName).classList.add('active');

        // Update page title and subtitle
        this.updatePageHeader(sectionName);
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

    addBirthday() {
        const formData = {
            name: document.getElementById('personName').value,
            date: document.getElementById('birthDate').value,
            relationship: document.getElementById('relationship').value,
            notes: document.getElementById('notes').value,
            id: Date.now().toString()
        };

        if (!formData.name || !formData.date) {
            this.showMessage('Please fill in all required fields.', 'error');
            return;
        }

        this.birthdays.push(formData);
        localStorage.setItem('birthdays', JSON.stringify(this.birthdays));

        this.showMessage('Birthday added successfully!', 'success');
        this.resetForm();
        this.loadBirthdays();
        this.updateStats();
        this.loadUpcomingBirthdays();

        // Navigate back to birthdays section
        setTimeout(() => {
            this.navigateToSection('birthdays');
        }, 1500);
    }

    resetForm() {
        document.getElementById('addBirthdayForm').reset();
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

        card.innerHTML = `
            <div class="birthday-card-header">
                <div class="birthday-card-avatar">
                    ${birthday.name.charAt(0).toUpperCase()}
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
                <button class="action-btn edit" onclick="dashboard.editBirthday('${birthday.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete" onclick="dashboard.deleteBirthday('${birthday.id}')">
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
        const birthday = this.birthdays.find(b => b.id === id);
        if (birthday) {
            // For now, just show a message
            this.showMessage(`Editing ${birthday.name}'s birthday...`, 'info');
            // In a real app, you would populate a form with the birthday data
        }
    }

    deleteBirthday(id) {
        if (confirm('Are you sure you want to delete this birthday?')) {
            this.birthdays = this.birthdays.filter(b => b.id !== id);
            localStorage.setItem('birthdays', JSON.stringify(this.birthdays));
            
            this.showMessage('Birthday deleted successfully!', 'success');
            this.loadBirthdays();
            this.updateStats();
            this.loadUpcomingBirthdays();
        }
    }

    showNotifications() {
        const notifications = [
            'Sarah\'s birthday is tomorrow!',
            'Mike\'s birthday is in 3 days',
            'New feature: Location-based birthday alerts'
        ];

        const notificationText = notifications.join('\n');
        alert('Notifications:\n\n' + notificationText);
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
            localStorage.removeItem('userData');
            localStorage.removeItem('userEmail');
            
            // Redirect to login page
            window.location.href = 'index.html';
        }
    }
}

// Global functions for HTML onclick handlers
function showAddBirthdayForm() {
    dashboard.navigateToSection('add-birthday');
}

function hideAddBirthdayForm() {
    dashboard.navigateToSection('birthdays');
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
document.head.appendChild(additionalStyles);