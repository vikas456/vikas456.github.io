/** Page content: reach diagram, career timeline and selected work. */

export type ReachGroup = 'built' | 'revenue';

/** A project branching off a product node. */
export interface ReachChild {
  key: string;
  /** Short enough to render as a canvas label. */
  label: string;
  /** Full description, shown in the tooltip and in the text equivalent. */
  detail: string;
}

export interface ReachNode {
  key: string;
  label: string;
  group: ReachGroup;
  /** Node radius in px at the diagram's base scale. */
  radius: number;
  /** Starting angle in radians. */
  angle: number;
  /** Orbit distance as a fraction of the diagram radius. */
  distance: number;
  /** Plain-English description — this is read by non-technical visitors. */
  did: string;
  metric: string;
  children: ReachChild[];
}

export const reachNodes: ReachNode[] = [
  {
    key: 'fbig',
    label: 'Facebook \u00b7 Instagram',
    group: 'built',
    radius: 27,
    angle: -2.42,
    distance: 0.98,
    did: 'I built the account and privacy settings people use every day.',
    metric: 'Over 1 billion people',
    children: [
      {
        key: 'birthday',
        label: 'Birthday & age verification',
        detail: 'Implemented birthday settings and age verification across Meta.',
      },
      {
        key: 'desktop-migration',
        label: 'Mobile \u2192 desktop',
        detail: 'Drove the implementation and migration of settings from mobile to desktop surfaces.',
      },
      {
        key: 'privacy',
        label: 'Privacy & regulatory',
        detail: 'Expanded support for user privacy and regulatory settings.',
      },
    ],
  },
  {
    key: 'mkt',
    label: 'Marketplace Ads',
    group: 'revenue',
    radius: 24,
    angle: -0.72,
    distance: 1.0,
    did: 'I built the tools sellers use to promote what they\u2019re selling.',
    metric: '20% more advertisers, year over year',
    children: [
      {
        key: 'uxr',
        label: 'UX from user research',
        detail: 'UX improvements based on UXR feedback, to make the flow more seamless.',
      },
      {
        key: 'desktop',
        label: 'Mobile \u2192 desktop',
        detail: 'Expanded the feature from mobile to desktop.',
      },
      {
        key: 'pages',
        label: 'Pages & small business',
        detail: 'Expanded Marketplace promotions to Pages and small businesses.',
      },
      {
        key: 'pricing',
        label: 'Pricing & urgency models',
        detail:
          'Improved model output using business strategy and tactics \u2014 charm pricing, value props and urgency deals.',
      },
    ],
  },
  {
    key: 'msg',
    label: 'Messenger',
    group: 'built',
    radius: 24,
    angle: 2.42,
    distance: 0.94,
    did: 'I built message forwarding and the group chat settings.',
    metric: 'Over 2 billion people',
    children: [
      {
        key: 'reporting',
        label: 'Reporting flows',
        detail: 'Built the flows people use to report messages and conversations.',
      },
      {
        key: 'group',
        label: 'Group chat settings',
        detail:
          'Group chat settings \u2014 adding members, themes, blocking users, and general chat customisation.',
      },
      {
        key: 'article',
        label: 'Article context',
        detail: 'Article context, so people can see which publication a shared link came from.',
      },
      {
        key: 'forwarding',
        label: 'Forwarding & replies',
        detail: 'Message forwarding and reply functionality on Messenger Desktop.',
      },
    ],
  },
  {
    key: 'shop',
    label: 'meta.com Shop',
    group: 'revenue',
    radius: 25,
    angle: 0.72,
    distance: 1.0,
    did: 'I lead the team behind Meta\u2019s AI glasses store.',
    metric: '5% more sales, year over year',
    children: [
      {
        key: 'speed',
        label: 'Site speed +30%',
        detail: 'Led site performance and reliability work, improving site speed by 30%.',
      },
      {
        key: 'redesign',
        label: 'Org-wide redesigns',
        detail: 'Led org-wide site redesigns.',
      },
      {
        key: 'tryon',
        label: 'Virtual try-on',
        detail: 'Owner of the virtual try-on features.',
      },
      {
        key: 'connect',
        label: 'Meta Connect architecture',
        detail:
          'Built site architecture that seamlessly supports new product launches for Meta Connect.',
      },
    ],
  },
];

