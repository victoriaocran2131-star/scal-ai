class ChartsApp {
    constructor() {
        this.token = localStorage.getItem('scalai_token');
        this.user = JSON.parse(localStorage.getItem('scalai_user') || 'null');
        this.period = 7;
        this.dailyLogs = [];
        this.history = [];
        
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
        
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.period = parseInt(e.target.dataset.period);
                this.loadData();
            });
        });
        
        this.loadData();
    }
    
    async apiRequest(url) {
        const fullUrl = url.startsWith('http') ? url : API_BASE + url;
        
        try {
            const response = await fetch(fullUrl, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            
            if (response.status === 401 || response.status === 403) {
                const data = await response.json().catch(() => ({}));
                
                if (data.requiresSubscription) {
                    window.location.href = 'subscription.html';
                    return null;
                }
                
                localStorage.removeItem('scalai_token');
                localStorage.removeItem('scalai_user');
                window.location.href = 'signin.html';
                return null;
            }
            
            return response.json();
        } catch (error) {
            console.log('Network error');
            return null;
        }
    }
    
    async loadData() {
        try {
            const [logsData, historyData] = await Promise.all([
                this.apiRequest(`/api/daily-logs?days=${this.period}`),
                this.apiRequest(`/api/history?limit=500`)
            ]);
            
            if (logsData && logsData.success) {
                this.dailyLogs = this.fillMissingDays(logsData.logs);
            }
            
            if (historyData && historyData.success) {
                this.history = historyData.history;
            }
            
            this.renderCharts();
            this.renderSummary();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    }
    
    fillMissingDays(logs) {
        const filled = [];
        const now = new Date();
        
        for (let i = this.period - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const existing = logs.find(l => l.date === dateStr);
            filled.push({
                date: dateStr,
                label: this.formatShortDate(date),
                totalCalories: existing ? existing.totalCalories : 0,
                totalProtein: existing ? existing.totalProtein : 0,
                totalFat: existing ? existing.totalFat : 0,
                totalCarbs: existing ? existing.totalCarbs : 0,
                mealCount: existing ? existing.mealCount : 0
            });
        }
        
        return filled;
    }
    
    formatShortDate(date) {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    renderCharts() {
        this.renderLineChart('caloriesChart', this.dailyLogs.map(d => d.totalCalories), '#f4d03f', '#c9a227');
        this.renderLineChart('proteinChart', this.dailyLogs.map(d => d.totalProtein), '#e8a838', '#d4af37');
        this.renderLineChart('carbsChart', this.dailyLogs.map(d => d.totalCarbs), '#5dade2', '#3498db');
        this.renderLineChart('fatChart', this.dailyLogs.map(d => d.totalFat), '#d4af37', '#b8941f');
        this.renderBarChart('mealsChart', this.dailyLogs.map(d => d.mealCount), '#c9a227', '#f4d03f');
        
        this.updateAverages();
    }
    
    renderLineChart(canvasId, data, lineColor, fillColor) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 400;
        ctx.clearRect(0, 0, width, height);
        
        const padding = { top: 30, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const maxVal = Math.max(...data, 1);
        const stepX = chartWidth / (data.length - 1 || 1);
        
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            ctx.fillStyle = '#666';
            ctx.font = '20px Segoe UI';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 10, y + 6);
        }
        
        ctx.fillStyle = '#666';
        ctx.font = '18px Segoe UI';
        ctx.textAlign = 'center';
        const labelStep = Math.max(1, Math.floor(data.length / 6));
        data.forEach((_, i) => {
            if (i % labelStep === 0 || i === data.length - 1) {
                const x = padding.left + i * stepX;
                ctx.fillText(this.dailyLogs[i]?.label || '', x, height - 15);
            }
        });
        
        if (data.length < 2) return;
        
        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        data.forEach((val, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, fillColor + '40');
        gradient.addColorStop(1, fillColor + '05');
        
        ctx.lineTo(padding.left + (data.length - 1) * stepX, padding.top + chartHeight);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
        
        data.forEach((val, i) => {
            const x = padding.left + i * stepX;
            const y = padding.top + chartHeight - (val / maxVal) * chartHeight;
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = lineColor;
            ctx.fill();
            ctx.strokeStyle = '#0a0a0f';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }
    
    renderBarChart(canvasId, data, barColor, highlightColor) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = 400;
        ctx.clearRect(0, 0, width, height);
        
        const padding = { top: 30, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;
        
        const maxVal = Math.max(...data, 1);
        const barWidth = (chartWidth / data.length) * 0.6;
        const gap = (chartWidth / data.length) * 0.4;
        
        ctx.strokeStyle = 'rgba(201, 162, 39, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            
            ctx.fillStyle = '#666';
            ctx.font = '20px Segoe UI';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(maxVal - (maxVal / 4) * i), padding.left - 10, y + 6);
        }
        
        data.forEach((val, i) => {
            const x = padding.left + i * (barWidth + gap) + gap / 2;
            const barHeight = (val / maxVal) * chartHeight;
            const y = padding.top + chartHeight - barHeight;
            
            const gradient = ctx.createLinearGradient(x, y, x, padding.top + chartHeight);
            gradient.addColorStop(0, highlightColor);
            gradient.addColorStop(1, barColor);
            
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [6, 6, 0, 0]);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            if (val > 0) {
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px Segoe UI';
                ctx.textAlign = 'center';
                ctx.fillText(val, x + barWidth / 2, y - 8);
            }
            
            ctx.fillStyle = '#666';
            ctx.font = '16px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText(this.dailyLogs[i]?.label || '', x + barWidth / 2, height - 15);
        });
    }
    
    updateAverages() {
        const days = this.dailyLogs.length || 1;
        
        const avgCal = this.dailyLogs.reduce((s, d) => s + d.totalCalories, 0) / days;
        const avgProt = this.dailyLogs.reduce((s, d) => s + d.totalProtein, 0) / days;
        const avgCarbs = this.dailyLogs.reduce((s, d) => s + d.totalCarbs, 0) / days;
        const avgFat = this.dailyLogs.reduce((s, d) => s + d.totalFat, 0) / days;
        const avgMeals = this.dailyLogs.reduce((s, d) => s + d.mealCount, 0) / days;
        
        document.getElementById('avgCalories').textContent = Math.round(avgCal);
        document.getElementById('avgProtein').textContent = avgProt.toFixed(1);
        document.getElementById('avgCarbs').textContent = avgCarbs.toFixed(1);
        document.getElementById('avgFat').textContent = avgFat.toFixed(1);
        document.getElementById('avgMeals').textContent = avgMeals.toFixed(1);
    }
    
    renderSummary() {
        const totalMeals = this.dailyLogs.reduce((s, d) => s + d.mealCount, 0);
        const totalCal = this.dailyLogs.reduce((s, d) => s + d.totalCalories, 0);
        
        document.getElementById('totalMeals').textContent = totalMeals;
        document.getElementById('totalCaloriesSum').textContent = Math.round(totalCal);
        
        const bestDayLog = [...this.dailyLogs].sort((a, b) => b.mealCount - a.mealCount)[0];
        if (bestDayLog && bestDayLog.mealCount > 0) {
            document.getElementById('bestDay').textContent = bestDayLog.label;
        }
        
        const foodCounts = {};
        this.history.forEach(h => {
            foodCounts[h.foodName] = (foodCounts[h.foodName] || 0) + 1;
        });
        const sorted = Object.entries(foodCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            document.getElementById('mostScanned').textContent = sorted[0][0];
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ChartsApp();
});
