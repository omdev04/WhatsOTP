// Check if user is logged in
document.addEventListener('DOMContentLoaded', function() {
    fetch('/api/health')
        .then(response => response.json())
        .then(data => {
            const loginBtn = document.querySelector('.navbar-right .login-btn');
            const heroGetStartedBtn = document.querySelector('.hero-buttons .primary-btn');
            
            if (data.user) {
                // User is logged in
                if (loginBtn) {
                    loginBtn.innerHTML = `<i class="fas fa-tachometer-alt"></i> Dashboard`;
                    loginBtn.href = '/dashboard';
                }
                
                if (heroGetStartedBtn) {
                    heroGetStartedBtn.href = '/dashboard';
                }
            } else {
                // User is not logged in
                if (loginBtn) {
                    loginBtn.href = '/auth/login';
                }
                
                if (heroGetStartedBtn) {
                    heroGetStartedBtn.href = '/auth/login';
                }
            }
        })
        .catch(error => {
            console.error('Error checking login status:', error);
        });
});
