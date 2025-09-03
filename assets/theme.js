// Navigation controller: supports both mobile tabs and desktop sidebar
(() => {
  const container = document.querySelector('.navigation-container');
  const mobileTabs = document.querySelectorAll('.tab');
  const desktopNavItems = document.querySelectorAll('.nav-item');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');

  // Combine mobile and desktop navigation elements
  const allNavElements = [...mobileTabs, ...desktopNavItems];

  if (!container || !allNavElements.length || !contents.length || !contentArea) {
    console.log('Navigation elements not found');
    return;
  }

  console.log('Navigation initialized - Elements found:', {
    container: !!container,
    mobileTabs: mobileTabs.length,
    desktopNavItems: desktopNavItems.length,
    contents: contents.length,
    contentArea: !!contentArea
  });
  
  // Debug: stampa tutti i data-index disponibili
  console.log('Available mobile tabs:', Array.from(mobileTabs).map(t => t.dataset.index));
  console.log('Available desktop nav:', Array.from(desktopNavItems).map(t => t.dataset.index));
  console.log('Available contents:', Array.from(contents).map(c => c.dataset.index));

  let scrollHandlerEnabled = true;

  function updateVerticalHint() {
    // Nessun hint necessario - menu solo aperto/chiuso
  }

  // Function to center selected tab horizontally
  function centerActiveTab() {
    const menuTabs = document.querySelector('.menu-tabs');
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

  // Function to activate a tab and update URL
  function activateTab(index) {
    // Find the element name for this index (could be mobile or desktop)
    const activeElement = [...mobileTabs, ...desktopNavItems].find(el => 
      parseInt(el.dataset.index) === index
    );
    
    console.log('🔄 TAB ACTIVATION:', {
      newIndex: index,
      elementName: activeElement ? activeElement.textContent.trim() : 'UNKNOWN',
      windowScroll: window.pageYOffset,
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight
    });
    
    // Disable scroll handling during tab changes
    scrollHandlerEnabled = false;
    
    // Update active state for both mobile and desktop navigation
    mobileTabs.forEach((t, i) => {
      t.classList.toggle('active', parseInt(t.dataset.index) === index);
    });
    
    desktopNavItems.forEach((t, i) => {
      t.classList.toggle('active', parseInt(t.dataset.index) === index);
    });

    // Update URL hash
    if (index > 0 && activeElement) {
      const tabName = activeElement.textContent.trim().toLowerCase().replace(/\s+/g, '-');
      window.history.pushState(null, null, '#' + tabName);
    } else {
      window.history.pushState(null, null, window.location.pathname);
    }

    // Update content visibility - prima rimuovi tutti
    contents.forEach(content => {
      content.classList.remove('active');
    });
    
    // Poi attiva quello corretto usando data-index
    const targetContent = document.querySelector(`.tab-content[data-index="${index}"]`);
    if (targetContent) {
      targetContent.classList.add('active');
      console.log('Activated content for index:', index);
    } else {
      console.log('No content found for index:', index);
    }

    if (index === 0) {
      // Homepage: menu in bottom, nessun contenuto visibile (solo video)
      container.classList.remove('top');
      container.classList.add('bottom');
      contentArea.classList.remove('show');
      // Rimuovi active da tutti i contenuti in homepage
      contents.forEach(content => {
        content.classList.remove('active');
      });
    } else {
      // Tab aperta: menu in top, contenuto visibile
      container.classList.remove('bottom');
      container.classList.add('top');
      contentArea.scrollTop = 0;
      contentArea.classList.add('show');
      // Il contenuto specifico è già attivato sopra
    }
    
    // Center the active tab
    setTimeout(() => {
      centerActiveTab();
    }, 100);
    
    // Re-enable scroll handling
    setTimeout(() => {
      scrollHandlerEnabled = true;
      updateVerticalHint();
    }, 500);
  }

  // Add click handlers for both mobile and desktop navigation
  allNavElements.forEach((navElement) => {
    navElement.onclick = (e) => {
      e.preventDefault();
      const index = parseInt(navElement.dataset.index);
      activateTab(index);
    };
  });
  
  // Function to get tab index from URL hash
  function getTabFromHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return 0;
    
    // Find element by matching text content (check both mobile and desktop)
    for (const navElement of allNavElements) {
      const elementName = navElement.textContent.trim().toLowerCase().replace(/\s+/g, '-');
      if (elementName === hash) {
        return parseInt(navElement.dataset.index);
      }
    }
    return 0; // Default to home if no match
  }

  // Initialize with correct tab from URL
  console.log('Initializing - Found navigation elements:', allNavElements.length);
  console.log('Found contents:', contents.length);
  
  if (allNavElements.length > 0) {
    // Check URL hash to determine initial tab
    const initialTabIndex = getTabFromHash();
    console.log('Initial tab index from URL:', initialTabIndex);
    
    // Add base class to container
    container.classList.add('navigation-container');
    
    // Activate correct tab
    activateTab(initialTabIndex);
    
    // Initialize indicators
    setTimeout(() => {
      updateVerticalHint();
    }, 200);
  }
})();