export interface TimelineEntry {
  when: string;
  title: string;
  badge?: string;
  org: string;
  bullets: string[];
  source?: { href: string; label: string };
}

export const timeline: TimelineEntry[] = [
  {
    when: 'MAR 2025 — PRESENT',
    title: 'meta.com — Meta AI Glasses',
    badge: 'Tech Lead',
    org: 'Meta · San Francisco, CA',
    bullets: [
      'Tech lead on the meta.com growth teams, leading <b>5 engineers</b> and owning experimentation and the revenue roadmap for the storefront.',
      'Shipped features that increased <em>Meta AI glasses sales 5% YoY</em>.',
      'Implementing features that improve the shopping experience, website infrastructure, searchability, and performance/reliability.',
    ],
    source: { href: 'https://www.meta.com/', label: 'meta.com' },
  },
  {
    when: 'NOV 2023 — MAR 2025',
    title: 'Search & Marketplace Ads',
    org: 'Meta · San Francisco, CA',
    bullets: [
      'Drove data analysis across the user funnel, identified user pain points and areas of opportunity, then created the roadmap and led the team to plug those gaps — driving <em>20% YoY growth in active advertisers</em>.',
      'Deployed boosted listing features on Marketplace so sellers could promote their listings.',
    ],
    source: {
      href: 'https://www.facebook.com/business/help/304288543633513?id=150605362430228',
      label: 'Boosted listings',
    },
  },
  {
    when: 'JUL 2020 — NOV 2023',
    title: 'Cross-Meta Experiences · Settings Platform',
    badge: 'Tech Lead',
    org: 'Meta · San Francisco, CA',
    bullets: [
      'Led and built frameworks for <em>30+ settings</em> from the ground up, including Accounts Center, unified across Facebook, Instagram, Messenger and VR devices — used by <em>over 1 billion people</em>.',
      'Tech lead for the VR surfaces and coached <b>5 engineers</b> across these projects.',
    ],
    source: { href: 'https://accountscenter.facebook.com/', label: 'Accounts Center' },
  },
  {
    when: 'JAN 2019 — MAY 2020',
    title: 'Undergraduate Teaching Assistant',
    org: 'The University of Texas at Austin · Austin, TX',
    bullets: [
      'CS313e Elements of Software Design — devised assignments and the course syllabus, directed office hours for <b>400+ students</b>.',
      'CS331 Algorithms &amp; Complexity — coordinated grading assignments and answered questions on online forums for a class of 150.',
    ],
  },
  {
    when: 'MAY 2019 — AUG 2019',
    title: 'Software Engineer Intern',
    org: 'Meta · Messenger Community Integrity',
    bullets: [
      'Implemented message forwarding on Messenger Desktop as a web developer, on a surface <b>2 billion people</b> use.',
      'Built group messaging settings on both messenger.com and facebook.com.',
    ],
    source: {
      href: 'https://www.facebook.com/help/messenger-app/1145318292241859',
      label: 'Messenger settings',
    },
  },
  {
    when: 'MAY 2018 — AUG 2018',
    title: 'Software Engineer Intern',
    org: 'Expedia Group · Austin, TX',
    bullets: [
      'Designed and built a Fraud Detection (Redaction) Service so employees could view private files post-redaction — used daily by <b>62% of employees</b>.',
    ],
  },
  {
    when: 'AUG 2016 — MAY 2020',
    title: 'B.S. Computer Science, Minor in Business',
    org: 'The University of Texas at Austin · Austin, TX',
    bullets: ['CS Ambassadors · UT Developers Club · HackTX, MusicHacks'],
  },
];

