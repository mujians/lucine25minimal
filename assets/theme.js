console.log('🎵 LUCINE MINIMAL v1.2 - Starting...');

document.addEventListener('DOMContentLoaded', function() {
  console.log('📱 DOM loaded, initializing mobile navigation...');
  
  const menu = document.querySelector('.mobile-menu');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');
  
  console.log('🔍 Elements found:', {
    menu: !!menu,
    tabs: tabs.length,
    contents: contents.length,
    contentArea: !!contentArea
  });
  
  // Debug dettagliato
  if (!menu) console.error('🚫 .mobile-menu not found!');
  if (!tabs.length) console.error('🚫 .tab buttons not found!');
  if (!contents.length) console.error('🚫 .tab-content sections not found!');
  if (!contentArea) console.error('🚫 .content area not found!');
  
  console.log('🔍 Full DOM check:', {
    allMenus: document.querySelectorAll('.mobile-menu').length,
    allTabs: document.querySelectorAll('.tab').length,
    allContents: document.querySelectorAll('.tab-content').length,
    allContentAreas: document.querySelectorAll('.content').length,
    bodyHTML: document.body.innerHTML.substring(0, 200) + '...'
  });
  
  if (!menu || !tabs.length || !contents.length || !contentArea) {
    console.error('❌ Missing elements! Cannot initialize navigation');
    console.log('🌐 Current URL:', window.location.href);
    console.log('📄 Page type:', document.body.className);
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
        // Homepage: menu in basso, niente contenuto
        console.log('🏠 Homepage mode: menu bottom, content hidden');
        menu.className = 'mobile-menu';
        contentArea.className = 'content';
      } else {
        // Altre tab: menu in mezzo, mostra contenuto
        console.log('📄 Content mode: menu middle, content visible');
        menu.className = 'mobile-menu middle';
        contentArea.className = 'content show middle';
      }
    });
  });
  
  console.log('🔗 Tab click handlers attached to', tabs.length, 'tabs');
  
  // Scroll del contenuto
  contentArea.addEventListener('scroll', function() {
    const scrollTop = contentArea.scrollTop;
    
    if (menu.classList.contains('middle') && scrollTop > 100) {
      console.log('⬆️ Scroll down: menu moving to top, scrollTop =', scrollTop);
      menu.className = 'mobile-menu top';
      contentArea.className = 'content show top';
    } else if (menu.classList.contains('top') && scrollTop < 50) {
      console.log('⬇️ Scroll up: menu moving to middle, scrollTop =', scrollTop);
      menu.className = 'mobile-menu middle';
      contentArea.className = 'content show middle';
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