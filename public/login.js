// Generate a CSRF token when the page loads
function generateCSRFToken() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    const length = 32;
    
    for (let i = 0; i < length; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Store the token in localStorage for validation on the server
    localStorage.setItem('csrf_token', token);
    
    // Set the token in the form
    document.getElementById('csrf-token').value = token;
}

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const csrfToken = document.getElementById('csrf-token').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ email, password, csrf_token: csrfToken })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store user info in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Redirect based on user role
            if (data.user.is_admin) {
                window.location.href = '/admin';
            } else {
                window.location.href = '/index.html';
            }
        } else {
            // Display error message
            const errorMessage = document.getElementById('error-message');
            errorMessage.textContent = data.error || 'Login failed. Please check your credentials.';
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorMessage = document.getElementById('error-message');
        errorMessage.textContent = 'An error occurred. Please try again.';
        errorMessage.style.display = 'block';
    }
}

// Initialize the login page
function initLoginPage() {
    // Generate CSRF token 
    generateCSRFToken();
    
    // Add event listener to the login form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initLoginPage);