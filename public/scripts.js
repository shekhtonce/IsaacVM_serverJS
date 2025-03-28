// These functions are kept for backward compatibility
window.loadCart = function() {
  return window.shoppingCart ? window.shoppingCart.items : [];
};

window.saveCart = function(cart) {
  if (window.shoppingCart) {
    window.shoppingCart.items = cart;
    window.shoppingCart.saveToStorage();
  } else {
    localStorage.setItem('cart', JSON.stringify(cart));
  }
};

window.addItemToCart = function(cart, newItem) {
  if (window.shoppingCart) {
    // If using the new system, let it handle the logic
    window.shoppingCart.addItem(
      newItem.pid || `name_${newItem.name.replace(/\s+/g, '_')}`, 
      newItem.name, 
      newItem.price, 
      newItem.qty
    );
    return window.shoppingCart.items;
  } else {
    // Fallback to old logic
    const existingItem = cart.find(item => {
      if (newItem.pid && item.pid) {
        return item.pid === newItem.pid;
      }
      return item.name === newItem.name;
    });
    
    if (existingItem) {
      existingItem.qty += newItem.qty;
    } else {
      cart.push(newItem);
    }
    return cart;
  }
};

window.updateCartDisplay = function(cart) {
  if (window.shoppingCart) {
    window.shoppingCart.updateDisplay();
  } else {
    // Old implementation (just in case)
    let total = 0;
    let htmlItems = '';

    cart.forEach(item => {
      const subTotal = item.qty * item.price;
      total += subTotal;
      const dataAttr = item.pid ? `data-pid="${item.pid}"` : `data-name="${item.name}"`;
      
      htmlItems += `
        <li>
          ${item.name} @ $${item.price.toFixed(2)}
          <input 
            type="number" 
            class="cart-qty-input" 
            value="${item.qty}" 
            ${dataAttr}
            min="0"
          />
        </li>
      `;
    });

    if (cart.length === 0) {
      htmlItems = '<li>Your cart is empty.</li>';
    }

    const cartItemsList = document.getElementById('cart-items');
    const cartTotalElem = document.getElementById('cart-total');
    const cartSummaryElem = document.getElementById('cart-summary');

    if (cartItemsList && cartTotalElem && cartSummaryElem) {
      cartItemsList.innerHTML = htmlItems;
      cartTotalElem.textContent = total.toFixed(2);
      cartSummaryElem.textContent = `Shopping List: $${total.toFixed(2)}`;
    }
    
    // Attach listeners
    attachCartQuantityListeners();
  }
};

// We'll keep this function for compatibility
function attachCartQuantityListeners() {
  const qtyInputs = document.querySelectorAll('.cart-qty-input');
  qtyInputs.forEach(input => {
    input.addEventListener('change', () => {
      const newQty = parseInt(input.value);
      const itemName = input.getAttribute('data-name');
      const itemPid = input.getAttribute('data-pid');
      
      if (!isNaN(newQty)) {
        let cart = loadCart();
        if (newQty === 0) {
          if (itemPid) {
            cart = cart.filter(item => item.pid !== itemPid);
          } else {
            cart = cart.filter(item => item.name !== itemName);
          }
        } else {
          cart.forEach(item => {
            if ((itemPid && item.pid === itemPid) || 
                (!itemPid && item.name === itemName)) {
              item.qty = newQty;
            }
          });
        }
        saveCart(cart);
        updateCartDisplay(cart);
      }
    });
  });
}