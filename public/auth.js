// Functions for user authentication on the frontend
document.addEventListener('DOMContentLoaded', () => {
    // Check user authentication status
    checkUserAuth();
    
    // Set up event listeners
    setupAuthEventListeners();
});

// Check if user is logged in and update UI accordingly
async function checkUserAuth() {
    try {
        // Check if we have user info in localStorage
        const storedUser = localStorage.getItem('user');
        const userGreeting = document.getElementById('user-greeting');
        const loginButton = document.getElementById('login-button');
        
        if (!storedUser) {
            // Not logged in
            if (userGreeting) userGreeting.textContent = 'Hi guest';
            if (loginButton) {
                loginButton.textContent = 'Login';
                loginButton.onclick = () => window.location.href = '/login.html';
            }
            return;
        }
        
        // We have stored user, verify with server
        const response = await fetch('/api/auth/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Session invalid, clear localStorage
            localStorage.removeItem('user');
            if (userGreeting) userGreeting.textContent = 'Hi guest';
            if (loginButton) {
                loginButton.textContent = 'Login';
                loginButton.onclick = () => window.location.href = '/login.html';
            }
            return;
        }
        
        // Session is valid
        const user = await response.json();
        
        // Update user data in localStorage
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update UI
        if (userGreeting) userGreeting.textContent = `Hi ${user.email}`;
        if (loginButton) {
            loginButton.textContent = 'Account';
            loginButton.onclick = showUserMenu;
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        // Fallback to guest user on error
        const userGreeting = document.getElementById('user-greeting');
        const loginButton = document.getElementById('login-button');
        
        if (userGreeting) userGreeting.textContent = 'Hi guest';
        if (loginButton) {
            loginButton.textContent = 'Login';
            loginButton.onclick = () => window.location.href = '/login.html';
        }
    }
}

// Set up event listeners
function setupAuthEventListeners() {
    // Event listener for the close button on the user menu modal
    const closeButtons = document.querySelectorAll('.modal .close');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Set up logout and change password buttons (they'll be created when user menu is shown)
    document.addEventListener('click', (event) => {
        if (event.target.id === 'logout-btn') {
            handleLogout();
        } else if (event.target.id === 'change-password-btn') {
            showChangePasswordModal();
        }
    });
}

// Show user menu
function showUserMenu() {
    const userMenuModal = document.getElementById('user-menu-modal');
    if (userMenuModal) {
        userMenuModal.style.display = 'block';
    }
}

// Handle logout
async function handleLogout() {
    try {
        // Get CSRF token from localStorage
        const csrfToken = localStorage.getItem('csrf_token');
        
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({ csrf_token: csrfToken })
        });
        
        // Clear localStorage
        localStorage.removeItem('user');
        
        // Refresh the page
        window.location.reload();
        
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// Show change password modal
function showChangePasswordModal() {
    // Hide user menu modal
    const userMenuModal = document.getElementById('user-menu-modal');
    if (userMenuModal) {
        userMenuModal.style.display = 'none';
    }
    
    // Create modal HTML if it doesn't exist
    if (!document.getElementById('password-modal')) {
        const modalHtml = `
            <div id="password-modal" class="modal">
                <div class="modal-content">
                    <span class="close">&times;</span>
                    <h2>Change Password</h2>
                    <div id="password-error" class="error-message"></div>
                    <form id="change-password-form">
                        <input type="hidden" id="password-csrf-token" name="csrf_token">
                        <div class="form-group">
                            <label for="current-password">Current Password</label>
                            <input type="password" id="current-password" name="currentPassword" required>
                        </div>
                        <div class="form-group">
                            <label for="new-password">New Password</label>
                            <input type="password" id="new-password" name="newPassword" required minlength="8">
                            <small>Password must be at least 8 characters long</small>
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Confirm New Password</label>
                            <input type="password" id="confirm-password" name="confirmPassword" required>
                        </div>
                        <button type="submit">Change Password</button>
                    </form>
                </div>
            </div>
        `;
        
        // Add modal to the page
        const modalDiv = document.createElement('div');
        modalDiv.innerHTML = modalHtml;
        document.body.appendChild(modalDiv);
        
        // Set up form submission handler
        const form = document.getElementById('change-password-form');
        if (form) {
            form.addEventListener('submit', handlePasswordChange);
        }
    }
    
    // Get CSRF token from localStorage and set it in the form
    const csrfToken = localStorage.getItem('csrf_token');
    const csrfInput = document.getElementById('password-csrf-token');
    if (csrfInput) csrfInput.value = csrfToken;
    
    // Show the modal
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        passwordModal.style.display = 'block';
        
        // Set up close button event
        const closeBtn = passwordModal.querySelector('.close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                passwordModal.style.display = 'none';
            });
        }
    }
}

// Handle password change
async function handlePasswordChange(event) {
    event.preventDefault();
    
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    const csrfToken = document.getElementById('password-csrf-token').value;
    const errorElement = document.getElementById('password-error');
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
        errorElement.textContent = 'New passwords do not match';
        errorElement.style.display = 'block';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                csrf_token: csrfToken
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            alert('Password changed successfully. Please log in again.');
            // Clear session and redirect to login
            localStorage.removeItem('user');
            localStorage.removeItem('csrf_token');
            window.location.href = '/login.html';
        } else {
            errorElement.textContent = data.error || 'Failed to change password. Please try again.';
            errorElement.style.display = 'block';
        }
    } catch (error) {
        console.error('Password change error:', error);
        errorElement.textContent = 'An error occurred. Please try again.';
        errorElement.style.display = 'block';
    }
}