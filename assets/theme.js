document.addEventListener('DOMContentLoaded', function() {
  const menu = document.querySelector('.mobile-menu');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');
  
  if (!menu || !tabs.length || !contents.length || !contentArea) return;
  
  // Click sui tab
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', function() {
      // Cambia tab attiva
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      contents[index].classList.add('active');
      
      if (index === 0) {
        // Homepage: menu in basso, niente contenuto
        menu.className = 'mobile-menu';
        contentArea.className = 'content';
      } else {
        // Altre tab: menu in mezzo, mostra contenuto
        menu.className = 'mobile-menu middle';
        contentArea.className = 'content show middle';
      }
    });
  });
  
  // Scroll del contenuto
  contentArea.addEventListener('scroll', function() {
    if (menu.classList.contains('middle') && contentArea.scrollTop > 100) {
      menu.className = 'mobile-menu top';
      contentArea.className = 'content show top';
    } else if (menu.classList.contains('top') && contentArea.scrollTop < 50) {
      menu.className = 'mobile-menu middle';
      contentArea.className = 'content show middle';
    }
  });
});