const BillsModule = {
    currentFilter: 'all',
    bills: [],

    async init() {
        this.bills = await DB.getAll('bills');
        this.updateNextRunDates();
        this.processAutoPay();
        this.render();
        this.attachEventListeners();
        
        setInterval(() => this.processAutoPay(), 60 * 60 * 1000);
    },

    attachEventListeners() {
        document.getElementById('add-bill-btn').addEventListener('click', () => {
            this.showAddBillModal();
        });

        document.getElementById('export-bills-btn').addEventListener('click', () => {
            this.exportCSV();
        });

        document.querySelectorAll('#bills-tab .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#bills-tab .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
    },

    showAddBillModal(bill = null) {
        const isEdit = !!bill;
        const modalContent = `
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'Add'} Bill</h3>
                <button class="close-btn" onclick="utils.closeModal()">&times;</button>
            </div>
            <form id="add-bill-form">
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" id="bill-title" required value="${bill ? bill.title : ''}" placeholder="e.g., Electric Bill">
                </div>
                <div class="form-group">
                    <label>Amount</label>
                    <input type="number" id="bill-amount" step="0.01" value="${bill ? bill.amount : ''}" placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Start Date *</label>
                    <input type="date" id="bill-start-date" required value="${bill ? bill.startDate : ''}">
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <input type="time" id="bill-time" value="${bill ? bill.timeOfDay : '09:00'}">
                </div>
                <div class="form-group">
                    <label>Frequency *</label>
                    <select id="bill-frequency" required>
                        <option value="weekly" ${bill?.recurrence?.freq === 'weekly' ? 'selected' : ''}>Weekly</option>
                        <option value="monthly" ${!bill || bill?.recurrence?.freq === 'monthly' ? 'selected' : ''}>Monthly</option>
                        <option value="yearly" ${bill?.recurrence?.freq === 'yearly' ? 'selected' : ''}>Yearly</option>
                    </select>
                </div>
                <div class="form-group" id="monthly-options" style="${!bill || bill?.recurrence?.freq === 'monthly' ? '' : 'display:none;'}">
                    <label>On Day</label>
                    <select id="bill-monthday">
                        <option value="date">Specific Date</option>
                        <option value="last" ${bill?.recurrence?.lastDayOfMonth ? 'selected' : ''}>Last Day of Month</option>
                    </select>
                    <input type="number" id="bill-monthday-num" min="1" max="31" value="${bill?.recurrence?.byMonthDay || 1}" style="${bill?.recurrence?.lastDayOfMonth ? 'display:none;' : ''}">
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bill-skip-weekends" ${bill?.recurrence?.skipWeekends ? 'checked' : ''}>
                        Skip weekends (move to next Monday)
                    </label>
                </div>
                <div class="form-group">
                    <label>
                        <input type="checkbox" id="bill-autopay" ${bill?.autoPay ? 'checked' : ''}>
                        Auto Pay
                    </label>
                </div>
                <div class="form-group" id="autopay-day-group" style="${bill?.autoPay ? '' : 'display:none;'}">
                    <label>Auto Pay Day (days before due date, 0 = same day)</label>
                    <input type="number" id="bill-autopay-day" min="0" max="30" value="${bill?.autoPayDay || 0}">
                </div>
                <div class="form-group">
                    <label>Remind Me (days before)</label>
                    <input type="text" id="bill-reminders" placeholder="e.g., 3, 1" value="${bill?.remindOffsets?.join(', ') || '3, 1'}">
                </div>
                <div class="form-group">
                    <label>Notes</label>
                    <textarea id="bill-notes" placeholder="Additional notes...">${bill?.notes || ''}</textarea>
                </div>
                <div class="button-group">
                    <button type="button" class="secondary-btn" onclick="utils.closeModal()">Cancel</button>
                    <button type="submit" class="primary-btn">${isEdit ? 'Update' : 'Add'} Bill</button>
                </div>
            </form>
        `;

        utils.openModal(modalContent);

        document.getElementById('bill-frequency').addEventListener('change', (e) => {
            document.getElementById('monthly-options').style.display = e.target.value === 'monthly' ? 'block' : 'none';
        });

        document.getElementById('bill-monthday').addEventListener('change', (e) => {
            document.getElementById('bill-monthday-num').style.display = e.target.value === 'last' ? 'none' : 'block';
        });

        document.getElementById('bill-autopay').addEventListener('change', (e) => {
            document.getElementById('autopay-day-group').style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('add-bill-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (isEdit) {
                await this.updateBill(bill.id);
            } else {
                await this.addBill();
            }
        });
    },

    async addBill() {
        const frequency = document.getElementById('bill-frequency').value;
        const isLastDay = document.getElementById('bill-monthday').value === 'last';
        const reminders = document.getElementById('bill-reminders').value
            .split(',')
            .map(r => parseInt(r.trim()))
            .filter(r => !isNaN(r));

        const bill = {
            id: utils.generateId(),
            title: document.getElementById('bill-title').value,
            amount: parseFloat(document.getElementById('bill-amount').value) || 0,
            startDate: document.getElementById('bill-start-date').value,
            timeOfDay: document.getElementById('bill-time').value,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            recurrence: {
                freq: frequency,
                interval: 1,
                byMonthDay: isLastDay ? null : parseInt(document.getElementById('bill-monthday-num').value),
                lastDayOfMonth: isLastDay,
                skipWeekends: document.getElementById('bill-skip-weekends').checked
            },
            remindOffsets: reminders,
            autoPay: document.getElementById('bill-autopay').checked,
            autoPayDay: parseInt(document.getElementById('bill-autopay-day').value) || 0,
            notes: document.getElementById('bill-notes').value,
            paidHistory: [],
            nextRunAt: null,
            lastRunAt: null,
            lastPaidAt: null,
            archived: false,
            createdAt: new Date().toISOString()
        };

        bill.nextRunAt = this.calculateNextRun(bill);
        if (bill.autoPay) {
            bill.autoNextDate = this.calculateAutoPayDate(bill);
        }

        await DB.add('bills', bill);
        this.bills.push(bill);
        utils.closeModal();
        this.render();
        utils.showToast('Bill added!', 'success');
    },

    async updateBill(id) {
        const bill = this.bills.find(b => b.id === id);
        if (!bill) return;

        const frequency = document.getElementById('bill-frequency').value;
        const isLastDay = document.getElementById('bill-monthday').value === 'last';
        const reminders = document.getElementById('bill-reminders').value
            .split(',')
            .map(r => parseInt(r.trim()))
            .filter(r => !isNaN(r));

        bill.title = document.getElementById('bill-title').value;
        bill.amount = parseFloat(document.getElementById('bill-amount').value) || 0;
        bill.startDate = document.getElementById('bill-start-date').value;
        bill.timeOfDay = document.getElementById('bill-time').value;
        bill.recurrence = {
            freq: frequency,
            interval: 1,
            byMonthDay: isLastDay ? null : parseInt(document.getElementById('bill-monthday-num').value),
            lastDayOfMonth: isLastDay,
            skipWeekends: document.getElementById('bill-skip-weekends').checked
        };
        bill.remindOffsets = reminders;
        bill.autoPay = document.getElementById('bill-autopay').checked;
        bill.autoPayDay = parseInt(document.getElementById('bill-autopay-day').value) || 0;
        bill.notes = document.getElementById('bill-notes').value;

        bill.nextRunAt = this.calculateNextRun(bill);
        if (bill.autoPay) {
            bill.autoNextDate = this.calculateAutoPayDate(bill);
        }

        await DB.put('bills', bill);
        utils.closeModal();
        this.render();
        utils.showToast('Bill updated!', 'success');
    },

    calculateNextRun(bill) {
        const start = new Date(bill.startDate);
        const now = new Date();
        let next = new Date(start);

        if (bill.recurrence.freq === 'weekly') {
            while (next <= now) {
                next.setDate(next.getDate() + 7);
            }
        } else if (bill.recurrence.freq === 'monthly') {
            while (next <= now) {
                next.setMonth(next.getMonth() + 1);
            }
            
            if (bill.recurrence.lastDayOfMonth) {
                next = new Date(next.getFullYear(), next.getMonth() + 1, 0);
            } else if (bill.recurrence.byMonthDay) {
                next.setDate(Math.min(bill.recurrence.byMonthDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
            }
        } else if (bill.recurrence.freq === 'yearly') {
            while (next <= now) {
                next.setFullYear(next.getFullYear() + 1);
            }
        }

        if (bill.recurrence.skipWeekends) {
            const day = next.getDay();
            if (day === 0) next.setDate(next.getDate() + 1);
            else if (day === 6) next.setDate(next.getDate() + 2);
        }

        return next.toISOString();
    },

    calculateAutoPayDate(bill) {
        const nextRun = new Date(bill.nextRunAt);
        const autoPayDate = new Date(nextRun);
        autoPayDate.setDate(autoPayDate.getDate() - (bill.autoPayDay || 0));
        return autoPayDate.toISOString();
    },

    async markPaid(id, isAutoPay = false) {
        const bill = this.bills.find(b => b.id === id);
        if (!bill) return;

        const payment = {
            id: utils.generateId(),
            occurredAt: bill.nextRunAt,
            paidAt: new Date().toISOString(),
            amount: bill.amount,
            method: isAutoPay ? 'auto' : 'manual',
            note: ''
        };

        bill.paidHistory.push(payment);
        bill.lastPaidAt = payment.paidAt;
        bill.lastRunAt = bill.nextRunAt;
        bill.nextRunAt = this.calculateNextRun(bill);
        
        if (bill.autoPay) {
            bill.autoNextDate = this.calculateAutoPayDate(bill);
        }

        await DB.put('bills', bill);
        this.render();
        utils.showToast(`${bill.title} marked as paid! 💰`, 'success');
    },

    async deleteBill(id) {
        if (!confirm('Delete this bill?')) return;

        await DB.delete('bills', id);
        this.bills = this.bills.filter(b => b.id !== id);
        this.render();
        utils.showToast('Bill deleted', 'success');
    },

    async processAutoPay() {
        const now = new Date();
        
        for (const bill of this.bills) {
            if (!bill.autoPay || !bill.autoNextDate) continue;
            
            const autoPayDate = new Date(bill.autoNextDate);
            if (now >= autoPayDate) {
                const lastPayment = bill.paidHistory[bill.paidHistory.length - 1];
                if (!lastPayment || lastPayment.occurredAt !== bill.nextRunAt) {
                    await this.markPaid(bill.id, true);
                }
            }
        }
    },

    updateNextRunDates() {
        let updated = false;
        this.bills.forEach(bill => {
            const next = new Date(bill.nextRunAt);
            const now = new Date();
            if (next <= now) {
                bill.nextRunAt = this.calculateNextRun(bill);
                if (bill.autoPay) {
                    bill.autoNextDate = this.calculateAutoPayDate(bill);
                }
                DB.put('bills', bill);
                updated = true;
            }
        });
        if (updated) {
            this.render();
        }
    },

    filterBills() {
        return this.bills.filter(bill => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'autopay') return bill.autoPay;
            if (this.currentFilter === 'paid') {
                return bill.paidHistory.some(p => p.occurredAt === bill.lastRunAt);
            }
            if (this.currentFilter === 'unpaid') {
                const lastPayment = bill.paidHistory[bill.paidHistory.length - 1];
                return !lastPayment || lastPayment.occurredAt !== bill.nextRunAt;
            }
            return true;
        });
    },

    exportCSV() {
        const headers = ['Bill', 'Due Date', 'Paid Date', 'Amount', 'Method', 'Note'];
        const rows = [headers];

        this.bills.forEach(bill => {
            bill.paidHistory.forEach(payment => {
                rows.push([
                    bill.title,
                    utils.formatDateTime(payment.occurredAt),
                    utils.formatDateTime(payment.paidAt),
                    `$${payment.amount.toFixed(2)}`,
                    payment.method,
                    payment.note || ''
                ]);
            });
        });

        const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        utils.downloadFile(csv, `bills-history-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        utils.showToast('CSV exported!', 'success');
    },

    render() {
        const container = document.getElementById('bills-list');
        const filtered = this.filterBills();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <p style="color: var(--text-muted); font-size: 1.1rem;">
                        ${this.currentFilter === 'all' ? '💰 No bills yet. Click "+ Bill" to add one!' : 'No bills in this view'}
                    </p>
                </div>
            `;
            return;
        }

        const sorted = filtered.sort((a, b) => new Date(a.nextRunAt) - new Date(b.nextRunAt));

        const grouped = {
            overdue: sorted.filter(b => utils.isPast(b.nextRunAt)),
            today: sorted.filter(b => utils.isToday(b.nextRunAt)),
            upcoming: sorted.filter(b => utils.isFuture(b.nextRunAt) && !utils.isToday(b.nextRunAt))
        };

        let html = '';

        if (grouped.overdue.length > 0) {
            html += '<h3 style="margin-bottom: 16px; color: var(--danger-color);">⚠️ Overdue</h3>';
            html += grouped.overdue.map(b => this.renderBill(b)).join('');
        }

        if (grouped.today.length > 0) {
            html += '<h3 style="margin-bottom: 16px; margin-top: 24px;">📅 Due Today</h3>';
            html += grouped.today.map(b => this.renderBill(b)).join('');
        }

        if (grouped.upcoming.length > 0) {
            html += '<h3 style="margin-bottom: 16px; margin-top: 24px;">📆 Upcoming</h3>';
            html += grouped.upcoming.map(b => this.renderBill(b)).join('');
        }

        container.innerHTML = html;

        sorted.forEach(bill => {
            const paidBtn = document.querySelector(`[data-bill-id="${bill.id}"] .mark-paid-btn`);
            if (paidBtn) {
                paidBtn.addEventListener('click', () => this.markPaid(bill.id));
            }

            const editBtn = document.querySelector(`[data-bill-id="${bill.id}"] .edit-bill-btn`);
            if (editBtn) {
                editBtn.addEventListener('click', () => this.showAddBillModal(bill));
            }

            const deleteBtn = document.querySelector(`[data-bill-id="${bill.id}"] .delete-bill-btn`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteBill(bill.id));
            }
        });
    },

    renderBill(bill) {
        const daysUntil = utils.getDaysUntil(bill.nextRunAt);
        const isOverdue = daysUntil < 0;
        const lastPayment = bill.paidHistory[bill.paidHistory.length - 1];
        const isPaidForNext = lastPayment && lastPayment.occurredAt === bill.nextRunAt;

        return `
            <div class="bill-item" data-bill-id="${bill.id}">
                <div class="task-content" style="flex: 1;">
                    <div class="task-title">
                        ${utils.sanitizeHTML(bill.title)}
                        ${bill.autoPay ? '<span class="badge autopay">Auto Pay</span>' : ''}
                        ${isOverdue ? '<span class="badge overdue">Overdue</span>' : ''}
                    </div>
                    <div class="bill-amount">$${bill.amount.toFixed(2)}</div>
                    <div class="task-meta">
                        <span>📅 Due: ${utils.formatDate(bill.nextRunAt)}</span>
                        ${bill.autoPay ? `<span>🤖 Auto-pays ${bill.autoPayDay === 0 ? 'on due date' : bill.autoPayDay + ' days before'}</span>` : ''}
                        <span>🔄 ${bill.recurrence.freq}</span>
                        ${bill.paidHistory.length > 0 ? `<span>✓ Paid ${bill.paidHistory.length} times</span>` : ''}
                    </div>
                    ${isPaidForNext ? '<div style="color: var(--success-color); margin-top: 8px;">✓ Paid</div>' : ''}
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${!isPaidForNext && !bill.autoPay ? '<button class="icon-btn mark-paid-btn">✓ Paid</button>' : ''}
                    <button class="icon-btn edit-bill-btn">✏️</button>
                    <button class="icon-btn delete-bill-btn">🗑️</button>
                </div>
            </div>
        `;
    }
};

window.BillsModule = BillsModule;
