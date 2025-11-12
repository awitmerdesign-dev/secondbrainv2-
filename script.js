class App {
    constructor() {
        this.currentTab = 'today';
        this.isFirstRun = false;
    }

    async init() {
        await DB.init();
        await this.checkFirstRun();
        
        await Promise.all([
            TasksModule.init(),
            BillsModule.init(),
            VaultModule.init(),
            FocusModule.init(),
            SettingsModule.init()
        ]);

        this.setupNavigation();
        this.registerServiceWorker();

        console.log('🧠 Second Brain initialized!');
    }

    async checkFirstRun() {
        const hasRun = await DB.getSetting('hasRun', false);
        
        if (!hasRun) {
            this.isFirstRun = true;
            await this.seedInitialData();
            await DB.setSetting('hasRun', true);
            utils.showToast('Welcome to Second Brain! 🧠', 'success');
        }
    }

    async seedInitialData() {
        const tasks = await DB.getAll('tasks');
        if (tasks.length === 0) {
            const sampleTask = {
                id: utils.generateId(),
                type: 'note',
                title: 'Welcome to Second Brain!',
                details: 'This is your ADHD-friendly personal organizer. Add tasks, track bills, manage passwords, and reset your focus anytime.',
                dueDate: null,
                time: null,
                priority: 'medium',
                tags: ['welcome'],
                completed: false,
                createdAt: new Date().toISOString()
            };

            const sampleReminder = {
                id: utils.generateId(),
                type: 'reminder',
                title: 'Try the Focus Reset',
                details: 'Take a 60-second breathing break in the Focus tab',
                dueDate: new Date().toISOString().split('T')[0],
                time: '14:00',
                priority: 'low',
                tags: ['self-care'],
                completed: false,
                createdAt: new Date().toISOString()
            };

            await DB.add('tasks', sampleTask);
            await DB.add('tasks', sampleReminder);
        }

        const bills = await DB.getAll('bills');
        if (bills.length === 0) {
            const today = new Date();
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

            const sampleBills = [
                {
                    id: utils.generateId(),
                    title: 'Car Payment',
                    amount: 450.00,
                    startDate: new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0],
                    timeOfDay: '09:00',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    recurrence: {
                        freq: 'monthly',
                        interval: 1,
                        byMonthDay: 15,
                        lastDayOfMonth: false,
                        skipWeekends: false
                    },
                    remindOffsets: [3, 1],
                    autoPay: false,
                    autoPayDay: 0,
                    notes: 'Sample bill - edit or delete as needed',
                    paidHistory: [],
                    nextRunAt: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 15).toISOString(),
                    lastRunAt: null,
                    lastPaidAt: null,
                    archived: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: utils.generateId(),
                    title: 'Internet',
                    amount: 79.99,
                    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                    timeOfDay: '09:00',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    recurrence: {
                        freq: 'monthly',
                        interval: 1,
                        byMonthDay: null,
                        lastDayOfMonth: true,
                        skipWeekends: true
                    },
                    remindOffsets: [3],
                    autoPay: true,
                    autoPayDay: 0,
                    notes: 'Auto-pay enabled',
                    paidHistory: [],
                    nextRunAt: null,
                    lastRunAt: null,
                    lastPaidAt: null,
                    archived: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: utils.generateId(),
                    title: 'Mortgage',
                    amount: 1850.00,
                    startDate: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                    timeOfDay: '09:00',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    recurrence: {
                        freq: 'monthly',
                        interval: 1,
                        byMonthDay: 1,
                        lastDayOfMonth: false,
                        skipWeekends: false
                    },
                    remindOffsets: [5, 1],
                    autoPay: false,
                    autoPayDay: 0,
                    notes: '',
                    paidHistory: [],
                    nextRunAt: nextMonth.toISOString(),
                    lastRunAt: null,
                    lastPaidAt: null,
                    archived: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: utils.generateId(),
                    title: 'Spotify',
                    amount: 10.99,
                    startDate: new Date(today.getFullYear(), today.getMonth(), 12).toISOString().split('T')[0],
                    timeOfDay: '09:00',
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    recurrence: {
                        freq: 'monthly',
                        interval: 1,
                        byMonthDay: 12,
                        lastDayOfMonth: false,
                        skipWeekends: false
                    },
                    remindOffsets: [1],
                    autoPay: true,
                    autoPayDay: 0,
                    notes: 'Premium subscription',
                    paidHistory: [],
                    nextRunAt: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 12).toISOString(),
                    lastRunAt: null,
                    lastPaidAt: null,
                    archived: false,
                    createdAt: new Date().toISOString()
                }
            ];

            for (const bill of sampleBills) {
                bill.nextRunAt = BillsModule.calculateNextRun(bill);
                if (bill.autoPay) {
                    bill.autoNextDate = BillsModule.calculateAutoPayDate(bill);
                }
                await DB.add('bills', bill);
            }
        }
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
        const activeContent = document.getElementById(`${tabName}-tab`);

        if (activeBtn) activeBtn.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        this.currentTab = tabName;

        if (tabName === 'vault' && VaultModule.isUnlocked) {
            VaultModule.resetAutoLock();
        }
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered:', registration);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }
    }
}

const app = new App();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
} else {
    app.init();
}
