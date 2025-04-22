/**
 * Client-side sanitization utilities
 */

// Function to encode HTML entities
function encodeHTML(str) {
    if (typeof str !== 'string') {
      return '';
    }
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  // Sanitize text for display in the DOM
  function sanitizeText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    return encodeHTML(text);
  }
  
  // Safe way to set inner text content
  function setSafeText(element, text) {
    if (!element) return;
    element.textContent = text;
  }
  
  // Safe way to set HTML content
  function setSafeHTML(element, html) {
    if (!element) return;
    // First clear the element
    element.innerHTML = '';
    // Then set text content safely
    element.textContent = html;
  }
  
  // Create a text node safely
  function createSafeTextNode(text) {
    return document.createTextNode(text || '');
  }
  
  // Sanitize and validate a form input based on type
  function validateAndSanitizeInput(input, type) {
    // Get the value
    const value = input.value.trim();
    
    // Validation patterns
    const patterns = {
      'text': /^[a-zA-Z0-9\s]{1,100}$/,
      'name': /^[a-zA-Z0-9\s]{1,100}$/,
      'email': /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      'price': /^\d+(\.\d{1,2})?$/,
      'number': /^\d+$/,
      'description': /.{1,2000}$/,
      'password': /.{8,100}$/
    };
    
    // Default to text pattern if type not specified
    const pattern = patterns[type] || patterns.text;
    
    // Validate
    const isValid = pattern.test(value);
    
    // Show validation feedback
    if (isValid) {
      input.classList.remove('invalid');
      input.classList.add('valid');
    } else {
      input.classList.remove('valid');
      input.classList.add('invalid');
    }
    
    return { isValid, value: encodeHTML(value) };
  }
  
  // Safe way to render data in table
  function renderSafeTable(tableBody, items, columnMap, actionsRenderer) {
    if (!tableBody || !Array.isArray(items)) {
      return;
    }
    
    // Clear the table
    tableBody.innerHTML = '';
    
    if (items.length === 0) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.setAttribute('colspan', Object.keys(columnMap).length + (actionsRenderer ? 1 : 0));
      cell.textContent = 'No items found';
      row.appendChild(cell);
      tableBody.appendChild(row);
      return;
    }
    
    // Create rows for each item
    items.forEach(item => {
      const row = document.createElement('tr');
      
      // Add cells based on column map
      Object.entries(columnMap).forEach(([key, renderer]) => {
        const cell = document.createElement('td');
        if (typeof renderer === 'function') {
          renderer(cell, item[key], item);
        } else {
          cell.textContent = item[key] || '';
        }
        row.appendChild(cell);
      });
      
      // Add actions cell if provided
      if (actionsRenderer) {
        const actionsCell = document.createElement('td');
        actionsCell.className = 'table-actions';
        actionsRenderer(actionsCell, item);
        row.appendChild(actionsCell);
      }
      
      tableBody.appendChild(row);
    });
  }
  
  // Export functions for use in other files
  window.sanitizeUtils = {
    encodeHTML,
    sanitizeText,
    setSafeText,
    setSafeHTML,
    createSafeTextNode,
    validateAndSanitizeInput,
    renderSafeTable
  };