console.log('🎵 LUCINE MINIMAL v1.4 - FIXED TOP POSITION - Starting...');

document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 DOM loaded, initializing mobile navigation...');
  
  const container = document.querySelector('.navigation-container');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');
  
  console.log('🔍 Elements found:', {
    container: !!container,
    tabs: tabs.length,
    contents: contents.length,
    contentArea: !!contentArea
  });
  
  if (!container || !tabs.length || !contents.length || !contentArea) {
    console.error('❌ Missing elements! Cannot initialize navigation');
    return;
  }
  
  console.log('✅ All elements found, setting up navigation...');
  
  // Click sui tab
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', function() {
      console.log(`🔘 Tab clicked: ${index} (${tab.textContent})`);
      
      // Cambia tab attiva
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      contents[index].classList.add('active');
      
      if (index === 0) {
        // Homepage: container in basso, niente contenuto
        console.log('🏠 Homepage mode: container bottom, content hidden');
        container.className = 'navigation-container';
        contentArea.className = 'content';
      } else {
        // Altre tab: container in mezzo, mostra contenuto
        console.log('📄 Content mode: container middle, content visible');
        container.className = 'navigation-container middle';
        contentArea.className = 'content show';
      }
    });
  });
  
  console.log('🔗 Tab click handlers attached to', tabs.length, 'tabs');
  
  // Scroll del contenuto
  contentArea.addEventListener('scroll', function() {
    const scrollTop = contentArea.scrollTop;
    
    if (container.classList.contains('middle') && scrollTop > 100) {
      console.log('⬆️ Scroll down: container moving to top, scrollTop =', scrollTop);
      container.className = 'navigation-container top';
    } else if (container.classList.contains('top') && scrollTop < 50) {
      console.log('⬇️ Scroll up: container moving to middle, scrollTop =', scrollTop);
      container.className = 'navigation-container middle';
    }
  });
  
  console.log('📜 Scroll handler attached to content area');
  console.log('🎉 Navigation initialized successfully!');
  
  // Auto-click prima tab per inizializzare
  if (tabs[0]) {
    console.log('🎯 Auto-clicking first tab to initialize...');
    tabs[0].click();
  }
});