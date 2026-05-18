// Theme Configuration System for QBank2Xlsx
// Supports multiple UI styles with dynamic switching

const themes = {
    modern: {
        name: '现代风格',
        description: 'Glassmorphism + 渐变背景',
        icon: 'sparkles',
        colors: {
            primary: '#2563EB',
            secondary: '#3B82F6',
            cta: '#F97316',
            background: '#F8FAFC',
            surface: '#FFFFFF',
            textPrimary: '#1E293B',
            textSecondary: '#64748B',
            border: '#E2E8F0',
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B'
        },
        gradients: {
            body: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #BFDBFE 100%)',
            button: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
            header: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)'
        },
        shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        },
        radius: {
            sm: '6px',
            md: '10px',
            lg: '14px',
            xl: '18px'
        },
        fonts: {
            heading: "'Poppins', sans-serif",
            body: "'Open Sans', sans-serif",
            mono: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }
    },

    minimal: {
        name: '极简风格',
        description: '简洁纯净，专注内容',
        icon: 'minimize-2',
        colors: {
            primary: '#000000',
            secondary: '#333333',
            cta: '#000000',
            background: '#FFFFFF',
            surface: '#FAFAFA',
            textPrimary: '#000000',
            textSecondary: '#666666',
            border: '#E0E0E0',
            success: '#2E7D32',
            error: '#C62828',
            warning: '#F57C00'
        },
        gradients: {
            body: '#FFFFFF',
            button: '#000000',
            header: '#000000'
        },
        shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            md: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
            lg: '0 4px 8px 0 rgba(0, 0, 0, 0.08)',
            xl: '0 8px 16px 0 rgba(0, 0, 0, 0.1)'
        },
        radius: {
            sm: '2px',
            md: '4px',
            lg: '6px',
            xl: '8px'
        },
        fonts: {
            heading: "'Inter', -apple-system, sans-serif",
            body: "'Inter', -apple-system, sans-serif",
            mono: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }
    },

    dark: {
        name: '暗黑模式',
        description: '护眼深色主题',
        icon: 'moon',
        colors: {
            primary: '#60A5FA',
            secondary: '#3B82F6',
            cta: '#FB923C',
            background: '#0F172A',
            surface: '#1E293B',
            textPrimary: '#F1F5F9',
            textSecondary: '#94A3B8',
            border: '#334155',
            success: '#34D399',
            error: '#F87171',
            warning: '#FBBF24'
        },
        gradients: {
            body: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)',
            button: 'linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%)',
            header: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)'
        },
        shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
            md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
            lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            xl: '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
        },
        radius: {
            sm: '6px',
            md: '10px',
            lg: '14px',
            xl: '18px'
        },
        fonts: {
            heading: "'Poppins', sans-serif",
            body: "'Open Sans', sans-serif",
            mono: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }
    },

    neumorphism: {
        name: '新拟态',
        description: 'Soft UI 柔和立体',
        icon: 'layers',
        colors: {
            primary: '#5B8DEF',
            secondary: '#7BA5F4',
            cta: '#FF6B6B',
            background: '#E0E5EC',
            surface: '#E0E5EC',
            textPrimary: '#2C3E50',
            textSecondary: '#7F8C8D',
            border: '#D1D9E6',
            success: '#51CF66',
            error: '#FF6B6B',
            warning: '#FFD93D'
        },
        gradients: {
            body: '#E0E5EC',
            button: 'linear-gradient(145deg, #5B8DEF, #4A7DD9)',
            header: 'linear-gradient(145deg, #5B8DEF, #4A7DD9)'
        },
        shadows: {
            sm: '2px 2px 4px #A3B1C6, -2px -2px 4px #FFFFFF',
            md: '4px 4px 8px #A3B1C6, -4px -4px 8px #FFFFFF',
            lg: '8px 8px 16px #A3B1C6, -8px -8px 16px #FFFFFF',
            xl: '12px 12px 24px #A3B1C6, -12px -12px 24px #FFFFFF'
        },
        radius: {
            sm: '8px',
            md: '12px',
            lg: '16px',
            xl: '20px'
        },
        fonts: {
            heading: "'Poppins', sans-serif",
            body: "'Open Sans', sans-serif",
            mono: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }
    },

    vibrant: {
        name: '活力彩色',
        description: '鲜艳多彩，充满活力',
        icon: 'zap',
        colors: {
            primary: '#8B5CF6',
            secondary: '#A78BFA',
            cta: '#F59E0B',
            background: '#FAFAFA',
            surface: '#FFFFFF',
            textPrimary: '#1F2937',
            textSecondary: '#6B7280',
            border: '#E5E7EB',
            success: '#10B981',
            error: '#EF4444',
            warning: '#F59E0B'
        },
        gradients: {
            body: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 25%, #FCA5A5 50%, #C084FC 75%, #A78BFA 100%)',
            button: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
            header: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'
        },
        shadows: {
            sm: '0 1px 2px 0 rgba(139, 92, 246, 0.1)',
            md: '0 4px 6px -1px rgba(139, 92, 246, 0.2)',
            lg: '0 10px 15px -3px rgba(139, 92, 246, 0.3)',
            xl: '0 20px 25px -5px rgba(139, 92, 246, 0.4)'
        },
        radius: {
            sm: '8px',
            md: '12px',
            lg: '16px',
            xl: '20px'
        },
        fonts: {
            heading: "'Poppins', sans-serif",
            body: "'Open Sans', sans-serif",
            mono: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }
    },

    professional: {
        name: '专业商务',
        description: '稳重大气，商务风格',
        icon: 'briefcase',
        colors: {
            primary: '#1E40AF',
            secondary: '#3B82F6',
            cta: '#DC2626',
            background: '#F9FAFB',
            surface: '#FFFFFF',
            textPrimary: '#111827',
            textSecondary: '#6B7280',
            border: '#D1D5DB',
            success: '#059669',
            error: '#DC2626',
            warning: '#D97706'
        },
        gradients: {
            body: 'linear-gradient(180deg, #F9FAFB 0%, #F3F4F6 100%)',
            button: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)',
            header: 'linear-gradient(135deg, #1E40AF 0%, #1E3A8A 100%)'
        },
        shadows: {
            sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        },
        radius: {
            sm: '4px',
            md: '6px',
            lg: '8px',
            xl: '12px'
        },
        fonts: {
            heading: "'Inter', -apple-system, sans-serif",
            body: "'Inter', -apple-system, sans-serif",
            mono: "'SF Mono', 'Monaco', 'Courier New', monospace"
        }
    }
};

