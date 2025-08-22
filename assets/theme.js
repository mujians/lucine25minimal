(function() {
  const container = document.querySelector('.navigation-container');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');
  
  let scrollHandlerEnabled = true;
  
  // Single permanent scroll handler
  const scrollHandler = () => {
    if (!scrollHandlerEnabled) return;
    
    if (container.classList.contains('middle') && contentArea.scrollTop > 100) {
      // Scroll DOWN: menu va in top, content torna all'inizio
      container.classList.remove('middle');
      container.classList.add('top');
      // Disabilita handler durante il reset per evitare bounce back
      scrollHandlerEnabled = false;
      // Riposiziona il content all'inizio per vista ottimale
      setTimeout(() => {
        contentArea.scrollTop = 0;
        // Riabilita handler dopo il reset
        setTimeout(() => {
          scrollHandlerEnabled = true;
        }, 200);
      }, 300); // Aspetta metà animazione per smoothness
    } else if (container.classList.contains('top') && contentArea.scrollTop < 50) {
      // Scroll UP: menu torna a middle, reset per vista ottimale
      container.classList.remove('top');
      container.classList.add('middle');
      // Disabilita handler durante il reset
      scrollHandlerEnabled = false;
      // Reset scroll quando torniamo a middle
      setTimeout(() => {
        contentArea.scrollTop = 0;
        // Riabilita handler dopo il reset
        setTimeout(() => {
          scrollHandlerEnabled = true;
        }, 200);
      }, 100);
    }
  };
  
  contentArea.addEventListener('scroll', scrollHandler);
  
  tabs.forEach((tab, index) => {
    tab.onclick = (e) => {
      e.preventDefault();
      
      // Disabilita scroll handler temporaneamente
      scrollHandlerEnabled = false;
      
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
      
      // Riabilita scroll handler dopo le transizioni
      setTimeout(() => {
        scrollHandlerEnabled = true;
      }, 500);
    };
  });
  
  // Inizializza homepage all'avvio
  if (tabs[0]) {
    tabs[0].classList.add('active');
    contents[0]?.classList.add('active');
    container.className = 'navigation-container';
    contentArea.className = 'content';
  }
})();