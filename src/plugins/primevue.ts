import PrimeVue from 'primevue/config'
import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'


const Noir = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{surface.50}',
      100: '{surface.100}',
      200: '{surface.200}',
      300: '{surface.300}',
      400: '{surface.400}',
      500: '{surface.500}',
      600: '{surface.600}',
      700: '{surface.700}',
      800: '{surface.800}',
      900: '{surface.900}',
      950: '{surface.950}',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.950}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.900}',
          activeColor: '{primary.800}',
          borderColor: '{surface.300}',
        },
        highlight: {
          background: '{primary.950}',
          focusBackground: '{primary.700}',
          color: '#ffffff',
          focusColor: '#ffffff',
        },
        content: {
          borderColor: '{surface.300}',
        },
      },
      dark: {
        primary: {
          color: '{primary.50}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.100}',
          activeColor: '{primary.200}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.300}',
          color: '{primary.950}',
          focusColor: '{primary.950}',
        },
      },
    },
  },
  components: {
    button: {
      root: { focusRing: { width: '0' } },
      colorScheme: {
        light: {
          outlined: {
            primary: { borderColor: '{surface.300}' },
          },
        },
      },
    },
    splitter: { gutter: { background: 'transparent' } },
    panelmenu: {
      root: { gap: '0' },
      panel: {
        padding: '0',
        background: 'transparent',
        borderWidth: '0',
        first: { borderWidth: '0' },
        last: { borderWidth: '0' },
      },
      item: { borderRadius: '0' },
    },
    dialog: { title: { fontWeight: '300' } },
  },
})

export const primevue = [
  PrimeVue,
  {
    locale: {
      firstDayOfWeek: 1,
      showMonthAfterYear: false,
      dateFormat: 'dd.mm.yy',
    },
    theme: {
      preset: Noir,
      options: {
        darkModeSelector: '.app-dark',
      },
    },
  },
] as const