// Theme Manager Class
class ThemeManager {
    constructor() {
        this.currentTheme = this.loadTheme() || 'modern';
        this.styleElement = null;
    }

    loadTheme() {
        return localStorage.getItem('selectedTheme');
    }

    saveTheme(themeName) {
        localStorage.setItem('selectedTheme', themeName);
    }

    applyTheme(themeName) {
        if (!themes[themeName]) {
            console.error(`Theme "${themeName}" not found`);
            return;
        }

        const theme = themes[themeName];
        this.currentTheme = themeName;
        this.saveTheme(themeName);

        // Remove existing theme style
        if (this.styleElement) {
            this.styleElement.remove();
        }

        // Create new style element
        this.styleElement = document.createElement('style');
        this.styleElement.id = 'dynamic-theme';
        this.styleElement.textContent = this.generateThemeCSS(theme);
        document.head.appendChild(this.styleElement);

        // Update body class
        document.body.className = `theme-${themeName}`;

        // Dispatch theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: themeName } }));

        // Log theme change
        if (typeof addLog === 'function') {
            addLog('切换主题', `已切换到: ${theme.name}`);
        }
    }

    generateThemeCSS(theme) {
        return `
            :root {
                --primary: ${theme.colors.primary};
                --secondary: ${theme.colors.secondary};
                --cta: ${theme.colors.cta};
                --background: ${theme.colors.background};
                --surface: ${theme.colors.surface};
                --text-primary: ${theme.colors.textPrimary};
                --text-secondary: ${theme.colors.textSecondary};
                --border: ${theme.colors.border};
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
                font-family: ${theme.fonts.body};
                color: var(--text-primary);
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

            .header-icon {
                background: ${theme.gradients.header};
            }

            .log-header {
                background: ${theme.gradients.header};
            }

            /* Neumorphism specific styles */
            ${this.currentTheme === 'neumorphism' ? `
                .section {
                    background: var(--surface);
                    box-shadow: var(--shadow-md);
                    border: none;
                }

                .section:hover {
                    box-shadow: var(--shadow-lg);
                }

                input, textarea, select {
                    background: var(--surface);
                    box-shadow: inset 2px 2px 4px #A3B1C6, inset -2px -2px 4px #FFFFFF;
                    border: none;
                }

                button:not(.btn-clear):not(.close-btn) {
                    box-shadow: var(--shadow-md);
                }

                button:not(.btn-clear):not(.close-btn):hover {
                    box-shadow: var(--shadow-sm);
                }

                button:not(.btn-clear):not(.close-btn):active {
                    box-shadow: inset 2px 2px 4px #A3B1C6, inset -2px -2px 4px #FFFFFF;
                }
            ` : ''}

            /* Dark mode specific adjustments */
            ${this.currentTheme === 'dark' ? `
                .output {
                    background: #0F172A;
                    color: #F1F5F9;
                    border-color: #334155;
                }

                .output.invalid {
                    background: #450a0a;
                    color: #FCA5A5;
                    border-color: #DC2626;
                }

                input, textarea, select {
                    background: #1E293B;
                    color: var(--text-primary);
                    border-color: var(--border);
                }

                .api-row {
                    background: #1E293B;
                }

                .type-item {
                    background: #1E293B;
                }

                .modal-content {
                    background: #1E293B;
                }

                .log-panel {
                    background: #1E293B;
                }

                .log-entry {
                    background: #0F172A;
                }
            ` : ''}

            /* Minimal theme adjustments */
            ${this.currentTheme === 'minimal' ? `
                .section {
                    border: 1px solid var(--border);
                }

                .section:hover {
                    border-color: var(--primary);
                    transform: none;
                }

                button:not(.btn-clear):not(.close-btn) {
                    border-radius: var(--radius-sm);
                }

                .header-icon {
                    border-radius: var(--radius-sm);
                }
            ` : ''}

            /* Smooth transitions with reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                *, *::before, *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    getThemeList() {
        return Object.keys(themes).map(key => ({
            id: key,
            ...themes[key]
        }));
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { themes, ThemeManager, themeManager };
}
