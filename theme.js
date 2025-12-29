// theme.js - Håndterer mørk/lys modus for CoFound

(function () {
    // 1. Bestem initiell verdi (Lagret i localStorage > Systempreferanse > Lys)
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    // Sett temaet med en gang på html-elementet for å unngå "flash" av feil farge
    document.documentElement.setAttribute('data-theme', initialTheme);

    // 2. Funksjon for å bytte tema
    window.toggleTheme = function () {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Dispatche en event så andre komponenter kan oppdatere seg (f.eks. en switch)
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
    };
})();
