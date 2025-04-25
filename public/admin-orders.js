// Admin Orders JavaScript
document.addEventListener('DOMContentLoaded', () => {
    // Check if csrf utilities are available
    if (window.csrfUtils) {
      window.csrfUtils.addTokenToForms();
    }
  
    // Common function to show error messages
    const showError = (message) => {
      alert(message);
    };
  
    // Load orders
    loadOrders();
  
    // Set up event listeners for filters
    const statusFilter = document.getElementById('order-status-filter');
    const searchInput = document.getElementById('order-search');
    
    if (statusFilter) {
      statusFilter.addEventListener('change', filterOrders);
    }
    
    if (searchInput) {
      searchInput.addEventListener('input', filterOrders);
    }
  
    // Set up modal close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
      button.addEventListener('click', () => {
        const modal = button.closest('.modal');
        modal.style.display = 'none';
      });
    });
  
    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
      const modals = document.querySelectorAll('.modal');
      modals.forEach(modal => {
        if (event.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  
    // Event delegation for view details buttons that will be dynamically added
    document.addEventListener('click', (event) => {
      // View order details button
      if (event.target.classList.contains('view-order-btn')) {
        const orderId = event.target.dataset.id;
        viewOrderDetails(orderId);
      }
    });
  
    /* ---------- FUNCTIONS ---------- */
  
    // Load all orders from the API
    async function loadOrders() {
      try {
        // Use the safeFetch method to automatically add CSRF token
        const response = await window.csrfUtils.safeFetch('/api/orders/admin');
        
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const orders = await response.json();
        
        // Store orders in a global variable for filtering
        window.allOrders = orders;
        
        // Display the orders
        renderOrdersTable(document.getElementById('orders-list'), orders);
      } catch (error) {
        console.error('Error loading orders:', error);
        showError('Failed to load orders');
      }
    }
  
    // Filter orders based on search and status filter
    function filterOrders() {
      const searchTerm = document.getElementById('order-search').value.toLowerCase();
      const statusFilter = document.getElementById('order-status-filter').value;
      
      if (!window.allOrders) return;
      
      const filteredOrders = window.allOrders.filter(order => {
        // Apply status filter
        if (statusFilter && order.status !== statusFilter) {
          return false;
        }
        
        // Apply search filter
        if (searchTerm) {
          const orderIdMatch = order.order_id.toString().includes(searchTerm);
          const emailMatch = order.user_email && order.user_email.toLowerCase().includes(searchTerm);
          
          return orderIdMatch || emailMatch;
        }
        
        return true;
      });
      
      // Display filtered orders
      renderOrdersTable(document.getElementById('orders-list'), filteredOrders);
    }
  
    // Format date string
    function formatDate(dateString) {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }
  
    // Get status badge HTML
    function getStatusBadgeClass(status) {
      switch(status) {
        case 'COMPLETED': return 'status-success';
        case 'APPROVED': return 'status-info';
        case 'CREATED': return 'status-warning';
        case 'FAILED': return 'status-danger';
        default: return 'status-default';
      }
    }
  
    // Render orders table using the sanitizeUtils
    function renderOrdersTable(tableBody, orders) {
      if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6">No orders found</td></tr>';
        return;
      }
      
      // Sort orders by date (newest first)
      orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Use the safe rendering utility from sanitize.js
      window.sanitizeUtils.renderSafeTable(
        tableBody,
        orders,
        {
          order_id: (cell, value) => {
            cell.textContent = value;
          },
          created_at: (cell, value) => {
            cell.textContent = formatDate(value);
          },
          user_email: (cell, value) => {
            cell.textContent = value || 'Guest';
          },
          status: (cell, value) => {
            // Create a badge for the status
            const span = document.createElement('span');
            span.className = `status-badge ${getStatusBadgeClass(value)}`;
            span.textContent = value;
            cell.appendChild(span);
          },
          total_amount: (cell, value, order) => {
            cell.textContent = `${order.currency_code || 'USD'} ${parseFloat(value).toFixed(2)}`;
          }
        },
        (actionsCell, order) => {
          // Create view details button
          const viewButton = document.createElement('button');
          viewButton.className = 'btn btn-view view-order-btn';
          viewButton.setAttribute('data-id', order.order_id);
          viewButton.textContent = 'View Details';
          
          // Add button to the cell
          actionsCell.appendChild(viewButton);
        }
      );
    }
  
    // View order details
    async function viewOrderDetails(orderId) {
      try {
        // Use the safeFetch method to automatically add CSRF token
        const response = await window.csrfUtils.safeFetch(`/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch order details');
        }
        
        const orderDetails = await response.json();
        
        // Display the order details
        displayOrderDetails(orderDetails);
        
        // Show the modal
        document.getElementById('order-details-modal').style.display = 'block';
      } catch (error) {
        console.error('Error loading order details:', error);
        showError('Failed to load order details');
      }
    }
  
    // Display order details in the modal
    function displayOrderDetails(order) {
      const orderDetailsContent = document.getElementById('order-details-content');
      
      // Safely create the content
      const safeOrder = window.sanitizeUtils ? window.sanitizeUtils.sanitizeObject(order) : order;
      
      let html = `
        <div class="order-details">
          <div class="order-header">
            <p><strong>Order ID:</strong> ${safeOrder.order_id}</p>
            <p><strong>Date:</strong> ${formatDate(safeOrder.created_at)}</p>
            <p><strong>Customer:</strong> ${safeOrder.user_email || 'Guest'}</p>
            <p><strong>Status:</strong> <span class="status-badge ${getStatusBadgeClass(safeOrder.status)}">${safeOrder.status}</span></p>
            <p><strong>Total:</strong> ${safeOrder.currency_code || 'USD'} ${parseFloat(safeOrder.total_amount).toFixed(2)}</p>
          </div>
          
          <div class="order-payment">
            <h4>Payment Information</h4>
            <p><strong>PayPal Order ID:</strong> ${safeOrder.paypal_order_id || 'N/A'}</p>
            <p><strong>PayPal Transaction ID:</strong> ${safeOrder.paypal_transaction_id || 'N/A'}</p>
            <p><strong>Last Updated:</strong> ${formatDate(safeOrder.updated_at)}</p>
          </div>
          
          <div class="order-items">
            <h4>Order Items</h4>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
      `;
      
      let itemsHtml = '';
      if (safeOrder.items && safeOrder.items.length > 0) {
        safeOrder.items.forEach(item => {
          const subtotal = parseFloat(item.price_at_purchase) * parseInt(item.quantity);
          itemsHtml += `
            <tr>
              <td>${item.product_name}</td>
              <td>${safeOrder.currency_code || 'USD'} ${parseFloat(item.price_at_purchase).toFixed(2)}</td>
              <td>${parseInt(item.quantity)}</td>
              <td>${safeOrder.currency_code || 'USD'} ${subtotal.toFixed(2)}</td>
            </tr>
          `;
        });
      } else {
        itemsHtml = '<tr><td colspan="4">No items found</td></tr>';
      }
      
      html += itemsHtml;
      html += `
              </tbody>
            </table>
          </div>
        </div>
      `;
      
      orderDetailsContent.innerHTML = html;
    }
  });