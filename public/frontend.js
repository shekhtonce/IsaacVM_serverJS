// Debug logging
console.log('Frontend.js loaded successfully');

// Add error handler for fetch requests
function fetchWithErrorHandling(url, options = {}) {
  console.log(`Fetching ${url}...`);
  return fetch(url, options)
    .then(response => {
      console.log(`Response from ${url}:`, response);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  // Load categories for the sidebar
  const categoriesContainer = document.querySelector('.categories ul');
  if (categoriesContainer) {
    loadCategories(categoriesContainer, 'sidebar');
  }
  
  // Load categories for the header navigation
  const headerNavContainer = document.querySelector('.main-nav ul');
  if (headerNavContainer) {
    loadCategories(headerNavContainer, 'header');
  }
  
  // Check if we're on the main page with product grid
  const productsGrid = document.querySelector('.products-grid');
  if (productsGrid) {
    // Get category ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const catId = urlParams.get('catid');
    
    // Update breadcrumb based on selected category
    updateBreadcrumb(catId);
    
    // Load products for selected category (or all if none selected)
    loadProducts(productsGrid, catId);
  }
  
  // Check if we're on the product detail page
  const productDetail = document.querySelector('.product-detail');
  if (productDetail && !document.querySelector('.products-grid')) {
    // Get product ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');
    
    if (productId) {
      loadProductDetails(productDetail, productId);
    }
  }
});
  
// Function to load categories from API
async function loadCategories(container, location) {
  try {
    const categories = await fetchWithErrorHandling('/api/frontend/categories');
    
    // Generate HTML for categories
    let html = '';
    
    if (location === 'header') {
      // For header, we'll keep the Home link but replace all other links
      // Get the Home link if it exists
      const homeLink = container.querySelector('li:first-child').cloneNode(true);
      
      // Clear all existing links
      container.innerHTML = '';
      
      // Add back the Home link
      container.appendChild(homeLink);
      
      // Add the categories
      categories.forEach(category => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="index.html?catid=${category.catid}">${category.name}</a>`;
        container.appendChild(li);
      });
    } else {
      // For the sidebar, include all categories
      categories.forEach(category => {
        html += `<li><a href="index.html?catid=${category.catid}">${category.name}</a></li>`;
      });
      
      // Replace all content for sidebar
      container.innerHTML = html;
    }
    
    // Update active category if one is selected
    const urlParams = new URLSearchParams(window.location.search);
    const selectedCatId = urlParams.get('catid');
    
    if (selectedCatId) {
      const activeLinks = container.querySelectorAll(`a[href="index.html?catid=${selectedCatId}"]`);
      activeLinks.forEach(link => {
        link.classList.add('active');
      });
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    if (location === 'sidebar') {
      container.innerHTML = '<li>Error loading categories</li>';
    }
  }
}
  
// Function to update breadcrumb navigation
async function updateBreadcrumb(catId) {
  const breadcrumb = document.querySelector('.breadcrumb');
  if (!breadcrumb) return;
  
  // Default breadcrumb
  let breadcrumbHtml = '<a href="index.html">Home</a>';
  
  // If category is selected, add it to breadcrumb
  if (catId) {
    try {
      const categories = await fetchWithErrorHandling('/api/frontend/categories');
      const category = categories.find(cat => cat.catid == catId);
      
      if (category) {
        breadcrumbHtml += ` &gt; <a href="index.html?catid=${category.catid}">${category.name}</a>`;
      }
    } catch (error) {
      console.error('Error fetching category for breadcrumb:', error);
    }
  }
  
  breadcrumb.innerHTML = breadcrumbHtml;
}
  
// Function to load products from API
async function loadProducts(container, catId) {
  try {
    // Build URL with category filter if provided
    let url = '/api/frontend/products';
    if (catId) {
      url += `?catid=${catId}`;
    }
    
    const products = await fetchWithErrorHandling(url);
    
    // Check if we have products
    if (products.length === 0) {
      container.innerHTML = '<p class="no-products">No products found in this category.</p>';
      return;
    }
    
    // Generate HTML for products
    let html = '';
    products.forEach(product => {
      const imageUrl = product.thumbnail 
        ? `/uploads/products/${product.thumbnail}` 
        : `/uploads/products/${product.image}`;
      
      html += `
        <article class="product-item">
          <a href="product.html?product=${product.pid}" class="product-link">
            <img src="${imageUrl}" alt="${product.name}" onerror="this.src='/uploads/products/default.jpg';" />
            <h3>${product.name}</h3>
          </a>
          <p class="price">$${parseFloat(product.price).toFixed(2)}</p>
          <button class="add-to-cart-btn" 
                  data-name="${product.name}" 
                  data-price="${product.price}"
                  data-id="${product.pid}">
            Add to Cart
          </button>
        </article>
      `;
    });
    
    // Update the container
    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading products:', error);
    container.innerHTML = '<p class="error">Error loading products</p>';
  }
}
  
// Function to load product details from API
async function loadProductDetails(container, productId) {
  try {
    const product = await fetchWithErrorHandling(`/api/frontend/products/${productId}`);
    
    // Update product details in the DOM
    const imageElement = container.querySelector('.product-img img');
    if (imageElement) {
      // Use full-size image for product details page
      imageElement.src = `/uploads/products/${product.image}`;
      imageElement.alt = product.name;
      imageElement.onerror = function() { this.src = '/uploads/products/default.jpg'; };
    }
    
    const nameElement = container.querySelector('#product-name');
    if (nameElement) {
      nameElement.textContent = product.name;
    }
    
    const priceElement = container.querySelector('#product-price');
    if (priceElement) {
      priceElement.textContent = parseFloat(product.price).toFixed(2);
    }
    
    const descriptionElement = container.querySelector('#product-description');
    if (descriptionElement) {
      descriptionElement.textContent = product.description || 'No description available.';
    }
    
    // Update the breadcrumb
    const breadcrumbHtml = `
      <a href="index.html">Home</a> &gt;
      <a href="index.html?catid=${product.catid}">${product.category_name}</a> &gt;
      <span>${product.name}</span>
    `;
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
      breadcrumb.innerHTML = breadcrumbHtml;
    }
    
    // Update add to cart button
    const addCartBtn = container.querySelector('#product-add-cart-btn');

    if (addCartBtn) {
      addCartBtn.setAttribute('data-name', product.name);
      addCartBtn.setAttribute('data-price', product.price);
      addCartBtn.setAttribute('data-id', product.pid);
    }
  } catch (error) {
    console.error('Error loading product details:', error);
    container.innerHTML = '<p class="error">Error loading product details</p>';
  }
}
  
// Add helper function to handle cart operations
function addItemToCart(newItem) {
  if (window.shoppingCart) {
    // Use the new cart system
    window.shoppingCart.addItem(
      newItem.id || newItem.pid || `name_${newItem.name.replace(/\s+/g, '_')}`,
      newItem.name, 
      newItem.price, 
      newItem.qty
    );
  } else {
    // Fallback to old methods from scripts.js
    let cart = loadCart();
    cart = window.addItemToCart(cart, newItem);
    saveCart(cart);
    updateCartDisplay(cart);
  }
}