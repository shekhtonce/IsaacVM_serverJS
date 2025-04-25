// js/checkout-success.js

document.addEventListener('DOMContentLoaded', () => {
    // Get the order ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('invoice');
    // const orderId = urlParams.get('order_id');
  
    if (orderId) {
      const orderIdElement = document.getElementById('success-order-id');
      if (orderIdElement) {
          orderIdElement.textContent = orderId;
      } else {
          console.error('Element with ID "success-order-id" not found.');
      }
    } else {
        console.warn('Order ID not found in URL parameters.');
    }
  
    // Clear the shopping cart
    // Ensure shoppingCart object and its methods exist before calling them
    if (typeof shoppingCart !== 'undefined' && shoppingCart && typeof shoppingCart.saveToStorage === 'function' && typeof shoppingCart.updateDisplay === 'function') {
      shoppingCart.items = [];
      shoppingCart.saveToStorage();
      shoppingCart.updateDisplay();
    } else {
        console.warn('shoppingCart object or its methods not found. Cart may not be cleared.');
    }
  });