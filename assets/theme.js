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
      
      // Salva lo stato attuale del menu PRIMA di ogni modifica
      const wasShowingContent = contentArea.classList.contains('show');
      const isTop = container.classList.contains('top');
      
      tabs.forEach((t, i) => t.classList.toggle('active', i === index));
      contents.forEach((c, i) => c.classList.toggle('active', i === index));
      
      if (index === 0) {
        // Homepage: sempre in basso
        container.className = 'navigation-container';
        contentArea.className = 'content';
      } else {
        // Altre tab: logica di posizionamento
        if (wasShowingContent && isTop) {
          // Mantieni top position e NON resettare scroll
          container.className = 'navigation-container top';
        } else {
          // Vai a middle e resetta scroll
          container.className = 'navigation-container middle';
          contentArea.scrollTop = 0;
        }
        
        contentArea.className = 'content show';
      }
    };
  });
  
  tabs[0]?.click();
})();