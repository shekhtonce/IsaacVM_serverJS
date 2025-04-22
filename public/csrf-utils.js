// CSRF protection utilities
const csrfUtils = {
    /**
     * Initialize CSRF protection - fetch a token from the server
     * @returns {Promise<string>} CSRF token
     */
    async initialize() {
      try {
        // Try to get CSRF token from local storage first
        const storedToken = localStorage.getItem('csrf_token');
        
        if (storedToken) {
          return storedToken;
        }
        
        // If no token in storage, fetch a new one
        const response = await fetch('/api/csrf-token');
        
        if (!response.ok) {
          throw new Error('Failed to fetch CSRF token');
        }
        
        const data = await response.json();
        
        // Store token in local storage for later use
        localStorage.setItem('csrf_token', data.csrf_token);
        
        return data.csrf_token;
      } catch (error) {
        console.error('CSRF initialization error:', error);
        throw error;
      }
    },
    
    /**
     * Get CSRF token from storage or fetch a new one
     * @returns {Promise<string>} CSRF token
     */
    async getToken() {
      const token = localStorage.getItem('csrf_token');
      
      if (token) {
        return token;
      }
      
      // If no token, initialize and get one
      return this.initialize();
    },
    
    /**
     * Add CSRF token to fetch options
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} Updated fetch options with CSRF token
     */
    async addTokenToRequest(options = {}) {
      const token = await this.getToken();
      
      // Set up default options if none provided
      const updatedOptions = {
        ...options,
        headers: {
          ...(options.headers || {}),
          'X-CSRF-Token': token
        }
      };
      
      // If it's a POST/PUT/DELETE, make sure the token is in the body for forms
      if (['POST', 'PUT', 'DELETE'].includes(updatedOptions.method)) {
        if (updatedOptions.body instanceof FormData) {
          updatedOptions.body.append('csrf_token', token);
        } else if (typeof updatedOptions.body === 'string' && updatedOptions.headers['Content-Type'] === 'application/json') {
          // If body is JSON string, parse it, add token, and stringify again
          try {
            const bodyObj = JSON.parse(updatedOptions.body);
            bodyObj.csrf_token = token;
            updatedOptions.body = JSON.stringify(bodyObj);
          } catch (e) {
            // If not valid JSON, just leave as is
            console.error('Failed to add CSRF token to request body:', e);
          }
        } else if (!updatedOptions.body) {
          // If no body yet, create one with the token
          updatedOptions.body = JSON.stringify({ csrf_token: token });
          updatedOptions.headers['Content-Type'] = 'application/json';
        }
      }
      
      return updatedOptions;
    },
    
    /**
     * Safe fetch wrapper that automatically adds CSRF token
     * @param {string} url - URL to fetch
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Fetch response
     */
    async safeFetch(url, options = {}) {
      const csrfOptions = await this.addTokenToRequest(options);
      return fetch(url, csrfOptions);
    },
    
    /**
     * Add CSRF token to all forms on the page
     */
    addTokenToForms() {
      this.getToken().then(token => {
        document.querySelectorAll('form').forEach(form => {
          // Check if the form already has a CSRF token input
          let csrfInput = form.querySelector('input[name="csrf_token"]');
          
          if (!csrfInput) {
            // Create a new hidden input for the CSRF token
            csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            form.appendChild(csrfInput);
          }
          
          // Set the token value
          csrfInput.value = token;
        });
      }).catch(error => {
        console.error('Failed to add CSRF tokens to forms:', error);
      });
    }
  };
  
  // Initialize CSRF protection when the DOM is loaded
  document.addEventListener('DOMContentLoaded', () => {
    csrfUtils.initialize();
    csrfUtils.addTokenToForms();
  });
  
  // Export CSRF utilities for use in other scripts
  window.csrfUtils = csrfUtils;