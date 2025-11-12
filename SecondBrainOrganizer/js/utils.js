const utils = {
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatDateTime(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    formatTime(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    },

    isToday(date) {
        if (!date) return false;
        const d = new Date(date);
        const today = new Date();
        return d.toDateString() === today.toDateString();
    },

    isPast(date) {
        if (!date) return false;
        const d = new Date(date);
        const now = new Date();
        return d < now;
    },

    isFuture(date) {
        if (!date) return false;
        const d = new Date(date);
        const now = new Date();
        return d > now;
    },

    getDaysUntil(date) {
        if (!date) return null;
        const d = new Date(date);
        const now = new Date();
        const diff = d - now;
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    async requestNotificationPermission() {
        if (!('Notification' in window)) {
            return 'unsupported';
        }
        
        if (Notification.permission === 'granted') {
            return 'granted';
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission;
        }
        
        return Notification.permission;
    },

    showNotification(title, options = {}) {
        if (!('Notification' in window)) {
            console.log('Notifications not supported');
            return;
        }
        
        if (Notification.permission === 'granted') {
            new Notification(title, {
                icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
                badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>",
                ...options
            });
        }
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showConfetti(element) {
        const colors = ['#6ab7ff', '#a8daff', '#6dd5a7', '#ffc875'];
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        for (let i = 0; i < 20; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.left = centerX + 'px';
            confetti.style.top = centerY + 'px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = (i * 0.05) + 's';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            const angle = (Math.random() * 360) * Math.PI / 180;
            const velocity = 50 + Math.random() * 50;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            confetti.style.setProperty('--tx', tx + 'px');
            confetti.style.setProperty('--ty', ty + 'px');
            
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 1000);
        }
    },

    async copyToClipboard(text, clearAfter = 25000) {
        try {
            await navigator.clipboard.writeText(text);
            utils.showToast('Copied to clipboard', 'success');
            
            if (clearAfter) {
                setTimeout(async () => {
                    try {
                        const currentClip = await navigator.clipboard.readText();
                        if (currentClip === text) {
                            await navigator.clipboard.writeText('');
                        }
                    } catch (e) {
                    }
                }, clearAfter);
            }
        } catch (err) {
            utils.showToast('Failed to copy', 'error');
        }
    },

    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    openModal(content) {
        const overlay = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');
        modalContent.innerHTML = content;
        overlay.classList.add('active');
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                utils.closeModal();
            }
        });
    },

    closeModal() {
        const overlay = document.getElementById('modal-overlay');
        overlay.classList.remove('active');
    },

    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

window.utils = utils;
