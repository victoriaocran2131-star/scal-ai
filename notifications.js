import { LocalNotifications } from '@capacitor/local-notifications';

class NotificationsApp {
    constructor() {
        this.token = localStorage.getItem('scalai_token');
        this.settings = this.loadSettings();
        
        if (!this.token) {
            window.location.href = 'signin.html';
            return;
        }
        
        this.init();
    }
    
    init() {
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        document.getElementById('enableNotifications').addEventListener('change', (e) => {
            this.toggleNotifications(e.target.checked);
        });
        
        document.getElementById('saveReminders').addEventListener('click', () => {
            this.saveReminders();
        });
        
        document.getElementById('testNotification').addEventListener('click', () => {
            this.sendTestNotification();
        });
        
        this.loadSettings();
        this.checkPermission();
    }
    
    loadSettings() {
        const saved = localStorage.getItem('scalai_notifications');
        return saved ? JSON.parse(saved) : {
            enabled: true,
            breakfast: { time: '08:00', enabled: true },
            lunch: { time: '12:00', enabled: true },
            dinner: { time: '19:00', enabled: true },
            snack: { time: '15:00', enabled: false }
        };
    }
    
    saveSettings() {
        localStorage.setItem('scalai_notifications', JSON.stringify(this.settings));
    }
    
    async checkPermission() {
        try {
            const permission = await LocalNotifications.requestPermissions();
            return permission.display === 'granted';
        } catch (error) {
            console.log('Running in browser - notifications will use web fallback');
            return false;
        }
    }
    
    async toggleNotifications(enabled) {
        this.settings.enabled = enabled;
        
        if (enabled) {
            const granted = await this.checkPermission();
            if (!granted) {
                document.getElementById('enableNotifications').checked = false;
                this.settings.enabled = false;
                alert('Notification permission denied. Please enable notifications in your device settings.');
                return;
            }
            this.scheduleReminders();
        } else {
            this.cancelAllReminders();
        }
        
        this.saveSettings();
    }
    
    async scheduleReminders() {
        try {
            await LocalNotifications.cancel({ notifications: this.getExistingNotifications() });
            
            const reminders = [];
            const types = ['breakfast', 'lunch', 'dinner', 'snack'];
            
            types.forEach(type => {
                if (this.settings[type].enabled) {
                    const [hours, minutes] = this.settings[type].time.split(':').map(Number);
                    
                    reminders.push({
                        title: this.getReminderTitle(type),
                        body: this.getReminderBody(type),
                        id: this.getNotificationId(type),
                        schedule: {
                            every: 'day',
                            at: new Date(Date.now().thisTimeTomorrow(hours, minutes))
                        },
                        smallIcon: 'ic_notification',
                        largeIcon: 'ic_launcher',
                        channelId: 'meal-reminders'
                    });
                }
            });
            
            if (reminders.length > 0) {
                await LocalNotifications.schedule({ notifications: reminders });
                console.log('Reminders scheduled:', reminders.length);
            }
        } catch (error) {
            console.log('Browser fallback - reminders saved locally');
        }
        
        this.saveSettings();
    }
    
    async cancelAllReminders() {
        try {
            const existing = await LocalNotifications.getPending();
            if (existing.notifications.length > 0) {
                await LocalNotifications.cancel({ 
                    notifications: existing.notifications.map(n => ({ id: n.id }))
                });
            }
        } catch (error) {
            console.log('Browser mode - no notifications to cancel');
        }
    }
    
    async sendTestNotification() {
        try {
            await LocalNotifications.schedule({
                notifications: [{
                    title: 'Scal AI Test',
                    body: 'Notifications are working! You will receive meal reminders at your set times.',
                    id: 999,
                    smallIcon: 'ic_notification',
                    largeIcon: 'ic_launcher',
                    channelId: 'meal-reminders'
                }]
            });
        } catch (error) {
            alert('Test notification sent! (Browser mode)');
        }
    }
    
    getReminderTitle(type) {
        const titles = {
            breakfast: '🌅 Breakfast Time!',
            lunch: '☀️ Lunch Time!',
            dinner: '🌙 Dinner Time!',
            snack: '🍎 Snack Check!'
        };
        return titles[type] || '🍽️ Meal Reminder';
    }
    
    getReminderBody(type) {
        const messages = {
            breakfast: "Don't forget to scan your breakfast and track your calories!",
            lunch: "Time to log your lunch. Keep your nutrition tracking on track!",
            dinner: "Remember to scan your dinner to complete today's log.",
            snack: "Had a snack? Log it to keep your tracking accurate!"
        };
        return messages[type] || "Don't forget to log your meal!";
    }
    
    getNotificationId(type) {
        const ids = { breakfast: 101, lunch: 102, dinner: 103, snack: 104 };
        return ids[type] || 100;
    }
    
    loadSettings() {
        const saved = localStorage.getItem('scalai_notifications');
        const settings = saved ? JSON.parse(saved) : {
            enabled: true,
            breakfast: { time: '08:00', enabled: true },
            lunch: { time: '12:00', enabled: true },
            dinner: { time: '19:00', enabled: true },
            snack: { time: '15:00', enabled: false }
        };
        
        document.getElementById('enableNotifications').checked = settings.enabled;
        document.getElementById('breakfastTimeInput').value = settings.breakfast.time;
        document.getElementById('breakfastEnabled').checked = settings.breakfast.enabled;
        document.getElementById('lunchTimeInput').value = settings.lunch.time;
        document.getElementById('lunchEnabled').checked = settings.lunch.enabled;
        document.getElementById('dinnerTimeInput').value = settings.dinner.time;
        document.getElementById('dinnerEnabled').checked = settings.dinner.enabled;
        document.getElementById('snackTimeInput').value = settings.snack.time;
        document.getElementById('snackEnabled').checked = settings.snack.enabled;
        
        this.settings = settings;
        return settings;
    }
    
    saveReminders() {
        this.settings = {
            enabled: document.getElementById('enableNotifications').checked,
            breakfast: {
                time: document.getElementById('breakfastTimeInput').value,
                enabled: document.getElementById('breakfastEnabled').checked
            },
            lunch: {
                time: document.getElementById('lunchTimeInput').value,
                enabled: document.getElementById('lunchEnabled').checked
            },
            dinner: {
                time: document.getElementById('dinnerTimeInput').value,
                enabled: document.getElementById('dinnerEnabled').checked
            },
            snack: {
                time: document.getElementById('snackTimeInput').value,
                enabled: document.getElementById('snackEnabled').checked
            }
        };
        
        this.saveSettings();
        
        if (this.settings.enabled) {
            this.scheduleReminders();
        }
        
        this.showSuccess('Reminders saved successfully!');
    }
    
    showSuccess(message) {
        const existing = document.querySelector('.success-toast');
        if (existing) existing.remove();
        
        const toast = document.createElement('div');
        toast.className = 'success-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

Date.prototype.thisTimeTomorrow = function(hours, minutes) {
    const date = new Date(this);
    date.setDate(date.getDate() + 1);
    date.setHours(hours, minutes, 0, 0);
    return date;
};

document.addEventListener('DOMContentLoaded', () => {
    new NotificationsApp();
});
