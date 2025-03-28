document.addEventListener('DOMContentLoaded', () => {
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
  let cart = loadCart();
  updateCartDisplay(cart);

  // Listen for Add to Cart clicks
  document.addEventListener('click', (event) => {
    if (event.target.classList.contains('add-to-cart-btn')) {
      const btn = event.target;
      const name = btn.getAttribute('data-name');
      const price = parseFloat(btn.getAttribute('data-price'));
      
      if (name && price) {
        cart = addItemToCart(cart, { name, price, qty: 1 });
        saveCart(cart);
        updateCartDisplay(cart);
      }
    }
  });
  // PRODUCT DETAIL logic
  /*
  if (document.getElementById('product-name')) {
    const productsData = {
      1: { name: 'Product 1', price: 3.3, img: '...', description: '...' },
      2: { name: 'Product 2', price: 5.0, img: '...', description: '...' },
      3: { name: 'Product 3', price: 1.5, img: '...', description: '...' },
    };

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');
    const productInfo = productsData[productId] || productsData[1];

    document.getElementById('breadcrumb-product-name').textContent = productInfo.name;
    document.getElementById('product-name').textContent = productInfo.name;
    document.getElementById('product-price').textContent = productInfo.price.toFixed(2);
    document.getElementById('product-image').src = productInfo.img;
    document.getElementById('product-image').alt = productInfo.name;
    document.getElementById('product-description').textContent = productInfo.description;

    const productAddBtn = document.getElementById('product-add-cart-btn');
    productAddBtn.setAttribute('data-name', productInfo.name);
    productAddBtn.setAttribute('data-price', productInfo.price);
  }
  */
  // --- Event listener for qty input changes
  function attachCartQuantityListeners() {
    const qtyInputs = document.querySelectorAll('.cart-qty-input');
    qtyInputs.forEach(input => {
      input.addEventListener('change', () => {
        const newQty = parseInt(input.value);
        const itemName = input.getAttribute('data-name');
        
        // If it's valid but zero, remove the item
        if (!isNaN(newQty)) {
          if (newQty === 0) {
            cart = cart.filter(item => item.name !== itemName);
          } else {
            // Otherwise update the item’s quantity
            cart.forEach(item => {
              if (item.name === itemName) {
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

  function updateCartDisplay(cart) {
    let total = 0;
    let htmlItems = '';

    cart.forEach(item => {
      const subTotal = item.qty * item.price;
      total += subTotal;
      htmlItems += `
        <li>
          ${item.name} @ $${item.price.toFixed(2)}
          <input 
            type="number" 
            class="cart-qty-input" 
            value="${item.qty}" 
            data-name="${item.name}"
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

    // Reattach listeners to the newly generated input elements
    attachCartQuantityListeners();
  }
});

// Helpers
function loadCart() {
  const cartJSON = localStorage.getItem('cart');
  return cartJSON ? JSON.parse(cartJSON) : [];
}
function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
}
function addItemToCart(cart, newItem) {
  const existingItem = cart.find(item => item.name === newItem.name);
  if (existingItem) {
    existingItem.qty += newItem.qty;
  } else {
    cart.push(newItem);
  }
  return cart;
}
