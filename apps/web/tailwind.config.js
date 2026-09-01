/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Todas as cores saem de CSS variables para que o tema claro/escuro
        // seja uma troca de tokens, nao uma segunda folha de estilo.
        ink: 'rgb(var(--rb-ink) / <alpha-value>)',
        muted: 'rgb(var(--rb-muted) / <alpha-value>)',
        subtle: 'rgb(var(--rb-subtle) / <alpha-value>)',
        canvas: 'rgb(var(--rb-canvas) / <alpha-value>)',
        surface: 'rgb(var(--rb-surface) / <alpha-value>)',
        raised: 'rgb(var(--rb-raised) / <alpha-value>)',
        line: 'rgb(var(--rb-line) / <alpha-value>)',
        burgundy: {
          DEFAULT: 'rgb(var(--rb-burgundy) / <alpha-value>)',
          soft: 'rgb(var(--rb-burgundy-soft) / <alpha-value>)',
          deep: 'rgb(var(--rb-burgundy-deep) / <alpha-value>)',
        },
        gold: {
          DEFAULT: 'rgb(var(--rb-gold) / <alpha-value>)',
          soft: 'rgb(var(--rb-gold-soft) / <alpha-value>)',
        },
        success: 'rgb(var(--rb-success) / <alpha-value>)',
        danger: 'rgb(var(--rb-danger) / <alpha-value>)',
        info: 'rgb(var(--rb-info) / <alpha-value>)',
        /** Tinta sobre cor de marca — nao inverte no dark mode. */
        'on-brand': 'rgb(var(--rb-on-brand) / <alpha-value>)',
        'on-gold': 'rgb(var(--rb-on-gold) / <alpha-value>)',
        /** Fundo de acao primaria, calibrado para contraste AA nos dois temas. */
        action: 'rgb(var(--rb-action) / <alpha-value>)',
        device: 'rgb(var(--rb-device) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      /**
       * Escala de raio semantica (secao 9). Quatro degraus, cada um com um
       * papel: controle pequeno, elemento interno, superficie e pilula.
       * Nenhum componente escolhe o proprio raio fora daqui.
       */
      borderRadius: {
        control: '0.625rem', // inputs, badges, chips
        panel: '0.875rem', // blocos internos, listas, avisos
        card: '1rem', // superficies principais
        sheet: '1.5rem', // modais e bottom sheets
        pill: '999px',
      },

      /**
       * Escala tipografica (secao 7). Sete degraus nomeados por papel, nao
       * por tamanho — o que evita "text-[0.98rem]" espalhado pelo codigo.
       */
      fontSize: {
        'display-xl': ['clamp(2.5rem, 5vw, 3.75rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['clamp(1.875rem, 3vw, 2.25rem)', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        display: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        heading: ['1.125rem', { lineHeight: '1.35' }],
        'body-lg': ['1rem', { lineHeight: '1.65' }],
        body: ['0.9375rem', { lineHeight: '1.6' }],
        caption: ['0.8125rem', { lineHeight: '1.5' }],
        label: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },
      // Sombras quentes: papel sobre papel, nao vidro sobre cinza.
      boxShadow: {
        paper: '0 1px 2px rgb(33 31 28 / 0.04), 0 8px 24px -12px rgb(33 31 28 / 0.14)',
        lifted: '0 2px 4px rgb(33 31 28 / 0.05), 0 16px 40px -16px rgb(33 31 28 / 0.22)',
        /** Objetos com volume proprio: capas de livro na estante. */
        spine: '0 6px 14px -6px rgb(33 31 28 / 0.55)',
        /** Aparelho no Mobile Preview. */
        device: '0 40px 80px -24px rgb(33 31 28 / 0.55)',
        inset: 'inset 0 1px 0 rgb(255 255 255 / 0.5)',
      },

      /** Camadas declaradas: nada de z-index inventado por componente. */
      zIndex: {
        nav: '40',
        dropdown: '50',
        overlay: '80',
        toast: '90',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '45%': { transform: 'scale(1.28)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.3s ease both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        pop: 'pop 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
