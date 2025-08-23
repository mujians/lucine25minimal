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

  let scrollHandlerEnabled = true;

  function updateVerticalHint() {
    // Nessun hint necessario - menu solo aperto/chiuso
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
      content.classList.remove('show');
    });
    
    // Poi attiva quello corretto usando data-index
    const targetContent = document.querySelector(`.tab-content[data-index="${index}"]`);
    if (targetContent) {
      targetContent.classList.add('show');
      console.log('Activated content for index:', index);
    } else {
      console.log('No content found for index:', index);
    }

    if (index === 0) {
      // Homepage: menu in bottom
      container.classList.remove('top');
      container.classList.add('bottom');
    } else {
      // Tab aperta: menu in top
      container.classList.remove('bottom');
      container.classList.add('top');
      contentArea.scrollTop = 0;
      contentArea.classList.add('show');
    }
    
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