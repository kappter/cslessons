const tileTargets = document.querySelectorAll('.tile[data-target]');

tileTargets.forEach((tile) => {
  tile.addEventListener('click', () => {
    const targetId = tile.dataset.target;
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  tile.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      tile.click();
    }
  });

  tile.setAttribute('tabindex', '0');
  tile.setAttribute('role', 'button');
});

const revealItems = document.querySelectorAll('.section-header, .tile, .slide-card, .placeholder-panel');
revealItems.forEach((item) => item.classList.add('reveal'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  },
  {
    threshold: 0.16,
  }
);

revealItems.forEach((item) => observer.observe(item));

const deckLinks = document.querySelectorAll('.deck-nav a');
deckLinks.forEach((link) => {
  link.addEventListener('click', () => {
    deckLinks.forEach((item) => item.classList.remove('active-link'));
    link.classList.add('active-link');
  });
});
