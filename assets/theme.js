(function() {
  const container = document.querySelector('.navigation-container');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');
  
  // Single permanent scroll handler
  const scrollHandler = () => {
    if (container.classList.contains('middle') && contentArea.scrollTop > 100) {
      container.classList.remove('middle');
      container.classList.add('top');
    } else if (container.classList.contains('top') && contentArea.scrollTop < 50) {
      container.classList.remove('top');
      container.classList.add('middle');
    }
  };
  
  contentArea.addEventListener('scroll', scrollHandler);
  
  tabs.forEach((tab, index) => {
    tab.onclick = (e) => {
      e.preventDefault();
      
      // Salva lo stato attuale del menu
      const wasShowingContent = contentArea.classList.contains('show');
      const currentPosition = container.classList.contains('top') ? 'top' : 
                            container.classList.contains('middle') ? 'middle' : 'bottom';
      
      tabs.forEach((t, i) => t.classList.toggle('active', i === index));
      contents.forEach((c, i) => c.classList.toggle('active', i === index));
      
      if (index === 0) {
        // Homepage: animazione di chiusura, poi vai in basso
        container.className = 'navigation-container';
        contentArea.className = 'content'; // Trigger close animation
      } else {
        // Altre tab: mantieni la posizione attuale se stavamo mostrando content
        if (wasShowingContent && currentPosition === 'top') {
          container.className = 'navigation-container top';
        } else if (wasShowingContent && currentPosition === 'middle') {
          container.className = 'navigation-container middle';  
        } else {
          // Prima volta che apriamo content: vai a middle
          container.className = 'navigation-container middle';
        }
        contentArea.className = 'content show';
        
        // Reset scroll quando si cambia tab
        contentArea.scrollTop = 0;
      }
    };
  });
  
  tabs[0]?.click();
})();