// i18n - Internationalization Module
class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('voicehub_lang') || this.detectLanguage();
        this.translations = {};
        this.loaded = false;
    }

    detectLanguage() {
        const browserLang = navigator.language.split('-')[0];
        return ['tr', 'en'].includes(browserLang) ? browserLang : 'en';
    }

    async loadLanguage(lang) {
        try {
            const response = await fetch(`locales/${lang}.json`);
            if (!response.ok) throw new Error('Language file not found');
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('voicehub_lang', lang);
            this.loaded = true;
            return true;
        } catch (err) {
            console.error('Failed to load language:', err);
            // Fallback to default translations
            if (lang !== 'tr') {
                return this.loadLanguage('tr');
            }
            return false;
        }
    }

    t(key, params = {}) {
        const keys = key.split('.');
        let value = this.translations;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return key; // Return key if translation not found
            }
        }

        if (typeof value === 'string') {
            // Replace {param} placeholders
            return value.replace(/\{(\w+)\}/g, (match, param) => {
                return params[param] !== undefined ? params[param] : match;
            });
        }

        return key;
    }

    async setLanguage(lang) {
        await this.loadLanguage(lang);
        this.updateUI();
        this.updateLangSelector();
    }

    updateUI() {
        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const attr = el.getAttribute('data-i18n-attr');

            if (attr) {
                el.setAttribute(attr, this.t(key));
            } else {
                el.textContent = this.t(key);
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            el.placeholder = this.t(key);
        });

        // Update title
        document.title = this.t('app.title');
    }

    updateLangSelector() {
        const selector = document.getElementById('lang-selector');
        if (selector) {
            const buttons = selector.querySelectorAll('.lang-btn');
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
            });
        }
    }

    getCurrentLang() {
        return this.currentLang;
    }
}

// Create global instance
window.i18n = new I18n();
