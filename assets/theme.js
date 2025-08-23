// Navigation controller: menu ha solo 2 posizioni - bottom (homepage) e top (aperto)
(() => {
  const container = document.querySelector('.navigation-container');
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');
  const contentArea = document.querySelector('.content');

  if (!container || !tabs.length || !contents.length || !contentArea) {
    console.log('Navigation elements not found');
    return;
  }

  console.log('Navigation initialized - Elements found:', {
    container: !!container,
    tabs: tabs.length,
    contents: contents.length,
    contentArea: !!contentArea
  });
  
  // Debug: stampa tutti i data-index disponibili
  console.log('Available tabs:', Array.from(tabs).map(t => t.dataset.index));
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
    console.log('🔄 TAB ACTIVATION:', {
      newIndex: index,
      tabName: tabs[index] ? tabs[index].textContent : 'UNKNOWN',
      windowScroll: window.pageYOffset,
      bodyHeight: document.body.scrollHeight,
      viewportHeight: window.innerHeight
    });
    
    // Disable scroll handling during tab changes
    scrollHandlerEnabled = false;
    
    // Update active tab
    tabs.forEach((t, i) => {
      t.classList.toggle('active', i === index);
    });

    // Update URL hash
    if (index > 0 && tabs[index]) {
      const tabName = tabs[index].textContent.toLowerCase().replace(/\s+/g, '-');
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

  // Add click handlers
  tabs.forEach((tab) => {
    tab.onclick = (e) => {
      e.preventDefault();
      const index = parseInt(tab.dataset.index);
      activateTab(index);
    };
  });
  
  // Function to get tab index from URL hash
  function getTabFromHash() {
    const hash = window.location.hash.substring(1);
    if (!hash) return 0;
    
    // Find tab by matching text content
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabName = tab.textContent.toLowerCase().replace(/\s+/g, '-');
      if (tabName === hash) {
        return parseInt(tab.dataset.index);
      }
    }
    return 0; // Default to home if no match
  }

  // Initialize with correct tab from URL
  console.log('Initializing - Found tabs:', tabs.length);
  console.log('Found contents:', contents.length);
  
  if (tabs.length > 0) {
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

// FOOTER SNAP FUNCTIONALITY - Appears at bottom, expands to fullscreen
(function() {
  const footer = document.getElementById('snap-footer');
  if (!footer) {
    console.log('❌ FOOTER NOT FOUND');
    return;
  }
  
  console.log('🚀 FOOTER OVERLAY SYSTEM INITIALIZED');
  
  let isFooterVisible = false;
  let isFooterExpanded = false;
  let lastScrollTop = 0;
  
  // Show footer (slide up from bottom)
  function showFooter() {
    if (!isFooterVisible) {
      footer.classList.add('show');
      isFooterVisible = true;
      console.log('🟢 FOOTER APPEARED');
      
      // Auto-expand after short delay
      setTimeout(() => {
        if (isFooterVisible && !isFooterExpanded) {
          expandFooter();
        }
      }, 300);
    }
  }
  
  // Hide footer completely
  function hideFooter() {
    footer.classList.remove('show', 'expanded');
    document.body.classList.remove('footer-expanded');
    isFooterVisible = false;
    isFooterExpanded = false;
    console.log('🔴 FOOTER HIDDEN');
  }
  
  // Expand footer to fullscreen
  function expandFooter() {
    if (isFooterVisible && !isFooterExpanded) {
      footer.classList.add('expanded');
      document.body.classList.add('footer-expanded');
      isFooterExpanded = true;
      console.log('🟢 FOOTER EXPANDED TO FULLSCREEN');
    }
  }
  
  // Click to expand (if not already)
  footer.addEventListener('click', (e) => {
    if (!e.target.closest('.footer-close-btn')) {
      expandFooter();
    }
  });
  
  // Scroll detection
  function handleScroll() {
    const scrollTop = window.pageYOffset;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = scrollHeight - clientHeight;
    
    // Detect when at bottom
    const isAtBottom = scrollTop >= maxScroll - 10;
    const isScrollingDown = scrollTop > lastScrollTop;
    const isScrollingUp = scrollTop < lastScrollTop;
    
    // Show footer when reaching bottom
    if (isAtBottom && !isFooterVisible) {
      showFooter();
    }
    
    // Hide footer when scrolling up from bottom
    if (isScrollingUp && scrollTop < maxScroll - 100 && isFooterVisible) {
      hideFooter();
    }
    
    lastScrollTop = scrollTop;
  }
  
  // Listen for scroll events
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  // Make closeFooter function available globally
  window.closeFooter = function() {
    hideFooter();
    // Scroll up slightly to avoid immediate re-trigger
    window.scrollBy(0, -150);
  };
})();

