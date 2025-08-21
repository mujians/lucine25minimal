(function() {
  const menu = document.querySelector('[data-menu]');
  if (!menu) return;
  
  const tabs = menu.querySelectorAll('.tab');
  const contents = menu.querySelectorAll('.tab-content');
  const contentZone = menu.querySelector('.content');
  if (!contentZone) return;
  
  // Scroll handler
  const handleScroll = () => {
    if (menu.classList.contains('middle') && contentZone.scrollTop > 100) {
      menu.classList.replace('middle', 'top');
      contentZone.classList.replace('middle', 'top');
    } else if (menu.classList.contains('top') && contentZone.scrollTop < 50) {
      menu.classList.replace('top', 'middle');
      contentZone.classList.replace('top', 'middle');
    }
  };
  
  contentZone.addEventListener('scroll', handleScroll);
  
  // Tab clicks
  tabs.forEach((tab, index) => {
    tab.onclick = () => {
      // Update active states
      tabs.forEach((t, i) => t.classList.toggle('active', i === index));
      contents.forEach((c, i) => c.classList.toggle('active', i === index));
      
      if (index === 0) {
        // Homepage: menu at bottom, no content
        menu.className = 'mobile-menu';
        contentZone.classList.remove('visible', 'middle', 'top');
      } else {
        // Other tabs: menu at middle, show content
        menu.className = 'mobile-menu middle';
        contentZone.className = 'content visible middle';
      }
    };
  });
  
  // Initialize homepage
  tabs[0]?.click();
})();