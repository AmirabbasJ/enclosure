import appCss from '../styles.css?url';

const APP_TITLE = 'Enclosure';
const APP_DESCRIPTION =
  'A pixel puzzle game about walls and containment. Are we being protected, or are we being contained?';

export const rootHead = {
  meta: [
    {
      charSet: 'utf-8',
    },
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, viewport-fit=cover',
    },
    {
      title: APP_TITLE,
    },
    {
      name: 'description',
      content: APP_DESCRIPTION,
    },
    {
      name: 'theme-color',
      content: '#000F32',
    },
    {
      property: 'og:title',
      content: APP_TITLE,
    },
    {
      property: 'og:description',
      content: APP_DESCRIPTION,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      property: 'og:image',
      content: '/logo.svg',
    },
    {
      name: 'twitter:card',
      content: 'summary',
    },
    {
      name: 'twitter:title',
      content: APP_TITLE,
    },
    {
      name: 'twitter:description',
      content: APP_DESCRIPTION,
    },
    {
      name: 'twitter:image',
      content: '/logo.svg',
    },
  ],
  links: [
    {
      rel: 'stylesheet',
      href: appCss,
    },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: '/logo.svg',
    },
    {
      rel: 'apple-touch-icon',
      href: '/logo.svg',
    },
  ],
};