export interface WorkItem {
  /** Also the image slug: public/images/work/<slug>.webp */
  slug: string;
  title: string;
  chip: string;
  chipTone: 'accent' | 'revenue' | 'muted';
  featured?: boolean;
  body: string;
  impact?: string;
  stack: string[];
  source: { href: string; label: string };
  /** Alt text used once a real image replaces the placeholder illustration. */
  imageAlt: string;
}

export const work: WorkItem[] = [
  {
    slug: 'meta-shop',
    title: 'meta.com — Meta AI Glasses Shop',
    chip: 'Commerce · Tech Lead',
    chipTone: 'revenue',
    featured: true,
    body: "The storefront where Meta sells its AI glasses. I'm one of the tech leads on the meta.com growth team, leading five engineers and owning the experimentation program — plus the shopping experience, website infrastructure, searchability and performance work underneath it.",
    impact: 'Meta AI glasses sales up 5% year over year',
    stack: ['React', 'GraphQL', 'experimentation', 'performance'],
    source: { href: 'https://www.meta.com/', label: 'Visit meta.com' },
    imageAlt: 'The meta.com storefront for Meta AI glasses',
  },
  {
    slug: 'accounts-center',
    title: 'Accounts Center',
    chip: 'Platform',
    chipTone: 'accent',
    body: 'One settings framework serving Facebook, Instagram, Messenger and Meta Quest. 30+ settings built from the ground up, with the cross-org API design and migration work that came with it.',
    impact: '1B+ people',
    stack: ['Hack', 'React', 'GraphQL'],
    source: { href: 'https://accountscenter.facebook.com/', label: 'Visit Accounts Center' },
    imageAlt: 'The Accounts Center settings interface',
  },
  {
    slug: 'boosted-listings',
    title: 'Marketplace Boosted Listings',
    chip: 'Ads',
    chipTone: 'revenue',
    body: "Let Marketplace sellers pay to promote what they're selling. I drove the funnel analysis that found the gaps, built the roadmap from it, and led the team that shipped against it.",
    impact: '+20% YoY active advertisers',
    stack: ['React Native', 'PHP', 'A/B testing'],
    source: {
      href: 'https://www.facebook.com/business/help/304288543633513?id=150605362430228',
      label: 'About boosted listings',
    },
    imageAlt: 'A boosted listing on Facebook Marketplace',
  },
  {
    slug: 'messenger',
    title: 'Messenger Forwarding & Group Settings',
    chip: 'Product',
    chipTone: 'accent',
    body: 'Message forwarding on Messenger Desktop plus group messaging settings across messenger.com and facebook.com, built on the Community Integrity team.',
    impact: '2B+ people',
    stack: ['React', 'Hack'],
    source: {
      href: 'https://www.facebook.com/help/messenger-app/1145318292241859',
      label: 'About Messenger settings',
    },
    imageAlt: 'Message forwarding in Messenger',
  },
  {
    slug: 'redraft',
    title: 'Redraft',
    chip: 'Side project',
    chipTone: 'muted',
    body: 'Re-runs the last ten years of the NFL draft by fantasy points, so you can see which picks actually paid off. Table, scatterplot and bar-chart views over the same dataset.',
    stack: ['React', 'HTML/CSS'],
    source: { href: 'https://github.com/vikas456/redraft', label: 'View on GitHub' },
    imageAlt: 'The Redraft NFL draft explorer',
  },
  {
    slug: 'uteats',
    title: 'UTEats',
    chip: 'Side project',
    chipTone: 'muted',
    body: 'Told UT Austin students which campus cafes were open right now — the question every student asked at 9pm. Peaked at 200 daily active users.',
    stack: ['React', 'Python', 'Flask'],
    source: { href: 'https://github.com/vikas456/uteats', label: 'View on GitHub' },
    imageAlt: 'The UTEats campus cafe finder',
  },
];
