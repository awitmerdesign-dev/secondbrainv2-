const FocusModule = {
    isActive: false,
    currentPhase: 'inhale',
    cycleCount: 0,
    maxCycles: 4,

    init() {
        this.attachEventListeners();
    },

    attachEventListeners() {
        document.getElementById('start-focus-btn')?.addEventListener('click', () => {
            this.startFocusReset();
        });
    },

    startFocusReset() {
        this.isActive = true;
        this.cycleCount = 0;
        this.currentPhase = 'inhale';

        const overlay = document.getElementById('focus-overlay');
        overlay.innerHTML = `
            <div class="breathing-circle"></div>
            <div class="focus-text">Breathe in...</div>
            <div class="focus-counter">Cycle 1 of 4</div>
            <button class="secondary-btn" id="stop-focus-btn" style="margin-top: 40px;">Stop</button>
        `;
        overlay.classList.add('active');

        document.getElementById('stop-focus-btn').addEventListener('click', () => {
            this.stopFocusReset();
        });

        this.runCycle();
    },

    async runCycle() {
        if (!this.isActive) return;

        const circle = document.querySelector('.breathing-circle');
        const text = document.querySelector('.focus-text');
        const counter = document.querySelector('.focus-counter');

        const phases = [
            { name: 'inhale', duration: 4000, text: 'Breathe in...', class: 'inhale' },
            { name: 'hold1', duration: 4000, text: 'Hold...', class: 'hold' },
            { name: 'exhale', duration: 4000, text: 'Breathe out...', class: 'exhale' },
            { name: 'hold2', duration: 4000, text: 'Hold...', class: 'hold' }
        ];

        for (const phase of phases) {
            if (!this.isActive) return;

            this.currentPhase = phase.name;
            text.textContent = phase.text;
            circle.className = `breathing-circle ${phase.class}`;

            await this.sleep(phase.duration);
        }

        this.cycleCount++;
        counter.textContent = `Cycle ${this.cycleCount + 1} of ${this.maxCycles}`;

        if (this.cycleCount < this.maxCycles) {
            this.runCycle();
        } else {
            this.completeFocusReset();
        }
    },

    completeFocusReset() {
        this.isActive = false;
        const overlay = document.getElementById('focus-overlay');
        
        const text = document.querySelector('.focus-text');
        text.textContent = 'Nice reset! ✨';
        
        setTimeout(() => {
            overlay.classList.remove('active');
            utils.showToast('Great job! You completed the focus reset 🧘', 'success');
        }, 2000);
    },

    stopFocusReset() {
        this.isActive = false;
        const overlay = document.getElementById('focus-overlay');
        overlay.classList.remove('active');
    },

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

window.FocusModule = FocusModule;
