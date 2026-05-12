class ScrollDebouncer {
    static instance = null;

    constructor() {
        if (ScrollDebouncer.instance) {
            return ScrollDebouncer.instance;
        }

        this.scrollY = 0;
        this.previousScrollY = 0;
        this.requestId = null;
        this.isRunning = false;
        this.callbacks = [];
        this.lastProgress = 0;

        this.handleScroll = this.handleScroll.bind(this);
        this.update = this.update.bind(this);

        window.addEventListener('scroll', this.handleScroll);
        this.update();

        ScrollDebouncer.instance = this;
    }

    static getInstance() {
        if (!ScrollDebouncer.instance) {
            ScrollDebouncer.instance = new ScrollDebouncer();
        }
        return ScrollDebouncer.instance;
    }

    handleScroll() {
        this.scrollY = window.scrollY;
        if (!this.isRunning) {
            this.isRunning = true;
            this.requestId = requestAnimationFrame(this.update);
        }
    }

    update() {
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? this.scrollY / docHeight : 0;

        this.callbacks.forEach(callback => {
            callback(this.scrollY, progress);
        });

        this.previousScrollY = this.scrollY;
        this.lastProgress = progress;
        this.isRunning = false;

        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }

        if (this.scrollY !== this.previousScrollY) {
            this.requestId = requestAnimationFrame(this.update);
            this.isRunning = true;
        }
    }

    onScroll(callback) {
        if (typeof callback === 'function') {
            this.callbacks.push(callback);
            callback(this.scrollY, this.lastProgress);
        }
        return this;
    }

    offScroll(callback) {
        const index = this.callbacks.indexOf(callback);
        if (index > -1) {
            this.callbacks.splice(index, 1);
        }
        return this;
    }

    getScrollY() {
        return this.scrollY;
    }

    getProgress() {
        return this.lastProgress;
    }

    destroy() {
        window.removeEventListener('scroll', this.handleScroll);
        if (this.requestId) {
            cancelAnimationFrame(this.requestId);
        }
        ScrollDebouncer.instance = null;
    }
}

window.ScrollDebouncer = ScrollDebouncer;
