// Checkout Handler
document.addEventListener('DOMContentLoaded', () => {
  console.log('Checkout page loaded');
  
  // Load CSRF token
  loadCSRFToken();
  
  // Populate checkout page with cart items
  displayCheckoutItems();
  
  // Add event listener to checkout button
  const checkoutButton = document.getElementById('checkout-button');
  if (checkoutButton) {
    checkoutButton.addEventListener('click', handleCheckout);
    console.log('Checkout button listener attached');
  } else {
    console.error('Checkout button not found');
  }
});

// Load CSRF token for form submission
async function loadCSRFToken() {
  try {
    console.log('Loading CSRF token...');
    const response = await fetch('/api/csrf-token');
    if (!response.ok) {
      throw new Error(`Failed to load CSRF token: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('CSRF token loaded successfully');
    
    if (data.csrf_token) {
      // Set CSRF token in the form
      const csrfInput = document.getElementById('csrf-token');
      if (csrfInput) {
        csrfInput.value = data.csrf_token;
        console.log('CSRF token set in form');
      } else {
        console.error('CSRF input field not found');
      }
    } else {
      console.error('CSRF token not found in response');
    }
  } catch (error) {
    console.error('Error loading CSRF token:', error);
  }
}

// Display cart items in the checkout page
function displayCheckoutItems() {
  console.log('Displaying checkout items');
  
  // Get the cart items
  let cartItems = [];
  
  if (window.shoppingCart) {
    cartItems = window.shoppingCart.items;
    console.log('Using shopping cart items:', cartItems);
  } else {
    // Fallback to old cart system
    cartItems = window.loadCart();
    console.log('Using legacy cart items:', cartItems);
  }
  
  const checkoutItemsContainer = document.getElementById('checkout-items');
  const checkoutTotalElement = document.getElementById('checkout-total');
  
  if (!checkoutItemsContainer || !checkoutTotalElement) {
    console.error('Checkout items container or total element not found');
    return;
  }
  
  // If cart is empty, show message and disable checkout
  if (cartItems.length === 0) {
    checkoutItemsContainer.innerHTML = '<p>Your cart is empty. Please add some items before checkout.</p>';
    checkoutTotalElement.textContent = '0.00';
    
    const checkoutButton = document.getElementById('checkout-button');
    if (checkoutButton) {
      checkoutButton.disabled = true;
      checkoutButton.textContent = 'Cart Empty';
    }
    console.log('Cart is empty, disabled checkout button');
    return;
  }
  
  // Display the items in a table
  let html = `
    <table class="checkout-table">
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
  
  let total = 0;
  
  cartItems.forEach((item, index) => {
    const subtotal = item.price * item.qty;
    total += subtotal;
    
    html += `
      <tr>
        <td>${item.name}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>${item.qty}</td>
        <td>$${subtotal.toFixed(2)}</td>
      </tr>
    `;
  });
  
  html += `
      </tbody>
    </table>
  `;
  
  checkoutItemsContainer.innerHTML = html;
  checkoutTotalElement.textContent = total.toFixed(2);
  console.log('Checkout items displayed, total:', total.toFixed(2));
}

// Handle checkout button click
async function handleCheckout() {
  console.log('Checkout button clicked');
  
  // Disable the button to prevent multiple clicks
  const checkoutButton = document.getElementById('checkout-button');
  if (checkoutButton) {
    checkoutButton.disabled = true;
    checkoutButton.textContent = 'Processing...';
    console.log('Checkout button disabled');
  }
  
  try {
    // Get cart items
    let cartItems = [];
    
    if (window.shoppingCart) {
      cartItems = window.shoppingCart.items;
      console.log('Using shopping cart items for checkout:', cartItems);
    } else {
      // Fallback to old cart system
      cartItems = window.loadCart();
      console.log('Using legacy cart items for checkout:', cartItems);
    }
    
    // Format cart data for the server - FIX: rename qty to quantity to match server expectation
    const cartData = cartItems.map(item => ({
      pid: item.pid,
      quantity: item.qty  // Server expects 'quantity', not 'qty'
    }));
    console.log('Formatted cart data for server:', cartData);
    
    // Get CSRF token
    const csrfToken = document.getElementById('csrf-token').value;
    console.log('CSRF token for checkout:', csrfToken ? 'Token found' : 'Token missing');
    
    // Create request body
    const requestBody = JSON.stringify({
      items: cartData,
      csrf_token: csrfToken
    });
    console.log('Request body prepared:', requestBody);
    
    // Send cart data to server to create an order
    console.log('Sending order creation request to server...');
    const response = await fetch('/api/orders/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: requestBody
    });
    
    console.log('Server response received:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Failed to create order: ${response.status} ${response.statusText}`);
    }
    
    const orderData = await response.json();
    console.log('Order created successfully:', orderData);
    
    // Update the form with order information
    document.getElementById('order-id').value = orderData.orderId;
    document.getElementById('order-digest').value = orderData.orderDigest;
    console.log('Form updated with order ID and digest');
    
    // Generate the PayPal item fields
    generatePayPalItemFields(orderData.items);
    console.log('PayPal item fields generated');
    
    // Submit the form
    console.log('Submitting form to PayPal...');
    document.getElementById('paypal-form').submit();
    
  } catch (error) {
    console.error('Checkout error:', error);
    alert('There was an error processing your checkout. Please try again.');
    
    // Re-enable the checkout button
    if (checkoutButton) {
      checkoutButton.disabled = false;
      checkoutButton.textContent = 'Proceed to Checkout';
      console.log('Checkout button re-enabled after error');
    }
  }
}

// Generate PayPal item fields for the form
function generatePayPalItemFields(items) {
  console.log('Generating PayPal item fields for items:', items);
  const paypalItemsContainer = document.getElementById('paypal-items');
  
  if (!paypalItemsContainer) {
    console.error('PayPal items container not found');
    return;
  }
  
  let html = '';
  
  items.forEach((item, index) => {
    // PayPal uses 1-based indexing for items
    const itemIndex = index + 1;
    
    html += `
      <input type="hidden" name="item_name_${itemIndex}" value="${item.name}">
      <input type="hidden" name="item_number_${itemIndex}" value="${item.pid}">
      <input type="hidden" name="amount_${itemIndex}" value="${item.price.toFixed(2)}">
      <input type="hidden" name="quantity_${itemIndex}" value="${item.quantity}">
    `;
  });
  
  paypalItemsContainer.innerHTML = html;
  console.log('PayPal item fields generated successfully');
}