/* DeliBuy presentation layer. Shopping and checkout stay in app.js. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const header = document.querySelector('body > header');
  const progress = document.getElementById('scrollProgress');
  const hero = document.querySelector('.hero-scene');
  let framePending = false;

  function updateScroll() {
    const distance = document.documentElement.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${distance > 0 ? Math.min(window.scrollY / distance, 1) : 0})`;
    header?.classList.toggle('is-scrolled', window.scrollY > 30);
    if (hero) hero.style.setProperty('--parallax', reducedMotion.matches ? '0px' : `${Math.min(window.scrollY * 0.12, 65)}px`);
    framePending = false;
  }

  window.addEventListener('scroll', () => {
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  window.addEventListener('resize', updateScroll);
  reducedMotion.addEventListener('change', updateScroll);
  updateScroll();

  if (!('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  function reveal(container) {
    container.querySelectorAll('[data-reveal], .category-card, .product-card').forEach((element, index) => {
      if (element.dataset.observed) return;
      element.dataset.observed = 'true';
      element.style.setProperty('--reveal-delay', `${Math.min(index % 6, 5) * 65}ms`);
      element.classList.add('reveal-ready');
      observer.observe(element);
    });
  }
  reveal(document);
  ['categoryContainer', 'productGrid'].forEach(id => {
    const container = document.getElementById(id);
    if (container) new MutationObserver(() => reveal(container)).observe(container, { childList: true });
  });
})();
