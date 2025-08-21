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
      
      // Salva lo stato attuale SOLO se il content è già visibile (non homepage)
      const wasShowingContent = contentArea.classList.contains('show');
      const isCurrentlyTop = container.classList.contains('top') && wasShowingContent;
      
      tabs.forEach((t, i) => t.classList.toggle('active', i === index));
      contents.forEach((c, i) => c.classList.toggle('active', i === index));
      
      if (index === 0) {
        // Homepage: sempre in basso
        container.className = 'navigation-container';
        contentArea.className = 'content';
      } else {
        // Altre tab: mantieni posizione solo se stavamo già mostrando content e eravamo in top
        if (isCurrentlyTop) {
          container.className = 'navigation-container top';
        } else {
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