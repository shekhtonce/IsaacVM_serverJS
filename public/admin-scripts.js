document.addEventListener('DOMContentLoaded', () => {
  // Initialize CSRF protection for all forms
  if (window.csrfUtils) {
    window.csrfUtils.addTokenToForms();
  }

  // Common function to show error messages
  const showError = (message) => {
    alert(message);
  };

  // Fetch dashboard stats if on the dashboard page
  if (document.getElementById('category-count')) {
    fetchDashboardStats();
  }

  // Fetch categories for dropdowns and listings
  const categorySelect = document.getElementById('product-category');
  const editCategorySelect = document.getElementById('edit-product-category');
  
  if (categorySelect || document.getElementById('categories-list')) {
    fetchCategories();
  }

  // Fetch products if on the products page
  if (document.getElementById('products-list')) {
    fetchProducts();
  }

  // Set up event listeners for forms
  const addCategoryForm = document.getElementById('add-category-form');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', handleAddCategory);
  }

  const addProductForm = document.getElementById('add-product-form');
  if (addProductForm) {
    addProductForm.addEventListener('submit', handleAddProduct);
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

  // Event delegation for edit/delete buttons that will be dynamically added
  document.addEventListener('click', (event) => {
    // Edit category button
    if (event.target.classList.contains('edit-category-btn')) {
      const catId = event.target.dataset.id;
      const catName = event.target.dataset.name;
      openEditCategoryModal(catId, catName);
    }
    
    // Delete category button
    if (event.target.classList.contains('delete-category-btn')) {
      const catId = event.target.dataset.id;
      const catName = event.target.dataset.name;
      confirmDeleteCategory(catId, catName);
    }
    
    // Edit product button
    if (event.target.classList.contains('edit-product-btn')) {
      const productId = event.target.dataset.id;
      openEditProductModal(productId);
    }
    
    // Delete product button
    if (event.target.classList.contains('delete-product-btn')) {
      const productId = event.target.dataset.id;
      const productName = event.target.dataset.name;
      confirmDeleteProduct(productId, productName);
    }
  });

  // Set up edit form submit handlers
  const editCategoryForm = document.getElementById('edit-category-form');
  if (editCategoryForm) {
    editCategoryForm.addEventListener('submit', handleEditCategory);
  }

  const editProductForm = document.getElementById('edit-product-form');
  if (editProductForm) {
    editProductForm.addEventListener('submit', handleEditProduct);
  }

  /* ---------- FUNCTIONS ---------- */

  // Dashboard stats
  async function fetchDashboardStats() {
    try {
      const response = await fetch('/api/stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      
      const stats = await response.json();
      
      // Update the stats on the dashboard
      document.getElementById('category-count').textContent = stats.categoryCount;
      document.getElementById('product-count').textContent = stats.productCount;
    } catch (error) {
      console.error('Error fetching stats:', error);
      showError('Failed to load dashboard stats');
    }
  }

  // Categories
  async function fetchCategories() {
    try {
      const response = await fetch('/api/categories');
      
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      
      const categories = await response.json();
      
      // Update category dropdowns for product forms if they exist
      if (categorySelect) {
        populateCategoryDropdown(categorySelect, categories);
      }
      
      if (editCategorySelect) {
        populateCategoryDropdown(editCategorySelect, categories);
      }
      
      // Update categories table if it exists
      const categoriesList = document.getElementById('categories-list');
      if (categoriesList) {
        renderCategoriesTable(categoriesList, categories);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      showError('Failed to load categories');
    }
  }

  function populateCategoryDropdown(selectElement, categories) {
    // Clear existing options except the first one
    while (selectElement.options.length > 1) {
      selectElement.remove(1);
    }
    
    // Add categories to the dropdown
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category.catid;
      option.textContent = category.name;
      selectElement.appendChild(option);
    });
  }

  function renderCategoriesTable(tableBody, categories) {
    if (categories.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="3">No categories found</td></tr>';
      return;
    }
    
    // Use the safe rendering utility from sanitize.js
    window.sanitizeUtils.renderSafeTable(
      tableBody,
      categories,
      {
        catid: (cell, value) => {
          cell.textContent = value;
        },
        name: (cell, value) => {
          cell.textContent = value;
        }
      },
      (actionsCell, category) => {
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-edit edit-category-btn';
        editButton.setAttribute('data-id', category.catid);
        editButton.setAttribute('data-name', window.sanitizeUtils.encodeHTML(category.name));
        editButton.textContent = 'Edit';
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger delete-category-btn';
        deleteButton.setAttribute('data-id', category.catid);
        deleteButton.setAttribute('data-name', window.sanitizeUtils.encodeHTML(category.name));
        deleteButton.textContent = 'Delete';
        
        // Add buttons to the cell
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
      }
    );
  }

  async function handleAddCategory(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const categoryName = formData.get('name');
    
    try {
      // Use the safeFetch method to automatically add CSRF token
      const response = await window.csrfUtils.safeFetch('/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: categoryName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add category');
      }
      
      // Clear the form
      event.target.reset();
      
      // Refresh categories list
      fetchCategories();
      
      alert('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      showError(error.message);
    }
  }

  // Safely open edit category modal
  function openEditCategoryModal(catId, catName) {
    // Populate form fields safely
    document.getElementById('edit-category-id').value = catId;
    document.getElementById('edit-category-name').value = window.sanitizeUtils.encodeHTML(catName);
    
    // Show the modal
    document.getElementById('edit-category-modal').style.display = 'block';
  }

  async function handleEditCategory(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const catId = formData.get('catid');
    const catName = formData.get('name');
    
    try {
      // Use the safeFetch method to automatically add CSRF token
      const response = await window.csrfUtils.safeFetch(`/api/categories/${catId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: catName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update category');
      }
      
      // Hide the modal
      document.getElementById('edit-category-modal').style.display = 'none';
      
      // Refresh categories list
      fetchCategories();
      
      alert('Category updated successfully');
    } catch (error) {
      console.error('Error updating category:', error);
      showError(error.message);
    }
  }

  // Safely confirm category deletion
  function confirmDeleteCategory(catId, catName) {
    const safeName = window.sanitizeUtils.encodeHTML(catName);
    if (confirm(`Are you sure you want to delete the category "${safeName}"? This action cannot be undone.`)) {
      deleteCategory(catId);
    }
  }

  async function deleteCategory(catId) {
    try {
      // Use the safeFetch method to automatically add CSRF token
      const response = await window.csrfUtils.safeFetch(`/api/categories/${catId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }
      
      // Refresh categories list
      fetchCategories();
      
      alert('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      showError(error.message);
    }
  }

  // Products
  async function fetchProducts() {
    try {
      const response = await fetch('/api/products');
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const products = await response.json();
      
      // Update products table
      const productsList = document.getElementById('products-list');
      renderProductsTable(productsList, products);
    } catch (error) {
      console.error('Error fetching products:', error);
      showError('Failed to load products');
    }
  }

  // Modified version of renderProductsTable with sanitization
  function renderProductsTable(tableBody, products) {
    if (products.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No products found</td></tr>';
      return;
    }
    
    // Use the safe rendering utility from sanitize.js
    window.sanitizeUtils.renderSafeTable(
      tableBody,
      products,
      {
        pid: (cell, value) => {
          cell.textContent = value;
        },
        image: (cell, value) => {
          // Create image element safely
          const img = document.createElement('img');
          img.src = `/uploads/products/${window.sanitizeUtils.encodeHTML(value)}`;
          img.alt = 'Product image';
          img.height = 50;
          cell.appendChild(img);
        },
        name: (cell, value) => {
          cell.textContent = value;
        },
        category_name: (cell, value) => {
          cell.textContent = value;
        },
        price: (cell, value) => {
          cell.textContent = `$${parseFloat(value).toFixed(2)}`;
        }
      },
      (actionsCell, product) => {
        // Create edit button
        const editButton = document.createElement('button');
        editButton.className = 'btn btn-edit edit-product-btn';
        editButton.setAttribute('data-id', product.pid);
        editButton.textContent = 'Edit';
        
        // Create delete button
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger delete-product-btn';
        deleteButton.setAttribute('data-id', product.pid);
        deleteButton.setAttribute('data-name', window.sanitizeUtils.encodeHTML(product.name));
        deleteButton.textContent = 'Delete';
        
        // Add buttons to the cell
        actionsCell.appendChild(editButton);
        actionsCell.appendChild(deleteButton);
      }
    );
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Add CSRF token to the form data
    const csrfToken = await window.csrfUtils.getToken();
    formData.append('csrf_token', csrfToken);
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add product');
      }
      
      // Clear the form
      event.target.reset();
      
      // Refresh products list
      fetchProducts();
      
      alert('Product added successfully');
    } catch (error) {
      console.error('Error adding product:', error);
      showError(error.message);
    }
  }

  // Safely open edit product modal
  async function openEditProductModal(productId) {
    try {
      // First, get the product details
      const response = await fetch(`/api/products`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      
      const products = await response.json();
      const product = products.find(p => p.pid == productId);
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Populate form fields safely
      document.getElementById('edit-product-id').value = product.pid;
      document.getElementById('edit-product-name').value = window.sanitizeUtils.encodeHTML(product.name);
      document.getElementById('edit-product-price').value = product.price;
      document.getElementById('edit-product-description').value = window.sanitizeUtils.encodeHTML(product.description);
      
      // Set the selected category
      const categorySelect = document.getElementById('edit-product-category');
      for (let i = 0; i < categorySelect.options.length; i++) {
        if (categorySelect.options[i].value == product.catid) {
          categorySelect.selectedIndex = i;
          break;
        }
      }
      
      // Show current image safely
      const imgElement = document.getElementById('current-product-image');
      imgElement.src = `/uploads/products/${window.sanitizeUtils.encodeHTML(product.image)}`;
      imgElement.alt = window.sanitizeUtils.encodeHTML(product.name);
      
      // Show the modal
      document.getElementById('edit-product-modal').style.display = 'block';
    } catch (error) {
      console.error('Error opening edit product modal:', error);
      showError(error.message);
    }
  }

  async function handleEditProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const productId = formData.get('pid');
    
    // If no new image was selected, the file input will be empty
    // Remove it from formData to avoid issues
    if (formData.get('image').size === 0) {
      formData.delete('image');
    }
    
    // Add CSRF token to the form data
    const csrfToken = await window.csrfUtils.getToken();
    formData.append('csrf_token', csrfToken);
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: formData,
        headers: {
          'X-CSRF-Token': csrfToken
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      
      // Hide the modal
      document.getElementById('edit-product-modal').style.display = 'none';
      
      // Refresh products list
      fetchProducts();
      
      alert('Product updated successfully');
    } catch (error) {
      console.error('Error updating product:', error);
      showError(error.message);
    }
  }

  // Safely confirm product deletion
  function confirmDeleteProduct(productId, productName) {
    const safeName = window.sanitizeUtils.encodeHTML(productName);
    if (confirm(`Are you sure you want to delete the product "${safeName}"? This action cannot be undone.`)) {
      deleteProduct(productId);
    }
  }

  async function deleteProduct(productId) {
    try {
      // Use the safeFetch method to automatically add CSRF token
      const response = await window.csrfUtils.safeFetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete product');
      }
      
      // Refresh products list
      fetchProducts();
      
      alert('Product deleted successfully');
    } catch (error) {
      console.error('Error deleting product:', error);
      showError(error.message);
    }
  }
});