/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true
    },
    extend: {
      colors: {
        primary: {
          50: '#E6F0FA',
          100: '#CCE1F5',
          200: '#99C3EB',
          300: '#66A5E0',
          400: '#3387D6',
          500: '#0066CC',
          600: '#0052A3',
          700: '#003D7A',
          800: '#002952',
          900: '#001429'
        },
        danger: {
          50: '#FDECEB',
          100: '#FBD9D7',
          200: '#F7B3AE',
          300: '#F38D86',
          400: '#EF675E',
          500: '#E53935',
          600: '#C62828',
          700: '#B71C1C',
          800: '#7F1010',
          900: '#4A0A0A'
        },
        warning: {
          50: '#FFF4E6',
          100: '#FFE9CC',
          200: '#FFD399',
          300: '#FFBD66',
          400: '#FFA733',
          500: '#FB8C00',
          600: '#EF6C00',
          700: '#E65100',
          800: '#BF360C',
          900: '#8D2A00'
        },
        success: {
          50: '#E8F5E9',
          100: '#C8E6C9',
          200: '#A5D6A7',
          300: '#81C784',
          400: '#66BB6A',
          500: '#43A047',
          600: '#2E7D32',
          700: '#1B5E20',
          800: '#0D3D11',
          900: '#072009'
        },
        app: {
          bg: '#1A2332',
          'bg-light': '#253142',
          'bg-lighter': '#2D3B4F',
          border: '#3A4A61',
          text: '#E2E8F0',
          'text-secondary': '#94A3B8',
          'text-muted': '#64748B'
        }
      },
      fontFamily: {
        sans: ['"PingFang SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        'glow-primary': '0 0 20px rgba(0, 102, 204, 0.3)',
        'glow-danger': '0 0 20px rgba(229, 57, 53, 0.5)',
        'glow-warning': '0 0 20px rgba(251, 140, 0, 0.4)',
        card: '0 4px 20px rgba(0, 0, 0, 0.25)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.35)'
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
        'gradient-danger': 'linear-gradient(135deg, #E53935 0%, #C62828 100%)',
        'gradient-success': 'linear-gradient(135deg, #43A047 0%, #2E7D32 100%)',
        'gradient-warning': 'linear-gradient(135deg, #FB8C00 0%, #EF6C00 100%)',
        'gradient-card': 'linear-gradient(145deg, #2D3B4F 0%, #253142 100%)',
        'noise': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")"
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out'
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' }
        }
      }
    }
  },
  plugins: []
}
