class FoodScannerApp {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.startBtn = document.getElementById('startBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.fileInput = document.getElementById('fileInput');
        this.loading = document.getElementById('loading');
        this.foodResults = document.getElementById('foodResults');
        this.errorMsg = document.getElementById('errorMsg');
        this.cameraPlaceholder = document.getElementById('cameraPlaceholder');
        this.scanOverlay = document.querySelector('.scan-overlay');
        this.scanLine = document.getElementById('scanLine');
        this.foodSearch = document.getElementById('foodSearch');
        this.suggestions = document.getElementById('suggestions');
        this.capturedSection = document.getElementById('capturedSection');
        this.capturedImage = document.getElementById('capturedImage');
        this.flashOverlay = document.getElementById('flashOverlay');
        this.loadingText = document.getElementById('loadingText');
        this.scanProgressBar = document.getElementById('scanProgressBar');
        this.retakeBtn = document.getElementById('retakeBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        
        this.stream = null;
        this.currentFood = null;
        this.currentPortion = 1;
        this.history = [];
        this.lastCapturedImage = null;
        this.token = localStorage.getItem('scalai_token');
        this.user = JSON.parse(localStorage.getItem('scalai_user') || 'null');
        
        this.init();
    }
    
    init() {
        // Show user greeting
        if (this.user) {
            document.getElementById('userGreeting').textContent = `Welcome, ${this.user.fullName}`;
        }
        
        // Sign out button
        document.getElementById('signoutBtn').addEventListener('click', () => this.signOut());
        
        this.startBtn.addEventListener('click', () => this.startCamera());
        this.captureBtn.addEventListener('click', () => this.captureAndAnalyze());
        this.uploadBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
        
        this.foodSearch.addEventListener('input', (e) => this.handleSearch(e.target.value));
        this.foodSearch.addEventListener('focus', (e) => this.handleSearch(e.target.value));
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.suggestions.classList.remove('active');
            }
        });
        
        this.retakeBtn.addEventListener('click', () => this.retakePhoto());
        this.downloadBtn.addEventListener('click', () => this.downloadPhoto());
        
        this.loadHistory();
    }
    
    signOut() {
        localStorage.removeItem('scalai_token');
        localStorage.removeItem('scalai_user');
        window.location.href = 'signin.html';
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
            this.signOut();
            return null;
        }
        
        return response.json();
    }
    
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            
            this.video.srcObject = this.stream;
            this.video.classList.add('active');
            this.cameraPlaceholder.style.display = 'none';
            this.scanOverlay.classList.add('active');
            this.scanLine.classList.add('active');
            
            this.startBtn.disabled = true;
            this.captureBtn.disabled = false;
            
            // Hide previous results
            this.capturedSection.style.display = 'none';
            this.foodResults.style.display = 'none';
            this.errorMsg.style.display = 'none';
        } catch (err) {
            this.showError('Camera access denied. Please enable camera permissions or use manual input.');
            console.error('Camera error:', err);
        }
    }
    
    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.classList.remove('active');
        this.video.srcObject = null;
        this.cameraPlaceholder.style.display = 'flex';
        this.scanOverlay.classList.remove('active');
        this.scanLine.classList.remove('active');
        
        this.startBtn.disabled = false;
        this.captureBtn.disabled = true;
    }
    
    async captureAndAnalyze() {
        // Flash effect
        this.flashOverlay.classList.add('active');
        setTimeout(() => this.flashOverlay.classList.remove('active'), 200);
        
        // Capture frame to canvas
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);
        
        // Convert to image and display
        const imageData = this.canvas.toDataURL('image/jpeg', 0.9);
        this.lastCapturedImage = imageData;
        this.capturedImage.src = imageData;
        this.capturedSection.style.display = 'block';
        
        // Stop camera immediately after capture
        this.stopCamera();
        
        // Show scanning animation
        this.loading.style.display = 'block';
        this.foodResults.style.display = 'none';
        this.errorMsg.style.display = 'none';
        
        // Animate progress bar
        this.scanProgressBar.style.width = '0%';
        this.loadingText.textContent = 'Scanning food...';
        
        // Simulate AI analysis with progress
        await this.simulateAnalysis();
    }
    
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = e.target.result;
            this.lastCapturedImage = imageData;
            this.capturedImage.src = imageData;
            this.capturedSection.style.display = 'block';
            
            // Show scanning animation
            this.loading.style.display = 'block';
            this.foodResults.style.display = 'none';
            this.errorMsg.style.display = 'none';
            
            // Animate progress bar
            this.scanProgressBar.style.width = '0%';
            this.loadingText.textContent = 'Scanning food...';
            
            // Run analysis
            this.simulateAnalysis();
        };
        reader.readAsDataURL(file);
        
        // Reset file input
        this.fileInput.value = '';
    }
    
    async simulateAnalysis() {
        const steps = [
            { progress: '25%', text: 'Detecting food items...' },
            { progress: '50%', text: 'Analyzing nutrition...' },
            { progress: '75%', text: 'Calculating digestion...' },
            { progress: '100%', text: 'Analysis complete!' }
        ];
        
        for (const step of steps) {
            await new Promise(resolve => setTimeout(resolve, 500));
            this.scanProgressBar.style.width = step.progress;
            this.loadingText.textContent = step.text;
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Get random food from database
        const foods = Object.keys(foodDatabase);
        const randomFood = foods[Math.floor(Math.random() * foods.length)];
        
        this.loading.style.display = 'none';
        this.showFoodResult(randomFood, foodDatabase[randomFood]);
        
        // Auto-add to history
        await this.addToHistory();
        
        // Stop camera after scan
        this.stopCamera();
    }
    
    showFoodResult(name, data) {
        this.currentFood = { name, ...data };
        this.currentPortion = 1;
        
        this.updateNutritionDisplay(data);
        this.updateDigestionDisplay(data);
        
        this.foodResults.style.display = 'block';
        this.errorMsg.style.display = 'none';
        
        // Show auto-added notification
        this.showNotification('Added to log');
    }
    
    showNotification(message) {
        const existing = document.querySelector('.auto-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'auto-notification';
        notification.innerHTML = `<span>✓</span> ${message}`;
        document.querySelector('.food-results').prepend(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
    
    updateNutritionDisplay(data, multiplier = 1) {
        document.getElementById('calories').textContent = Math.round(data.calories * multiplier);
        document.getElementById('protein').textContent = (data.protein * multiplier).toFixed(1);
        document.getElementById('fat').textContent = (data.fat * multiplier).toFixed(1);
    }
    
    updateDigestionDisplay(data) {
        document.getElementById('digestionTime').textContent = data.digestion;
        document.getElementById('digestionDesc').textContent = data.digestionDesc;
        
        // Parse digestion time for bar width
        const timeStr = data.digestion;
        let maxHours = 5;
        let hours = 0;
        
        if (timeStr.includes('min')) {
            const mins = parseInt(timeStr);
            hours = mins / 60;
        } else {
            const match = timeStr.match(/(\d+)/);
            hours = match ? parseInt(match[1]) : 2;
        }
        
        const percentage = Math.min((hours / maxHours) * 100, 100);
        document.getElementById('digestionBar').style.width = percentage + '%';
    }
    
    async addToHistory() {
        if (!this.currentFood) return;
        
        const entry = {
            foodName: this.currentFood.name,
            calories: Math.round(this.currentFood.calories * this.currentPortion),
            protein: (this.currentFood.protein * this.currentPortion).toFixed(1),
            fat: (this.currentFood.fat * this.currentPortion).toFixed(1),
            digestion: this.currentFood.digestion,
            image: this.lastCapturedImage
        };
        
        try {
            const data = await this.apiRequest('/api/history', {
                method: 'POST',
                body: JSON.stringify(entry)
            });
            
            if (data && data.success) {
                this.history.unshift({ id: data.history.id, ...entry });
            }
        } catch (error) {
            console.error('Failed to save to history:', error);
        }
    }
    
    handleSearch(query) {
        if (query.length < 1) {
            this.suggestions.classList.remove('active');
            return;
        }
        
        const results = searchFood(query);
        
        if (results.length === 0) {
            this.suggestions.classList.remove('active');
            return;
        }
        
        this.suggestions.innerHTML = results.map(food => `
            <div class="suggestion-item" data-food="${food.name}">
                ${this.capitalizeWords(food.name)} - ${food.calories} cal
            </div>
        `).join('');
        
        this.suggestions.classList.add('active');
        
        this.suggestions.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const foodName = item.dataset.food;
                this.showFoodResult(foodName, foodDatabase[foodName]);
                this.addToHistory();
                this.foodSearch.value = '';
                this.suggestions.classList.remove('active');
            });
        });
    }
    
    async loadHistory() {
        try {
            const data = await this.apiRequest('/api/history?limit=50');
            if (data && data.success) {
                this.history = data.history;
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }
    
    showError(message) {
        this.loading.style.display = 'none';
        this.foodResults.style.display = 'none';
        this.errorMsg.style.display = 'block';
        document.getElementById('errorText').textContent = message;
    }
    
    capitalizeWords(str) {
        return str.replace(/\b\w/g, c => c.toUpperCase());
    }
    
    retakePhoto() {
        this.capturedSection.style.display = 'none';
        this.foodResults.style.display = 'none';
    }
    
    downloadPhoto() {
        if (!this.lastCapturedImage) return;
        
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0, 10);
        const foodName = this.currentFood ? this.currentFood.name : 'food';
        link.download = `foodscan_${foodName}_${timestamp}.jpg`;
        link.href = this.lastCapturedImage;
        link.click();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new FoodScannerApp();
});