// BACK TO TOP BUTTON
function scrollToTop() {
  const contentArea = document.querySelector('.content.show');
  if (contentArea) {
    contentArea.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  } else {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
}

// Show/hide back to top button based on scroll
function handleBackToTopVisibility() {
  const backToTopBtn = document.getElementById('back-to-top');
  const contentArea = document.querySelector('.content.show');
  
  if (backToTopBtn && contentArea) {
    if (contentArea.scrollTop > 300) {
      backToTopBtn.classList.add('show');
    } else {
      backToTopBtn.classList.remove('show');
    }
  }
}

// Add scroll listener for back to top button
document.addEventListener('DOMContentLoaded', function() {
  const contentArea = document.querySelector('.content');
  if (contentArea) {
    contentArea.addEventListener('scroll', handleBackToTopVisibility);
  }
});

// FOOTER SNAP FUNCTIONALITY - Trigger bar with swipe up, appears at page end
(function() {
  const footer = document.getElementById('snap-footer');
  const trigger = document.getElementById('footer-trigger');
  
  if (!footer || !trigger) {
    console.log('❌ FOOTER OR TRIGGER NOT FOUND');
    return;
  }
  
  console.log('🚀 FOOTER TRIGGER SYSTEM INITIALIZED');
  
  let isFooterExpanded = false;
  let isTriggerVisible = false;
  let touchStartY = 0;
  let touchEndY = 0;
  
  // Show trigger bar when at bottom of page
  function showTrigger() {
    if (!isTriggerVisible) {
      trigger.classList.add('show');
      isTriggerVisible = true;
      console.log('🟡 TRIGGER BAR APPEARED');
    }
  }
  
  // Hide trigger bar
  function hideTrigger() {
    if (isTriggerVisible && !isFooterExpanded) {
      trigger.classList.remove('show');
      isTriggerVisible = false;
      console.log('🟡 TRIGGER BAR HIDDEN');
    }
  }
  
  // Show and expand footer to fullscreen
  function showAndExpandFooter() {
    footer.classList.add('show', 'expanded');
    document.body.classList.add('footer-expanded');
    isFooterExpanded = true;
    console.log('🟢 FOOTER OPENED FROM SWIPE');
  }
  
  // Hide footer completely
  function hideFooter() {
    footer.classList.remove('show', 'expanded');
    document.body.classList.remove('footer-expanded');
    isFooterExpanded = false;
    console.log('🔴 FOOTER CLOSED');
    
    // Hide trigger too when footer closes
    hideTrigger();
  }
  
  // Check if at bottom of page
  function checkPageBottom() {
    const scrollTop = window.pageYOffset;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    if (scrollTop >= maxScroll - 50) {
      showTrigger();
    } else {
      hideTrigger();
    }
  }
  
  // Touch events for swipe up detection
  trigger.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  
  trigger.addEventListener('touchend', (e) => {
    touchEndY = e.changedTouches[0].clientY;
    const swipeDistance = touchStartY - touchEndY;
    
    // Swipe up detection (minimum 50px)
    if (swipeDistance > 50 && !isFooterExpanded) {
      e.preventDefault();
      showAndExpandFooter();
    }
  });
  
  // Fallback click for desktop
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isFooterExpanded) {
      showAndExpandFooter();
    }
  });
  
  // Scroll detection for trigger visibility
  window.addEventListener('scroll', checkPageBottom, { passive: true });
  
  // Initial check
  checkPageBottom();
  
  // Make closeFooter function available globally
  window.closeFooter = function() {
    hideFooter();
  };
})();

