import { ref, watch } from 'vue';

type Theme = 'light' | 'dark' | 'auto';

const theme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'auto');

const applyTheme = (newTheme: Theme) => {
    const isDark =
        newTheme === 'dark' || (newTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
};

const setupTheme = () => {
    // Initial apply
    applyTheme(theme.value);

    // Watch for state changes
    watch(theme, newVal => {
        localStorage.setItem('theme', newVal);
        applyTheme(newVal);
    });

    // Watch for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
        if (theme.value === 'auto') {
            applyTheme('auto');
        }
    });
};

export const useTheme = () => {
    return {
        setupTheme,
        theme, // call this in App.vue or main.ts
    };
};
