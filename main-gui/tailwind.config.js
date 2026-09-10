/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#0f172a',
        panel: '#1e293b',
        accent: '#385f8eff',
        "accent-light": "#FFE680",
        success: '#22c55e',
        warning: '#eab308',
        error: '#ef4444',
      },
      boxShadow: {
        'panel': '0 0 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glow': '0 0 15px rgba(34, 211, 238, 0.5)',
      },
    },
  },
  plugins: [],
};


