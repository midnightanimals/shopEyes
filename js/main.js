document.addEventListener('DOMContentLoaded', () => {
    // const themeSwitcher = {
    //     storageKey: 'theme-preference',
    //     theme: 'light',

    //     init() {
    //         this.theme = this.getColorPreference();
    //         this.reflectPreference();
    //         // Listener is set up after header is loaded.
    //     },

    //     getColorPreference() {
    //         const storedPref = localStorage.getItem(this.storageKey);
    //         if (storedPref) {
    //             return storedPref;
    //         }
    //         // Fallback to system preference
    //         return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    //     },

    //     setPreference(newTheme) {
    //         this.theme = newTheme;
    //         this.reflectPreference();
    //         localStorage.setItem(this.storageKey, newTheme);
    //     },

    //     reflectPreference() {
    //         document.documentElement.setAttribute('data-theme', this.theme);
    //     },

    //     toggleTheme() {
    //         const newTheme = this.theme === 'light' ? 'dark' : 'light';
    //         this.setPreference(newTheme);
    //     },
        
    //     setupToggle() {
    //         const toggleCheckbox = document.getElementById('theme-toggle');
    //         if (toggleCheckbox) {
    //             // Set initial state of checkbox
    //             toggleCheckbox.checked = (this.theme === 'dark');

    //             toggleCheckbox.addEventListener('change', () => {
    //                 this.toggleTheme();
    //             });
    //         }
    //     }
    // };
    
    // Initialize theme as soon as possible
    // themeSwitcher.init();

    const loadComponent = (selector, url, callback) => {
        const element = document.querySelector(selector);
        if (element) {
            fetch(url)
                .then(response => response.ok ? response.text() : Promise.reject('File not found.'))
                .then(data => {
                    element.innerHTML = data;
                    if (callback) {
                        callback();
                    }
                })
                .catch(error => console.error(`Error loading component from ${url}:`, error));
        }
    };

    // Load header, and THEN set up the toggle button listener
    loadComponent('#header-placeholder', '_header.html', () => {
        // themeSwitcher.setupToggle();
    });
    
    loadComponent('#footer-placeholder', '_footer.html');
});
