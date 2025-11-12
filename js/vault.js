const VaultModule = {
    isUnlocked: false,
    masterPassword: null,
    passwords: [],
    autoLockTimer: null,
    clipboardTimeouts: {},
    currentSubtab: 'passwords',
    searchQuery: '',

    async init() {
        this.attachEventListeners();
        this.setupAutoLock();
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isUnlocked) {
                this.lock();
            }
        });
    },

    attachEventListeners() {
        document.getElementById('vault-unlock-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.unlock();
        });

        document.getElementById('lock-vault-btn')?.addEventListener('click', () => {
            this.lock();
        });

        document.getElementById('add-password-btn')?.addEventListener('click', () => {
            this.showAddPasswordModal();
        });

        document.querySelectorAll('.sub-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sub-nav-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSubtab = e.target.dataset.subtab;
                this.switchSubtab(this.currentSubtab);
            });
        });

        document.getElementById('vault-search')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.render();
        });

        document.getElementById('export-encrypted-btn')?.addEventListener('click', () => {
            this.exportEncrypted();
        });

        document.getElementById('export-csv-btn')?.addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('import-csv-btn')?.addEventListener('click', () => {
            document.getElementById('import-csv-input').click();
        });

        document.getElementById('import-csv-input')?.addEventListener('change', async (e) => {
            await this.importCSV(e.target.files[0]);
        });

        document.getElementById('auto-lock-timeout')?.addEventListener('change', async (e) => {
            await DB.setSetting('autoLockTimeout', parseInt(e.target.value));
            this.setupAutoLock();
        });

        document.getElementById('clipboard-timeout')?.addEventListener('change', async (e) => {
            await DB.setSetting('clipboardTimeout', parseInt(e.target.value));
        });
    },

    async unlock() {
        const password = document.getElementById('master-password').value;
        if (!password) return;

        try {
            const vaultData = await DB.get('vault-meta', 'encrypted-vault');
            
            if (!vaultData) {
                await this.createNewVault(password);
            } else {
                this.passwords = await VaultCrypto.decrypt(vaultData.data, password);
            }

            this.masterPassword = password;
            this.isUnlocked = true;
            document.getElementById('vault-locked').style.display = 'none';
            document.getElementById('vault-unlocked').style.display = 'block';
            
            if (this.passwords.length === 0) {
                await this.seedVault();
            }
            
            this.render();
            this.setupAutoLock();
            utils.showToast('Vault unlocked! 🔓', 'success');
        } catch (err) {
            utils.showToast('Invalid password!', 'error');
        }
    },

    async createNewVault(password) {
        this.passwords = [];
        const encrypted = await VaultCrypto.encrypt(this.passwords, password);
        await DB.put('vault-meta', { key: 'encrypted-vault', data: encrypted });
    },

    async seedVault() {
        const demoPasswords = [
            {
                id: utils.generateId(),
                title: 'Hulu',
                username: 'user@email.com',
                password: 'demo123!',
                url: 'https://hulu.com',
                notes: 'Demo entry - delete or edit as needed',
                tags: ['streaming', 'entertainment'],
                category: 'Entertainment',
                favorite: false,
                lastChangedAt: new Date().toISOString()
            },
            {
                id: utils.generateId(),
                title: 'Ford Login',
                username: 'myford@email.com',
                password: 'Ford2024!',
                url: 'https://www.ford.com',
                notes: 'Demo entry',
                tags: ['automotive'],
                category: 'Other',
                favorite: true,
                lastChangedAt: new Date().toISOString()
            },
            {
                id: utils.generateId(),
                title: 'Blue Ridge',
                username: 'blueridge_user',
                password: 'SecurePass789!',
                url: '',
                notes: 'Demo entry',
                tags: ['work'],
                category: 'Work',
                favorite: false,
                lastChangedAt: new Date().toISOString()
            }
        ];

        this.passwords = demoPasswords;
        await this.saveVault();
        this.render();
    },

    async saveVault() {
        if (!this.masterPassword) return;
        
        const encrypted = await VaultCrypto.encrypt(this.passwords, this.masterPassword);
        await DB.put('vault-meta', { key: 'encrypted-vault', data: encrypted });
    },

    lock() {
        this.isUnlocked = false;
        this.masterPassword = null;
        this.passwords = [];
        document.getElementById('vault-locked').style.display = 'flex';
        document.getElementById('vault-unlocked').style.display = 'none';
        document.getElementById('master-password').value = '';
        
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
        }
        
        utils.showToast('Vault locked 🔒', 'success');
    },

    setupAutoLock() {
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
        }

        if (!this.isUnlocked) return;

        DB.getSetting('autoLockTimeout', 5).then(timeout => {
            this.autoLockTimer = setTimeout(() => {
                if (this.isUnlocked) {
                    this.lock();
                }
            }, timeout * 60 * 1000);
        });
    },

    resetAutoLock() {
        if (this.isUnlocked) {
            this.setupAutoLock();
        }
    },

    switchSubtab(subtab) {
        document.querySelectorAll('.vault-subtab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.getElementById(`vault-${subtab}`).classList.add('active');
    },

    showAddPasswordModal(password = null) {
        const isEdit = !!password;
        const modalContent = `
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'Add'} Password</h3>
                <button class="close-btn" onclick="utils.closeModal()">&times;</button>
            </div>
            <form id="add-password-form">
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" id="pwd-title" required value="${password?.title || ''}" placeholder="e.g., Gmail">
                </div>
                <div class="form-group">
                    <label>Username/Email</label>
                    <input type="text" id="pwd-username" value="${password?.username || ''}" placeholder="user@example.com">
                </div>
                <div class="form-group">
                    <label>Password *</label>
                    <div style="display: flex; gap: 8px;">
                        <input type="password" id="pwd-password" required value="${password?.password || ''}" style="flex: 1;">
                        <button type="button" class="secondary-btn" id="generate-pwd-btn">🎲 Generate</button>
                    </div>
                    <div id="password-strength" style="margin-top: 8px;"></div>
                </div>
                <div class="form-group" id="generator-options" style="display: none;">
                    <label>Password Length</label>
                    <input type="range" id="pwd-length" min="12" max="64" value="16">
                    <span id="pwd-length-display">16</span>
                    <div style="margin-top: 8px;">
                        <label><input type="checkbox" id="pwd-uppercase" checked> Uppercase</label>
                        <label><input type="checkbox" id="pwd-lowercase" checked> Lowercase</label>
                        <label><input type="checkbox" id="pwd-digits" checked> Digits</label>
                        <label><input type="checkbox" id="pwd-symbols" checked> Symbols</label>
                    </div>
                </div>
                <div class="form-group">
                    <label>URL</label>
                    <input type="url" id="pwd-url" value="${password?.url || ''}" placeholder="https://example.com">
                </div>
                <div class="form-group">
                    <label>Category</label>
                    <select id="pwd-category">
                        <option value="Personal" ${password?.category === 'Personal' ? 'selected' : ''}>Personal</option>
                        <option value="Work" ${password?.category === 'Work' ? 'selected' : ''}>Work</option>
                        <option value="Finance" ${password?.category === 'Finance' ? 'selected' : ''}>Finance</option>
                        <option value="Entertainment" ${password?.category === 'Entertainment' ? 'selected' : ''}>Entertainment</option>
                        <option value="Other" ${password?.category === 'Other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tags (comma separated)</label>
                    <input type="text" id="pwd-tags" value="${password?.tags?.join(', ') || ''}" placeholder="work, important">
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="pwd-notes" placeholder="Additional notes...">${password?.notes || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="pwd-favorite" ${password?.favorite ? 'checked' : ''}>
                        Mark as Favorite ⭐
                    </label>
                </div>
                <div class="button-group">
                    <button type="button" class="secondary-btn" onclick="utils.closeModal()">Cancel</button>
                    <button type="submit" class="primary-btn">${isEdit ? 'Update' : 'Add'} Password</button>
                </div>
            </form>
        `;

        utils.openModal(modalContent);

        const passwordInput = document.getElementById('pwd-password');
        const strengthDiv = document.getElementById('password-strength');
        
        const updateStrength = () => {
            const strength = VaultCrypto.estimatePasswordStrength(passwordInput.value);
            const colors = { weak: 'var(--danger-color)', fair: 'var(--warning-color)', good: 'var(--primary-color)', strong: 'var(--success-color)' };
            strengthDiv.innerHTML = `
                <div style="display: flex; gap: 4px; align-items: center;">
                    <div style="flex: 1; height: 8px; background: var(--bg-tertiary); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${(strength.score / strength.maxScore) * 100}%; height: 100%; background: ${colors[strength.strength]}; transition: all 0.3s;"></div>
                    </div>
                    <span style="font-size: 0.85rem; color: ${colors[strength.strength]}; font-weight: 500;">${strength.strength}</span>
                </div>
                ${strength.feedback ? `<p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">${strength.feedback}</p>` : ''}
            `;
        };

        passwordInput.addEventListener('input', updateStrength);
        updateStrength();

        document.getElementById('generate-pwd-btn').addEventListener('click', () => {
            const genOptions = document.getElementById('generator-options');
            genOptions.style.display = genOptions.style.display === 'none' ? 'block' : 'none';
            
            const length = parseInt(document.getElementById('pwd-length').value);
            const generated = VaultCrypto.generatePassword(length, {
                useUppercase: document.getElementById('pwd-uppercase').checked,
                useLowercase: document.getElementById('pwd-lowercase').checked,
                useDigits: document.getElementById('pwd-digits').checked,
                useSymbols: document.getElementById('pwd-symbols').checked
            });
            passwordInput.value = generated;
            passwordInput.type = 'text';
            updateStrength();
        });

        document.getElementById('pwd-length').addEventListener('input', (e) => {
            document.getElementById('pwd-length-display').textContent = e.target.value;
        });

        document.getElementById('add-password-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isEdit) {
                await this.updatePassword(password.id);
            } else {
                await this.addPassword();
            }
        });
    },

    async addPassword() {
        const password = {
            id: utils.generateId(),
            title: document.getElementById('pwd-title').value,
            username: document.getElementById('pwd-username').value,
            password: document.getElementById('pwd-password').value,
            url: document.getElementById('pwd-url').value,
            category: document.getElementById('pwd-category').value,
            tags: document.getElementById('pwd-tags').value.split(',').map(t => t.trim()).filter(t => t),
            notes: document.getElementById('pwd-notes').value,
            favorite: document.getElementById('pwd-favorite').checked,
            lastChangedAt: new Date().toISOString()
        };

        this.passwords.push(password);
        await this.saveVault();
        utils.closeModal();
        this.render();
        utils.showToast('Password added! 🔑', 'success');
    },

    async updatePassword(id) {
        const password = this.passwords.find(p => p.id === id);
        if (!password) return;

        password.title = document.getElementById('pwd-title').value;
        password.username = document.getElementById('pwd-username').value;
        password.password = document.getElementById('pwd-password').value;
        password.url = document.getElementById('pwd-url').value;
        password.category = document.getElementById('pwd-category').value;
        password.tags = document.getElementById('pwd-tags').value.split(',').map(t => t.trim()).filter(t => t);
        password.notes = document.getElementById('pwd-notes').value;
        password.favorite = document.getElementById('pwd-favorite').checked;
        password.lastChangedAt = new Date().toISOString();

        await this.saveVault();
        utils.closeModal();
        this.render();
        utils.showToast('Password updated! 🔑', 'success');
    },

    async deletePassword(id) {
        if (!confirm('Delete this password?')) return;

        this.passwords = this.passwords.filter(p => p.id !== id);
        await this.saveVault();
        this.render();
        utils.showToast('Password deleted', 'success');
    },

    async toggleFavorite(id) {
        const password = this.passwords.find(p => p.id === id);
        if (!password) return;

        password.favorite = !password.favorite;
        await this.saveVault();
        this.render();
    },

    async copyUsername(username) {
        await utils.copyToClipboard(username, null);
    },

    async copyPassword(password) {
        const timeout = await DB.getSetting('clipboardTimeout', 25);
        await utils.copyToClipboard(password, timeout * 1000);
    },

    async revealPassword(id, button) {
        const password = this.passwords.find(p => p.id === id);
        if (!password) return;

        const passwordSpan = button.closest('.password-row').querySelector('.password-display');
        passwordSpan.textContent = password.password;
        button.textContent = '👁️';
        button.disabled = true;

        setTimeout(() => {
            passwordSpan.textContent = '••••••••';
            button.textContent = '👁️';
            button.disabled = false;
        }, 10000);
    },

    exportEncrypted() {
        const data = JSON.stringify({
            version: 1,
            exported: new Date().toISOString(),
            passwords: this.passwords
        });
        utils.downloadFile(data, `vault-${new Date().toISOString().split('T')[0]}.svault`, 'application/json');
        utils.showToast('Vault exported! 📦', 'success');
    },

    exportCSV() {
        if (!confirm('⚠️ WARNING: This will export your passwords in PLAINTEXT. Continue?')) return;

        const headers = ['Title', 'Username', 'Password', 'URL', 'Category', 'Tags', 'Notes'];
        const rows = [headers];

        this.passwords.forEach(pwd => {
            rows.push([
                pwd.title,
                pwd.username,
                pwd.password,
                pwd.url,
                pwd.category,
                pwd.tags.join('; '),
                pwd.notes
            ]);
        });

        const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        utils.downloadFile(csv, `passwords-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        utils.showToast('CSV exported!', 'success');
    },

    async importCSV(file) {
        if (!file) return;

        try {
            const content = await utils.readFile(file);
            const lines = content.split('\n').slice(1);
            let imported = 0;

            for (const line of lines) {
                if (!line.trim()) continue;

                const match = line.match(/"([^"]*)"/g);
                if (!match || match.length < 3) continue;

                const cells = match.map(cell => cell.slice(1, -1));

                const password = {
                    id: utils.generateId(),
                    title: cells[0] || 'Imported',
                    username: cells[1] || '',
                    password: cells[2] || '',
                    url: cells[3] || '',
                    category: cells[4] || 'Other',
                    tags: cells[5] ? cells[5].split(';').map(t => t.trim()) : [],
                    notes: cells[6] || '',
                    favorite: false,
                    lastChangedAt: new Date().toISOString()
                };

                this.passwords.push(password);
                imported++;
            }

            await this.saveVault();
            this.render();
            utils.showToast(`Imported ${imported} passwords! 📥`, 'success');
        } catch (err) {
            utils.showToast('Import failed!', 'error');
        }
    },

    filterPasswords() {
        return this.passwords.filter(pwd => {
            if (this.searchQuery) {
                const query = this.searchQuery;
                return pwd.title.toLowerCase().includes(query) ||
                       pwd.username.toLowerCase().includes(query) ||
                       pwd.url.toLowerCase().includes(query) ||
                       pwd.tags.some(t => t.toLowerCase().includes(query));
            }
            return true;
        });
    },

    render() {
        const container = document.getElementById('passwords-table');
        const filtered = this.filterPasswords();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <p style="color: var(--text-muted); font-size: 1.1rem;">
                        ${this.searchQuery ? 'No passwords match your search' : '🔑 No passwords yet. Click "+ Password" to add one!'}
                    </p>
                </div>
            `;
            return;
        }

        const sorted = filtered.sort((a, b) => {
            if (a.favorite !== b.favorite) return b.favorite ? 1 : -1;
            return a.title.localeCompare(b.title);
        });

        container.innerHTML = sorted.map(pwd => this.renderPassword(pwd)).join('');

        sorted.forEach(pwd => {
            const favBtn = document.querySelector(`[data-pwd-id="${pwd.id}"] .favorite-btn`);
            favBtn.addEventListener('click', () => this.toggleFavorite(pwd.id));

            const copyUserBtn = document.querySelector(`[data-pwd-id="${pwd.id}"] .copy-user-btn`);
            copyUserBtn.addEventListener('click', () => this.copyUsername(pwd.username));

            const copyPwdBtn = document.querySelector(`[data-pwd-id="${pwd.id}"] .copy-pwd-btn`);
            copyPwdBtn.addEventListener('click', () => this.copyPassword(pwd.password));

            const revealBtn = document.querySelector(`[data-pwd-id="${pwd.id}"] .reveal-btn`);
            revealBtn.addEventListener('click', (e) => this.revealPassword(pwd.id, e.target));

            const editBtn = document.querySelector(`[data-pwd-id="${pwd.id}"] .edit-pwd-btn`);
            editBtn.addEventListener('click', () => this.showAddPasswordModal(pwd));

            const deleteBtn = document.querySelector(`[data-pwd-id="${pwd.id}"] .delete-pwd-btn`);
            deleteBtn.addEventListener('click', () => this.deletePassword(pwd.id));
        });
    },

    renderPassword(pwd) {
        return `
            <div class="password-row" data-pwd-id="${pwd.id}">
                <div class="password-favorite favorite-btn" style="cursor: pointer;">
                    ${pwd.favorite ? '⭐' : '☆'}
                </div>
                <div class="password-info">
                    <div class="password-title">${utils.sanitizeHTML(pwd.title)}</div>
                    <div class="password-username">${utils.sanitizeHTML(pwd.username)}</div>
                    ${pwd.url ? `<div class="password-url">${utils.sanitizeHTML(pwd.url)}</div>` : ''}
                </div>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div class="password-display" style="font-family: monospace;">••••••••</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${utils.formatDate(pwd.lastChangedAt)}</div>
                </div>
                <div class="password-actions">
                    <button class="icon-btn reveal-btn" title="Reveal (10s)">👁️</button>
                    <button class="icon-btn copy-user-btn" title="Copy Username">👤</button>
                    <button class="icon-btn copy-pwd-btn" title="Copy Password">📋</button>
                    <button class="icon-btn edit-pwd-btn" title="Edit">✏️</button>
                    <button class="icon-btn delete-pwd-btn" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }
};

window.VaultModule = VaultModule;
