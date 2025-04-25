// User Orders JavaScript

document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    try {
      const userResponse = await fetch('/api/auth/user');
      
      if (userResponse.ok) {
        // User is logged in, fetch their orders
        const userData = await userResponse.json();
        document.getElementById('orders-login-message').style.display = 'none';
        loadUserOrders();
      } else {
        // User is not logged in, show login message
        document.getElementById('orders-loading').style.display = 'none';
        document.getElementById('orders-login-message').style.display = 'block';
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      document.getElementById('orders-loading').style.display = 'none';
      document.getElementById('orders-login-message').style.display = 'block';
    }
  });
  
  // Load user orders from API
  async function loadUserOrders() {
    try {
      // Get CSRF token
      const csrfResponse = await fetch('/api/csrf-token');
      const csrfData = await csrfResponse.json();
      
      // Fetch the user's orders
      const ordersResponse = await fetch('/api/orders/user', {
        headers: {
          'X-CSRF-Token': csrfData.csrf_token
        }
      });
      
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const orders = await ordersResponse.json();
      
      // Hide loading indicator
      document.getElementById('orders-loading').style.display = 'none';
      
      // Check if user has any orders
      if (orders.length === 0) {
        document.getElementById('orders-empty').style.display = 'block';
        return;
      }
      
      // Display the orders
      displayOrders(orders);
      
    } catch (error) {
      console.error('Error loading orders:', error);
      document.getElementById('orders-loading').style.display = 'none';
      document.getElementById('orders-list').innerHTML = `
        <div class="error-message">
          <p>There was an error loading your orders. Please try again later.</p>
        </div>
      `;
    }
  }
  
  // Format date string
  function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
  
  // Get status badge HTML
  function getStatusBadge(status) {
    let badgeClass = '';
    
    switch(status) {
      case 'COMPLETED':
        badgeClass = 'status-completed';
        break;
      case 'APPROVED':
        badgeClass = 'status-approved';
        break;
      case 'CREATED':
        badgeClass = 'status-created';
        break;
      case 'FAILED':
        badgeClass = 'status-failed';
        break;
      default:
        badgeClass = 'status-other';
    }
    
    return `<span class="status-badge ${badgeClass}">${status}</span>`;
  }
  
  // Display orders in the DOM
  function displayOrders(orders) {
    const ordersListContainer = document.getElementById('orders-list');
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Get the 5 most recent orders
    const recentOrders = orders.slice(0, 5);
    
    let html = `
      <div class="orders-list">
        <h3>Your 5 Most Recent Orders</h3>
    `;
    
    recentOrders.forEach(order => {
      html += `
        <div class="order-item">
          <div class="order-header">
            <div class="order-title">
              <h4>Order #${order.order_id}</h4>
              ${getStatusBadge(order.status)}
            </div>
            <div class="order-date">
              ${formatDate(order.created_at)}
            </div>
          </div>
          <div class="order-total">
            Total: ${order.currency_code} ${parseFloat(order.total_amount).toFixed(2)}
          </div>
          <div class="order-items">
            <h5>Items:</h5>
            <ul>
      `;
      
      order.items.forEach(item => {
        html += `
          <li>
            ${item.product_name} x ${item.quantity} @ ${order.currency_code} ${parseFloat(item.price_at_purchase).toFixed(2)}
          </li>
        `;
      });
      
      html += `
            </ul>
          </div>
        </div>
      `;
    });
    
    html += `</div>`;
    
    ordersListContainer.innerHTML = html;
  }