const SettingsModule = {
    currentTheme: 'auto',

    async init() {
        await this.loadSettings();
        this.attachEventListeners();
        this.updateNotificationStatus();
    },

    async loadSettings() {
        this.currentTheme = await DB.getSetting('theme', 'auto');
        this.applyTheme(this.currentTheme);

        const autoLockTimeout = await DB.getSetting('autoLockTimeout', 5);
        const clipboardTimeout = await DB.getSetting('clipboardTimeout', 25);

        const autoLockInput = document.getElementById('auto-lock-timeout');
        const clipboardInput = document.getElementById('clipboard-timeout');

        if (autoLockInput) autoLockInput.value = autoLockTimeout;
        if (clipboardInput) clipboardInput.value = clipboardTimeout;
    },

    attachEventListeners() {
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.setTheme(theme);
            });
        });

        document.getElementById('enable-notifications-btn')?.addEventListener('click', async () => {
            await this.requestNotifications();
        });

        document.getElementById('export-all-btn')?.addEventListener('click', async () => {
            await this.exportAllData();
        });

        document.getElementById('import-all-btn')?.addEventListener('click', () => {
            document.getElementById('import-all-input').click();
        });

        document.getElementById('import-all-input')?.addEventListener('change', async (e) => {
            await this.importAllData(e.target.files[0]);
        });
    },

    async setTheme(theme) {
        this.currentTheme = theme;
        await DB.setSetting('theme', theme);
        this.applyTheme(theme);

        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });

        utils.showToast(`Theme set to ${theme}`, 'success');
    },

    applyTheme(theme) {
        const root = document.documentElement;
        
        if (theme === 'light') {
            root.setAttribute('data-theme', 'light');
        } else if (theme === 'dark') {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    },

    async requestNotifications() {
        const permission = await utils.requestNotificationPermission();
        this.updateNotificationStatus();
        
        if (permission === 'granted') {
            utils.showToast('Notifications enabled! 🔔', 'success');
            utils.showNotification('Second Brain', {
                body: 'Notifications are now enabled!'
            });
        } else if (permission === 'denied') {
            utils.showToast('Notifications blocked. Please enable in browser settings.', 'warning');
        }
    },

    updateNotificationStatus() {
        const statusEl = document.getElementById('notification-status');
        if (!statusEl) return;

        if (!('Notification' in window)) {
            statusEl.textContent = 'Notifications not supported in this browser';
            return;
        }

        const permission = Notification.permission;
        if (permission === 'granted') {
            statusEl.textContent = '✓ Notifications enabled';
            statusEl.style.color = 'var(--success-color)';
        } else if (permission === 'denied') {
            statusEl.textContent = '✗ Notifications blocked';
            statusEl.style.color = 'var(--danger-color)';
        } else {
            statusEl.textContent = 'Click to enable notifications';
            statusEl.style.color = 'var(--text-muted)';
        }
    },

    async exportAllData() {
        const data = {
            version: 1,
            exported: new Date().toISOString(),
            tasks: await DB.getAll('tasks'),
            bills: await DB.getAll('bills'),
            settings: await DB.getAll('settings')
        };

        const json = JSON.stringify(data, null, 2);
        utils.downloadFile(json, `second-brain-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
        utils.showToast('All data exported! 📦', 'success');
    },

    async importAllData(file) {
        if (!file) return;
        if (!confirm('⚠️ This will replace all existing data. Continue?')) return;

        try {
            const content = await utils.readFile(file);
            const data = JSON.parse(content);

            if (data.tasks) {
                await DB.clear('tasks');
                for (const task of data.tasks) {
                    await DB.add('tasks', task);
                }
            }

            if (data.bills) {
                await DB.clear('bills');
                for (const bill of data.bills) {
                    await DB.add('bills', bill);
                }
            }

            if (data.settings) {
                await DB.clear('settings');
                for (const setting of data.settings) {
                    await DB.add('settings', setting);
                }
            }

            utils.showToast('Data imported! Reloading...', 'success');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            utils.showToast('Import failed! Invalid file.', 'error');
        }
    }
};

window.SettingsModule = SettingsModule;
