(function() {
  const container = document.querySelector('[data-tabs-section]');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');
  const menuTabs = document.querySelector('.menu-tabs');
  
  let scrollHandlerEnabled = true;
  
  // Function to update horizontal scroll indicators
  function updateScrollIndicators() {
    if (!menuTabs) return;
    
    const isAtStart = menuTabs.scrollLeft <= 1;
    const isAtEnd = menuTabs.scrollLeft >= (menuTabs.scrollWidth - menuTabs.clientWidth - 1);
    
    menuTabs.classList.toggle('no-left-scroll', isAtStart);
    menuTabs.classList.toggle('no-right-scroll', isAtEnd);
  }
  
  // Listen for horizontal scroll
  if (menuTabs) {
    menuTabs.addEventListener('scroll', updateScrollIndicators);
    // Initial check
    setTimeout(updateScrollIndicators, 100);
  }
  
  // Function to update vertical scroll hint
  function updateVerticalHint() {
    if (!contentArea) return;
    
    const isAtTop = contentArea.scrollTop === 0;
    contentArea.classList.toggle('at-top', isAtTop);
  }
  
  // Function to center selected tab horizontally
  function centerActiveTab() {
    if (!menuTabs) return;
    
    const activeTab = menuTabs.querySelector('.tab.active');
    if (!activeTab) return;
    
    const menuTabsRect = menuTabs.getBoundingClientRect();
    const activeTabRect = activeTab.getBoundingClientRect();
    
    const menuCenter = menuTabsRect.width / 2;
    const tabCenter = activeTabRect.left - menuTabsRect.left + activeTabRect.width / 2;
    const scrollOffset = tabCenter - menuCenter;
    
    menuTabs.scrollTo({
      left: menuTabs.scrollLeft + scrollOffset,
      behavior: 'smooth'
    });
  }
  
  // Single permanent scroll handler
  const scrollHandler = () => {
    if (!scrollHandlerEnabled) return;
    
    // Update vertical hint
    updateVerticalHint();
    
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
    } else if (container.classList.contains('top') && contentArea.scrollTop === 0) {
      // Solo quando sei COMPLETAMENTE in cima (scrollTop = 0)
      // Aggiungi un flag per evitare trigger immediati
      if (!scrollHandler.atTopFlag) {
        scrollHandler.atTopFlag = true;
        setTimeout(() => {
          // Se dopo 300ms sei ancora a scrollTop = 0, allora chiudi
          if (contentArea.scrollTop === 0) {
            container.classList.remove('top');
            container.classList.add('middle');
            // Disabilita handler durante il reset
            scrollHandlerEnabled = false;
            setTimeout(() => {
              scrollHandlerEnabled = true;
            }, 200);
          }
          scrollHandler.atTopFlag = false;
        }, 300);
      }
    }
  };
  
  contentArea.addEventListener('scroll', scrollHandler);
  
  tabs.forEach((tab) => {
    tab.onclick = (e) => {
      e.preventDefault();
      
      // Disabilita scroll handler temporaneamente
      scrollHandlerEnabled = false;
      
      // Get index from data attribute
      const index = parseInt(tab.dataset.index);
      
      // Salva lo stato attuale del menu PRIMA di ogni modifica
      const wasShowingContent = contentArea.classList.contains('show');
      const isTop = container.classList.contains('top');
      
      // Update active states using data-index
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      const activeContent = document.querySelector(`[data-index="${index}"]`);
      if (activeContent && activeContent.classList.contains('tab-content')) {
        activeContent.classList.add('active');
      }
      
      // Center the selected tab
      setTimeout(() => {
        centerActiveTab();
      }, 100);
      
      if (index === 0) {
        // Homepage: aggiungi classe bottom e rimuovi altre
        container.classList.remove('middle', 'top');
        container.classList.add('bottom');
        contentArea.classList.remove('show');
      } else {
        // Altre tab: logica di posizionamento
        container.classList.remove('bottom'); // Rimuovi sempre bottom quando lasci homepage
        
        if (wasShowingContent && isTop) {
          // Mantieni top position e NON resettare scroll
          container.classList.remove('middle');
          container.classList.add('top');
        } else {
          // Vai a middle e resetta scroll
          container.classList.remove('top');
          container.classList.add('middle');
          contentArea.scrollTop = 0;
        }
        
        contentArea.classList.add('show');
      }
      
      // Riabilita scroll handler dopo le transizioni
      setTimeout(() => {
        scrollHandlerEnabled = true;
        updateScrollIndicators();
        updateVerticalHint();
      }, 500);
    };
  });
  
  // Inizializza homepage all'avvio
  if (tabs.length > 0) {
    const homeTab = document.querySelector('[data-index="0"]');
    const homeContent = document.querySelector('.tab-content[data-index="0"]');
    
    if (homeTab) homeTab.classList.add('active');
    if (homeContent) homeContent.classList.add('active');
    
    // Assicurati che il container abbia la classe base e bottom
    container.classList.add('navigation-container', 'bottom');
    container.classList.remove('middle', 'top');
    contentArea.classList.remove('show');
    
    // Initialize indicators
    setTimeout(() => {
      updateScrollIndicators();
      updateVerticalHint();
    }, 200);
  }
})();