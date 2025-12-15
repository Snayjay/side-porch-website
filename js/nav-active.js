// Navigation Active Link Handler
// Automatically highlights the current page's nav link

(function() {
    function setActiveNavLink() {
        // Get current page filename
        let currentPage = window.location.pathname.split('/').pop();
        
        // Handle root/index page
        if (!currentPage || currentPage === '' || currentPage === '/') {
            currentPage = 'index.html';
        }
        
        // Normalize current page (remove query strings and hash)
        currentPage = currentPage.split('?')[0].split('#')[0];
        
        // Find all nav links
        const allNavLinks = document.querySelectorAll('.nav-links a');
        const adminLinks = document.querySelectorAll('.admin-nav-link a');
        
        // Regular nav links (excluding admin)
        const navLinks = Array.from(allNavLinks).filter(link => {
            const parent = link.closest('li');
            return parent && !parent.classList.contains('admin-nav-link');
        });
        
        // Remove active class from all regular nav links
        navLinks.forEach(link => {
            link.classList.remove('active');
            
            // Get the href and extract the filename
            const href = link.getAttribute('href');
            if (href) {
                let linkPage = href.split('/').pop();
                linkPage = linkPage.split('?')[0].split('#')[0];
                
                // Check if this link matches the current page
                if (linkPage === currentPage) {
                    link.classList.add('active');
                }
            }
        });
        
        // Handle Staff/Admin link
        if (currentPage === 'admin.html') {
            adminLinks.forEach(link => link.classList.add('active'));
        } else {
            adminLinks.forEach(link => link.classList.remove('active'));
        }
    }
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setActiveNavLink);
    } else {
        // DOM already loaded
        setActiveNavLink();
    }
})();

