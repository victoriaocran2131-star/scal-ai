class HistoryApp {
    constructor() {
        this.history = [];
        this.filteredHistory = [];
        this.currentFilter = 'all';
        this.token = localStorage.getItem('scalai_token');
        this.user = JSON.parse(localStorage.getItem('scalai_user') || 'null');
        
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
        
        document.getElementById('scanBtn').addEventListener('click', () => {
            window.location.href = 'index.html';
        });
        
        document.getElementById('clearAllBtn').addEventListener('click', () => this.clearAllHistory());
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.setFilter(e.target));
        });
        
        this.loadHistory();
    }
    
    async apiRequest(url, options = {}) {
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            ...options.headers
        };
        
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('scalai_token');
            localStorage.removeItem('scalai_user');
            window.location.href = 'signin.html';
            return null;
        }
        
        return response.json();
    }
    
    setFilter(btn) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.loadHistory();
    }
    
    async loadHistory() {
        try {
            const data = await this.apiRequest(`/api/history?filter=${this.currentFilter}&limit=100`);
            if (data && data.success) {
                this.filteredHistory = data.history;
                this.render();
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    render() {
        this.updateStats();
        this.renderHistoryList();
        this.renderDailyBreakdown();
    }
    
    updateStats() {
        const totals = this.filteredHistory.reduce((acc, item) => ({
            calories: acc.calories + (item.calories || 0),
            protein: acc.protein + parseFloat(item.protein || 0),
            fat: acc.fat + parseFloat(item.fat || 0)
        }), { calories: 0, protein: 0, fat: 0 });
        
        document.getElementById('statCalories').textContent = Math.round(totals.calories);
        document.getElementById('statProtein').textContent = totals.protein.toFixed(1) + 'g';
        document.getElementById('statFat').textContent = totals.fat.toFixed(1) + 'g';
        document.getElementById('statMeals').textContent = this.filteredHistory.length;
    }
    
    renderHistoryList() {
        const container = document.getElementById('historyList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredHistory.length === 0) {
            emptyState.style.display = 'flex';
            container.innerHTML = '';
            return;
        }
        
        emptyState.style.display = 'none';
        
        container.innerHTML = this.filteredHistory.map(item => `
            <div class="history-card" data-id="${item.id}">
                <div class="history-card-image">
                    ${item.image ? `<img src="${item.image}" alt="Food">` : '<div class="no-image">📷</div>'}
                </div>
                <div class="history-card-content">
                    <div class="history-card-header">
                        <div class="history-card-time">${this.formatTime(item.createdAt)}</div>
                    </div>
                    <div class="history-card-nutrition">
                        <div class="nutrition-pill calories">
                            <span class="pill-icon">🔥</span>
                            <span class="pill-value">${item.calories} cal</span>
                        </div>
                        <div class="nutrition-pill protein">
                            <span class="pill-icon">🥩</span>
                            <span class="pill-value">${item.protein}g</span>
                        </div>
                        <div class="nutrition-pill fat">
                            <span class="pill-icon">🫒</span>
                            <span class="pill-value">${item.fat}g</span>
                        </div>
                    </div>
                    <div class="history-card-details">
                        <div class="detail-item">
                            <span class="detail-label">Digestion:</span>
                            <span class="detail-value">${item.digestion || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <button class="history-card-delete" data-id="${item.id}">×</button>
            </div>
        `).join('');
        
        container.querySelectorAll('.history-card-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteItem(btn.dataset.id);
            });
        });
    }
    
    renderDailyBreakdown() {
        const container = document.getElementById('dailyList');
        
        if (this.filteredHistory.length === 0) {
            container.innerHTML = '<p class="empty-history">No data to display</p>';
            return;
        }
        
        // Group by date
        const grouped = {};
        this.filteredHistory.forEach(item => {
            const date = new Date(item.createdAt).toLocaleDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(item);
        });
        
        // Sort dates newest first
        const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
        
        container.innerHTML = sortedDates.map(date => {
            const items = grouped[date];
            const totals = items.reduce((acc, item) => ({
                calories: acc.calories + (item.calories || 0),
                protein: acc.protein + parseFloat(item.protein || 0),
                fat: acc.fat + parseFloat(item.fat || 0)
            }), { calories: 0, protein: 0, fat: 0 });
            
            return `
                <div class="daily-card">
                    <div class="daily-header">
                        <div class="daily-date">${this.formatDate(new Date(date))}</div>
                        <div class="daily-count">${items.length} meal${items.length > 1 ? 's' : ''}</div>
                    </div>
                    <div class="daily-totals">
                        <div class="daily-total">
                            <span class="total-icon">🔥</span>
                            <span class="total-value">${Math.round(totals.calories)} cal</span>
                        </div>
                        <div class="daily-total">
                            <span class="total-icon">🥩</span>
                            <span class="total-value">${totals.protein.toFixed(1)}g</span>
                        </div>
                        <div class="daily-total">
                            <span class="total-icon">🫒</span>
                            <span class="total-value">${totals.fat.toFixed(1)}g</span>
                        </div>
                    </div>
                    <div class="daily-items">
                        ${items.map(item => `
                            <div class="daily-item">
                                <span class="item-cal">${item.calories} cal</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    async deleteItem(id) {
        try {
            const data = await this.apiRequest(`/api/history/${id}`, {
                method: 'DELETE'
            });
            
            if (data && data.success) {
                this.filteredHistory = this.filteredHistory.filter(item => item.id !== id);
                this.render();
            }
        } catch (error) {
            console.error('Failed to delete item:', error);
        }
    }
    
    async clearAllHistory() {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            try {
                const data = await this.apiRequest('/api/history', {
                    method: 'DELETE'
                });
                
                if (data && data.success) {
                    this.filteredHistory = [];
                    this.render();
                }
            } catch (error) {
                console.error('Failed to clear history:', error);
            }
        }
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    formatDate(date) {
        const today = new Date();
        const yesterday = new Date(today - 86400000);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    capitalizeWords(str) {
        return str.replace(/\b\w/g, c => c.toUpperCase());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new HistoryApp();
});
