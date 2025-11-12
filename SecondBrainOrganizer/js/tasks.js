const TasksModule = {
    currentFilter: 'all',
    tasks: [],

    async init() {
        this.tasks = await DB.getAll('tasks');
        this.render();
        this.attachEventListeners();
    },

    attachEventListeners() {
        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        document.querySelectorAll('#today-tab .filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('#today-tab .filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.render();
            });
        });
    },

    showAddTaskModal() {
        const modalContent = `
            <div class="modal-header">
                <h3>Add Task</h3>
                <button class="close-btn" onclick="utils.closeModal()">&times;</button>
            </div>
            <form id="add-task-form">
                <div class="form-group">
                    <label>Type</label>
                    <select id="task-type" required>
                        <option value="note">📝 Note</option>
                        <option value="reminder">⏰ Reminder</option>
                        <option value="idea">💡 Idea</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Title *</label>
                    <input type="text" id="task-title" required placeholder="What's on your mind?">
                </div>
                <div class="form-group">
                    <label>Details</label>
                    <textarea id="task-details" placeholder="Add more details..."></textarea>
                </div>
                <div class="form-group">
                    <label>Due Date</label>
                    <input type="date" id="task-date">
                </div>
                <div class="form-group">
                    <label>Time</label>
                    <input type="time" id="task-time">
                </div>
                <div class="form-group">
                    <label>Priority</label>
                    <select id="task-priority">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tags (comma separated)</label>
                    <input type="text" id="task-tags" placeholder="work, personal, urgent">
                </div>
                <div class="button-group">
                    <button type="button" class="secondary-btn" onclick="utils.closeModal()">Cancel</button>
                    <button type="submit" class="primary-btn">Add Task</button>
                </div>
            </form>
        `;

        utils.openModal(modalContent);

        document.getElementById('add-task-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addTask();
        });
    },

    async addTask() {
        const task = {
            id: utils.generateId(),
            type: document.getElementById('task-type').value,
            title: document.getElementById('task-title').value,
            details: document.getElementById('task-details').value,
            dueDate: document.getElementById('task-date').value || null,
            time: document.getElementById('task-time').value || null,
            priority: document.getElementById('task-priority').value,
            tags: document.getElementById('task-tags').value.split(',').map(t => t.trim()).filter(t => t),
            completed: false,
            createdAt: new Date().toISOString()
        };

        await DB.add('tasks', task);
        this.tasks.push(task);
        utils.closeModal();
        this.render();
        utils.showToast('Task added!', 'success');

        if (task.dueDate && task.time) {
            this.scheduleNotification(task);
        }
    },

    async toggleComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;

        task.completed = !task.completed;
        await DB.put('tasks', task);

        const element = document.querySelector(`[data-task-id="${id}"]`);
        if (task.completed && element) {
            utils.showConfetti(element);
        }

        this.render();
        utils.showToast(task.completed ? 'Nice work! ✨' : 'Task reopened', 'success');
    },

    async deleteTask(id) {
        if (!confirm('Delete this task?')) return;

        await DB.delete('tasks', id);
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.render();
        utils.showToast('Task deleted', 'success');
    },

    scheduleNotification(task) {
        if (!task.dueDate || !task.time) return;

        const dueDateTime = new Date(`${task.dueDate}T${task.time}`);
        const now = new Date();
        const timeDiff = dueDateTime - now;

        if (timeDiff > 0 && timeDiff < 24 * 60 * 60 * 1000) {
            setTimeout(() => {
                utils.showNotification(task.title, {
                    body: task.details || 'You have a task due now',
                    tag: task.id
                });
            }, timeDiff);
        }
    },

    filterTasks() {
        return this.tasks.filter(task => {
            if (this.currentFilter === 'all') return true;
            if (this.currentFilter === 'completed') return task.completed;
            if (this.currentFilter === 'today') {
                return task.dueDate && utils.isToday(task.dueDate) && !task.completed;
            }
            if (this.currentFilter === 'upcoming') {
                return task.dueDate && utils.isFuture(task.dueDate) && !task.completed;
            }
            return true;
        });
    },

    render() {
        const container = document.getElementById('tasks-list');
        const filtered = this.filterTasks();

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <p style="color: var(--text-muted); font-size: 1.1rem;">
                        ${this.currentFilter === 'all' ? '📋 No tasks yet. Tap the + button to add one!' : 'No tasks in this view'}
                    </p>
                </div>
            `;
            return;
        }

        const sorted = filtered.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        container.innerHTML = sorted.map(task => this.renderTask(task)).join('');

        sorted.forEach(task => {
            const checkbox = document.querySelector(`[data-task-id="${task.id}"] .task-checkbox`);
            checkbox.addEventListener('click', () => this.toggleComplete(task.id));

            const deleteBtn = document.querySelector(`[data-task-id="${task.id}"] .delete-task-btn`);
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
            }
        });
    },

    renderTask(task) {
        const typeIcons = { note: '📝', reminder: '⏰', idea: '💡' };
        const icon = typeIcons[task.type] || '📋';

        let dueDateText = '';
        if (task.dueDate) {
            const daysUntil = utils.getDaysUntil(task.dueDate);
            if (utils.isToday(task.dueDate)) {
                dueDateText = `<span style="color: var(--warning-color);">Today</span>`;
            } else if (daysUntil === 1) {
                dueDateText = `<span style="color: var(--warning-color);">Tomorrow</span>`;
            } else if (daysUntil < 0) {
                dueDateText = `<span style="color: var(--danger-color);">Overdue</span>`;
            } else {
                dueDateText = utils.formatDate(task.dueDate);
            }
            if (task.time) {
                dueDateText += ` at ${utils.formatTime(task.time)}`;
            }
        }

        return `
            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}"></div>
                <div class="task-content">
                    <div class="task-title">${icon} ${utils.sanitizeHTML(task.title)}</div>
                    ${task.details ? `<div class="task-details">${utils.sanitizeHTML(task.details)}</div>` : ''}
                    <div class="task-meta">
                        ${task.priority !== 'medium' ? `<span class="badge priority-${task.priority}">${task.priority}</span>` : ''}
                        ${dueDateText ? `<span>📅 ${dueDateText}</span>` : ''}
                        ${task.tags.length > 0 ? task.tags.map(tag => `<span>🏷️ ${utils.sanitizeHTML(tag)}</span>`).join('') : ''}
                    </div>
                </div>
                <button class="icon-btn delete-task-btn">🗑️</button>
            </div>
        `;
    }
};

window.TasksModule = TasksModule;
