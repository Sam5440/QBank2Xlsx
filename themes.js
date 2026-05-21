// Default theme only. The previous theme switcher has been removed.

const themes = {
    default: {
        name: '默认主题',
        description: '清晰、克制的默认工作台样式',
        icon: 'panel-top',
        colors: {
            primary: '#18181B',
            primaryForeground: '#FAFAFA',
            secondary: '#F4F4F5',
            secondaryForeground: '#18181B',
            cta: '#0F766E',
            background: '#FAFAFA',
            surface: '#FFFFFF',
            muted: '#F4F4F5',
            mutedForeground: '#71717A',
            textPrimary: '#09090B',
            textSecondary: '#71717A',
            border: '#E4E4E7',
            input: '#E4E4E7',
            ring: '#18181B',
            success: '#16A34A',
            error: '#DC2626',
            warning: '#D97706'
        },
        gradients: {
            body: '#FAFAFA',
            button: '#18181B',
            header: '#18181B'
        },
        shadows: {
            sm: '0 1px 2px rgba(24, 24, 27, 0.04)',
            md: '0 8px 18px rgba(24, 24, 27, 0.06)',
            lg: '0 18px 40px rgba(24, 24, 27, 0.08)',
            xl: '0 24px 60px rgba(24, 24, 27, 0.10)'
        },
        radius: {
            sm: '4px',
            md: '6px',
            lg: '8px',
            xl: '10px'
        },
        fonts: {
            heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            mono: "'SF Mono', 'Cascadia Mono', 'Consolas', monospace"
        }
    }
};

class ThemeManager {
    constructor() {
        this.currentTheme = 'default';
        this.styleElement = null;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    applyTheme(themeName = 'default', options = {}) {
        const theme = themes.default;
        this.currentTheme = 'default';

        if (options.persist !== false) {
            localStorage.setItem('selectedTheme', 'default');
            localStorage.removeItem('themePreferenceExplicit');
        }

        if (this.styleElement) {
            this.styleElement.remove();
        }

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'dynamic-theme';
        this.styleElement.textContent = this.generateThemeCSS(theme);
        document.head.appendChild(this.styleElement);

        document.body.className = 'theme-shadcn';
        window.dispatchEvent(new CustomEvent('themeChanged', {detail: {theme: 'default'}}));
    }

    generateThemeCSS(theme) {
        return `
            :root {
                --primary: ${theme.colors.primary};
                --primary-foreground: ${theme.colors.primaryForeground};
                --secondary: ${theme.colors.secondary};
                --secondary-foreground: ${theme.colors.secondaryForeground};
                --cta: ${theme.colors.cta};
                --background: ${theme.colors.background};
                --surface: ${theme.colors.surface};
                --muted: ${theme.colors.muted};
                --muted-foreground: ${theme.colors.mutedForeground};
                --text-primary: ${theme.colors.textPrimary};
                --text-secondary: ${theme.colors.textSecondary};
                --border: ${theme.colors.border};
                --input: ${theme.colors.input};
                --ring: ${theme.colors.ring};
                --success: ${theme.colors.success};
                --error: ${theme.colors.error};
                --warning: ${theme.colors.warning};
                --shadow-sm: ${theme.shadows.sm};
                --shadow-md: ${theme.shadows.md};
                --shadow-lg: ${theme.shadows.lg};
                --shadow-xl: ${theme.shadows.xl};
                --radius-sm: ${theme.radius.sm};
                --radius-md: ${theme.radius.md};
                --radius-lg: ${theme.radius.lg};
                --radius-xl: ${theme.radius.xl};
            }

            body {
                background: ${theme.gradients.body};
                color: var(--text-primary);
                font-family: ${theme.fonts.body};
            }

            h1, h2, h3, h4, h5, h6 {
                font-family: ${theme.fonts.heading};
            }

            textarea, pre, code {
                font-family: ${theme.fonts.mono};
            }

            button:not(.btn-clear):not(.close-btn):not(.action-btns button) {
                background: ${theme.gradients.button};
            }

            .header-icon,
            .log-header {
                background: ${theme.gradients.header};
            }

            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
    }

    getThemeList() {
        return [{
            id: 'default',
            ...themes.default
        }];
    }
}

const themeManager = new ThemeManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {themes, ThemeManager, themeManager};
}
