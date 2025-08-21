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
      const isMiddle = container.classList.contains('middle');
      
      console.log('Tab click:', index, 'wasShowingContent:', wasShowingContent, 'isTop:', isTop, 'isMiddle:', isMiddle);
      
      tabs.forEach((t, i) => t.classList.toggle('active', i === index));
      contents.forEach((c, i) => c.classList.toggle('active', i === index));
      
      if (index === 0) {
        // Homepage: sempre in basso
        container.className = 'navigation-container';
        contentArea.className = 'content';
        console.log('Going to homepage - bottom position');
      } else {
        // Altre tab: logica di posizionamento
        if (wasShowingContent) {
          // Stavamo già mostrando content, mantieni la posizione
          if (isTop) {
            container.className = 'navigation-container top';
            console.log('Maintaining top position');
          } else {
            container.className = 'navigation-container middle';
            console.log('Maintaining middle position');
          }
        } else {
          // Prima apertura: vai a middle
          container.className = 'navigation-container middle';
          console.log('First time opening - going to middle');
        }
        
        contentArea.className = 'content show';
        contentArea.scrollTop = 0;
      }
    };
  });
  
  tabs[0]?.click();
})();