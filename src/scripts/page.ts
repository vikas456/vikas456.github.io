/** Scroll-spy for the rail nav, rail progress bar, and card cursor spotlights. */
export function initPage(): void {
  const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.rnav a'));
  const rail = document.querySelector<HTMLElement>('.rail');
  const sections = navLinks.map((a) => document.getElementById(a.dataset.nav ?? ''));

  if (rail && navLinks.length) {
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.body.scrollHeight - window.innerHeight;
      rail.style.setProperty('--prog', `${max > 0 ? (y / max) * 100 : 0}%`);

      let active = 0;
      sections.forEach((s, i) => {
        if (s && s.getBoundingClientRect().top <= window.innerHeight * 0.42) active = i;
      });
      navLinks.forEach((a, i) => a.classList.toggle('on', i === active));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  for (const card of document.querySelectorAll<HTMLElement>('.card')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--cx', `${e.clientX - r.left}px`);
      card.style.setProperty('--cy', `${e.clientY - r.top}px`);
    });
  }
}
