class ScrollDebouncer {
    static instance = null;

    constructor() {
        if (ScrollDebouncer.instance) {
            return ScrollDebouncer.instance;
        }

        this.scrollY = 0;
        this.previousScrollY = 0;
        this.callbacks = [];
        this.lastProgress = 0;
        this.lastTimestamp = 0;

        this.handleScroll = this.handleScroll.bind(this);
        this.update = this.update.bind(this);

        window.addEventListener('scroll', this.handleScroll, { passive: true });
        this.update();

        ScrollDebouncer.instance = this;
    }

    static getInstance() {
        if (!ScrollDebouncer.instance) {
            ScrollDebouncer.instance = new ScrollDebouncer();
        }
        return ScrollDebouncer.instance;
    }

    handleScroll(event) {
        this.update();
    }

    update() {
        this.scrollY = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? this.scrollY / docHeight : 0;

        this.callbacks.forEach(callback => {
            callback(this.scrollY, progress);
        });

        this.previousScrollY = this.scrollY;
        this.lastProgress = progress;
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
        ScrollDebouncer.instance = null;
    }
}

window.ScrollDebouncer = ScrollDebouncer;
