/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brutal: {
          bg: '#FFFBEB',       // Warm pale retro canvas
          card: '#FFFFFF',
          dark: '#121212',
          black: '#000000',
          yellow: '#FFDE59',   // Electric canary
          green: '#46E88E',    // Neon cash green
          blue: '#4D96FF',     // Vivid cyber blue
          pink: '#FF5E7E',     // Hot punk coral
          orange: '#FF8A3D',   // Punchy orange
          purple: '#C084FC',   // Vivid purple
          red: '#EF4444',      // Crisp alert red
          muted: '#F3F4F6',
        },
      },
      boxShadow: {
        'brutal-xs': '2px 2px 0px 0px #000000',
        'brutal-sm': '3px 3px 0px 0px #000000',
        'brutal': '4px 4px 0px 0px #000000',
        'brutal-lg': '6px 6px 0px 0px #000000',
        'brutal-xl': '8px 8px 0px 0px #000000',
        'brutal-hover': '2px 2px 0px 0px #000000',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Space Grotesk', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
