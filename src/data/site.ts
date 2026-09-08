/** Single source of truth for identity, links and SEO strings. */

export const profile = {
  name: 'Vikas Peraka',
  role: 'Full-stack Software Engineer at Meta',
  location: 'San Francisco, CA',
  email: 'vikas.peraka@gmail.com',
  // Keep in sync with the tagline in Hero.astro.
  tagline: 'Software used by a billion people. Growth work that moves revenue.',
} as const;

export const links = {
  linkedin: 'https://www.linkedin.com/in/vikasperaka/',
  github: 'https://github.com/vikas456',
  // Google Doc export. Swap for '/resume.pdf' once a PDF is committed to public/.
  resume:
    'https://docs.google.com/document/d/17QhYdxBpC_CK6xA7HoW70HeTHrgEVMD_3_cC6Up3Xnc/export?format=pdf',
} as const;

export const seo = {
  siteUrl: 'https://www.vikasperaka.com',
  title: 'Vikas Peraka — Full-stack Software Engineer at Meta',
  // Keep under ~155 characters — Google truncates SERP snippets past that.
  description:
    'Full-stack software engineer at Meta — six years across product growth, ads and commerce, building products used by over a billion people.',
  ogImage: '/og-image.png',
  keywords: [
    'Vikas Peraka',
    'software engineer',
    'full-stack engineer',
    'Meta engineer',
    'staff software engineer',
    'React',
    'GraphQL',
    'San Francisco',
  ],
} as const;

/** GA4 property carried over from the previous site. */
export const GA_ID = 'G-35Y4X5T43C';

/**
 * Web3Forms access key for the contact form.
 * Set PUBLIC_WEB3FORMS_KEY in the environment (or a .env file) to enable
 * real delivery. When it is absent the form falls back to a mailto: handoff,
 * so the page never presents a send button that silently drops messages.
 */
export const WEB3FORMS_KEY = import.meta.env.PUBLIC_WEB3FORMS_KEY ?? '';
