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
    console.log('Activating tab:', index);
    
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

// FOOTER SNAP FUNCTIONALITY
(function() {
  const footer = document.getElementById('snap-footer');
  if (!footer) return;
  
  let lastScrollTop = 0;
  let scrollThreshold = 100;
  let isFooterVisible = false;
  
  function handleFooterSnap() {
    const contentArea = document.querySelector('.content.show');
    const scrollElement = contentArea || window;
    const scrollTop = contentArea ? contentArea.scrollTop : window.pageYOffset;
    const scrollHeight = contentArea ? contentArea.scrollHeight : document.body.scrollHeight;
    const clientHeight = contentArea ? contentArea.clientHeight : window.innerHeight;
    
    // Check if near bottom (within 200px)
    const nearBottom = scrollTop + clientHeight >= scrollHeight - 200;
    
    // Show footer when scrolling down and near bottom
    if (scrollTop > lastScrollTop && nearBottom && !isFooterVisible) {
      footer.classList.add('show');
      isFooterVisible = true;
    }
    // Hide footer when scrolling up significantly
    else if (scrollTop < lastScrollTop - scrollThreshold && isFooterVisible) {
      footer.classList.remove('show');
      isFooterVisible = false;
    }
    
    lastScrollTop = scrollTop;
  }
  
  // Attach to both window and content area
  window.addEventListener('scroll', handleFooterSnap);
  
  // Monitor for content area changes
  const observer = new MutationObserver(function() {
    const contentArea = document.querySelector('.content.show');
    if (contentArea) {
      contentArea.removeEventListener('scroll', handleFooterSnap);
      contentArea.addEventListener('scroll', handleFooterSnap);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });
})();