// ============================================
// PariRakṣati — Hash-Based SPA Router
// ============================================
const Router = {
  _routes: {},
  _currentScreen: null,

  register(name, initFn) {
    this._routes[name] = initFn;
  },

  navigate(screen) {
    if (this._currentScreen === screen) return;

    // Hide current screen
    const current = document.querySelector('.screen.active');
    if (current) {
      current.classList.remove('active');
    }

    // Show new screen
    const next = document.getElementById(`screen-${screen}`);
    if (next) {
      next.classList.add('active');
      // Trigger init if registered
      if (this._routes[screen]) {
        this._routes[screen]();
      }
    }

    this._currentScreen = screen;
    Store.set('currentScreen', screen);

    // Update bottom nav
    this._updateNav(screen);

    // Update hash without triggering hashchange
    const newHash = `#${screen}`;
    if (window.location.hash !== newHash) {
      history.replaceState(null, '', newHash);
    }
  },

  _updateNav(screen) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      const target = item.dataset.screen;
      item.classList.toggle('active', target === screen);
    });

    // Show/hide bottom nav based on screen
    const nav = document.getElementById('bottom-nav');
    if (nav) {
      const hideOn = ['splash', 'login', 'emergency', 'fake-call'];
      nav.classList.toggle('hidden', hideOn.includes(screen));
    }
  },

  init() {
    // Handle hash changes
    window.addEventListener('hashchange', () => {
      const screen = window.location.hash.slice(1) || 'home';
      this.navigate(screen);
    });

    // Handle back button
    window.addEventListener('popstate', () => {
      const screen = window.location.hash.slice(1) || 'home';
      this.navigate(screen);
    });
  },

  getCurrentScreen() {
    return this._currentScreen;
  }
};
