// Check if user is logged in
async function checkAuthentication() {
    try {
        // First try to get the user info from localStorage
        const storedUser = localStorage.getItem('user');
        
        if (!storedUser) {
            // No stored user, redirect to login page
            window.location.href = '/login.html';
            return;
        }
        
        // Verify with the server that the session is still valid
        const response = await fetch('/api/auth/user', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            // Session invalid, redirect to login page
            localStorage.removeItem('user');
            window.location.href = '/login.html';
            return;
        }
        
        // Session is valid, update user info display
        const user = await response.json();
        updateUserDisplay(user);
        
    } catch (error) {
        console.error('Authentication check error:', error);
        // On error, redirect to login
        window.location.href = '/login.html';
    }
}

// Update the UI to show the logged-in user
function updateUserDisplay(user) {
    const headerElement = document.querySelector('header');
    
    // If user info section doesn't exist, create it
    if (!document.getElementById('user-info')) {
        const userInfoDiv = document.createElement('div');
        userInfoDiv.id = 'user-info';
        userInfoDiv.className = 'user-info';
        userInfoDiv.innerHTML = `
            <span>Logged in as: <strong>${user.email}</strong></span>
            <button id="logout-btn">Logout</button>
            <button id="change-password-btn">Change Password</button>
        `;
        
        headerElement.appendChild(userInfoDiv);
        
        // Add logout button event listener
        document.getElementById('logout-btn').addEventListener('click', handleLogout);
        
        // Add change password button event listener
        document.getElementById('change-password-btn').addEventListener('click', showChangePasswordModal);
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
        
        // Clear localStorage and redirect to login page
        localStorage.removeItem('user');
        localStorage.removeItem('csrf_token');
        window.location.href = '/login.html';
        
    } catch (error) {
        console.error('Logout error:', error);
        alert('Logout failed. Please try again.');
    }
}

// Show change password modal
function showChangePasswordModal() {
    // Create modal HTML
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
    
    // Get CSRF token from localStorage and set it in the form
    const csrfToken = localStorage.getItem('csrf_token');
    document.getElementById('password-csrf-token').value = csrfToken;
    
    // Set up event listeners
    const modal = document.getElementById('password-modal');
    const closeBtn = modal.querySelector('.close');
    const form = document.getElementById('change-password-form');
    
    // Show the modal
    modal.style.display = 'block';
    
    // Close the modal when the user clicks on the 'x'
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.removeChild(modalDiv);
    });
    
    // Close the modal when the user clicks outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.removeChild(modalDiv);
        }
    });
    
    // Handle form submission
    form.addEventListener('submit', handlePasswordChange);
}

// Handle password change submission
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

// Initialize authentication check on page load
document.addEventListener('DOMContentLoaded', checkAuthentication);
