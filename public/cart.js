// ShoppingCart class - manages the entire cart
class ShoppingCart {
    constructor() {
      this.items = [];
      this.loadFromStorage();
      this.initEventListeners();
    }
    
    initEventListeners() {
      // Listen for Add to Cart button clicks
      document.addEventListener('click', (event) => {
        if (event.target.classList.contains('add-to-cart-btn')) {
          this.handleAddToCart(event.target);
        }
      });
      
      // Cart display toggle
      const cartWrapper = document.querySelector('.cart-wrapper');
      const cartDetails = document.querySelector('.cart-details');
      if (cartWrapper && cartDetails) {
        cartWrapper.addEventListener('mouseenter', () => {
          cartDetails.style.display = 'block';
        });
        cartWrapper.addEventListener('mouseleave', () => {
          setTimeout(() => {
            cartDetails.style.display = 'none';
          }, 200);
        });
      }
    }
    
    handleAddToCart(button) {
      const pid = button.getAttribute('data-id');
      const name = button.getAttribute('data-name');
      const price = parseFloat(button.getAttribute('data-price'));
      
      if (pid && name && price) {
        this.addItem(pid, name, price, 1);
        this.saveToStorage();
        this.updateDisplay();
      }
    }
    
    addItem(pid, name, price, qty) {
      const existingItem = this.items.find(item => item.pid === pid);
      if (existingItem) {
        existingItem.qty += qty;
      } else {
        this.items.push(new CartItem(pid, name, price, qty));
      }
    }
    
    updateItemQty(pid, newQty) {
      if (newQty <= 0) {
        this.removeItem(pid);
      } else {
        const item = this.items.find(item => item.pid === pid);
        if (item) {
          item.qty = newQty;
        }
      }
      this.saveToStorage();
      this.updateDisplay();
    }
    
    removeItem(pid) {
      this.items = this.items.filter(item => item.pid !== pid);
      this.saveToStorage();
      this.updateDisplay();
    }
    
    getTotal() {
      return this.items.reduce((total, item) => total + (item.price * item.qty), 0);
    }
    
    loadFromStorage() {
      const cartJSON = localStorage.getItem('cart');
      if (cartJSON) {
        try {
          const savedItems = JSON.parse(cartJSON);
          
          // Check if the saved items have pid (new format) or just name (old format)
          if (savedItems.length > 0 && savedItems[0].pid) {
            // New format
            this.items = savedItems.map(item => 
              new CartItem(item.pid, item.name, item.price, item.qty)
            );
          } else {
            // Old format - convert to new format with fallback pid
            this.items = savedItems.map(item => 
              new CartItem(`name_${item.name.replace(/\s+/g, '_')}`, item.name, item.price, item.qty)
            );
          }
        } catch (error) {
          console.error('Error parsing cart from localStorage:', error);
          this.items = [];
        }
      }
    }
    
    saveToStorage() {
      localStorage.setItem('cart', JSON.stringify(this.items));
    }
    
    updateDisplay() {
      const cartItemsList = document.getElementById('cart-items');
      const cartTotalElem = document.getElementById('cart-total');
      const cartSummaryElem = document.getElementById('cart-summary');
      
      if (!cartItemsList || !cartTotalElem || !cartSummaryElem) return;
      
      const total = this.getTotal();
      let htmlItems = '';
      
      if (this.items.length === 0) {
        htmlItems = '<li>Your cart is empty.</li>';
      } else {
        this.items.forEach(item => {
          htmlItems += `
            <li>
              ${item.name} @ $${item.price.toFixed(2)}
              <div class="quantity-control">
                <button class="qty-btn qty-decrease" data-pid="${item.pid}">-</button>
                <input 
                  type="number" 
                  class="cart-qty-input" 
                  value="${item.qty}" 
                  data-pid="${item.pid}"
                  min="0"
                />
                <button class="qty-btn qty-increase" data-pid="${item.pid}">+</button>
              </div>
            </li>
          `;
        });
      }
      
      cartItemsList.innerHTML = htmlItems;
      cartTotalElem.textContent = total.toFixed(2);
      cartSummaryElem.textContent = `Shopping List: $${total.toFixed(2)}`;
      
      // Attach event listeners to the newly added quantity controls
      this.attachQuantityControlListeners();
    }
    
    attachQuantityControlListeners() {
      // Quantity input change
      const qtyInputs = document.querySelectorAll('.cart-qty-input');
      qtyInputs.forEach(input => {
        input.addEventListener('change', () => {
          const newQty = parseInt(input.value);
          const pid = input.getAttribute('data-pid');
          if (!isNaN(newQty) && pid) {
            this.updateItemQty(pid, newQty);
          }
        });
      });
      
      // Decrease buttons
      const decreaseBtns = document.querySelectorAll('.qty-decrease');
      decreaseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-pid');
          const item = this.items.find(item => item.pid === pid);
          if (item && pid) {
            this.updateItemQty(pid, item.qty - 1);
          }
        });
      });
      
      // Increase buttons
      const increaseBtns = document.querySelectorAll('.qty-increase');
      increaseBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const pid = btn.getAttribute('data-pid');
          const item = this.items.find(item => item.pid === pid);
          if (item && pid) {
            this.updateItemQty(pid, item.qty + 1);
          }
        });
      });
    }
    
    // Load product details via AJAX
    async refreshProductDetails() {
      // Only refresh if there are items in the cart
      if (this.items.length === 0) return;
      
      // Collect all pids that need to be refreshed
      const pids = this.items.map(item => item.pid);
      
      // Refresh each product's details
      for (const pid of pids) {
        // Skip pids that are fallbacks (starting with "name_")
        if (pid.startsWith('name_')) continue;
        
        try {
          const response = await fetch(`/api/frontend/products/${pid}`);
          if (response.ok) {
            const product = await response.json();
            // Update the item with fresh data
            const item = this.items.find(item => item.pid === pid);
            if (item) {
              item.name = product.name;
              item.price = parseFloat(product.price);
            }
          }
        } catch (error) {
          console.error(`Error refreshing product ${pid}:`, error);
        }
      }
      
      // Save updated cart and refresh display
      this.saveToStorage();
      this.updateDisplay();
    }
  }
  
  // CartItem class - represents an item in the cart
  class CartItem {
    constructor(pid, name, price, qty) {
      this.pid = pid;
      this.name = name;
      this.price = price;
      this.qty = qty;
    }
    
    getSubtotal() {
      return this.price * this.qty;
    }
  }
  
  // Add CSS for quantity controls
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
      .quantity-control {
        display: flex;
        align-items: center;
        margin-top: 5px;
      }
      
      .qty-btn {
        width: 25px;
        height: 25px;
        background-color: #f0f0f0;
        border: 1px solid #ccc;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .cart-qty-input {
        width: 40px;
        text-align: center;
        margin: 0 5px;
      }
    `;
    document.head.appendChild(style);
    
    // Create a global cart instance
    window.shoppingCart = new ShoppingCart();
    
    // Refresh product details from the server
    window.shoppingCart.refreshProductDetails();
  });