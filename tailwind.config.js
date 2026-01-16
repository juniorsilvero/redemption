/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#0f172a', // slate-900
                    foreground: '#f8fafc', // slate-50
                },
                secondary: {
                    DEFAULT: '#475569', // slate-600
                    foreground: '#f8fafc',
                },
                accent: {
                    DEFAULT: '#6366f1', // indigo-500
                    foreground: '#ffffff',
                },
            },
        },
    },
    plugins: [],
}
