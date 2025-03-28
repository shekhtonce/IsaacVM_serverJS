document.addEventListener('DOMContentLoaded', () => {
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
    
    let html = '';
    
    categories.forEach(category => {
      html += `
        <tr>
          <td>${category.catid}</td>
          <td>${category.name}</td>
          <td class="table-actions">
            <button class="btn btn-edit edit-category-btn" 
                    data-id="${category.catid}" 
                    data-name="${category.name}">
              Edit
            </button>
            <button class="btn btn-danger delete-category-btn" 
                    data-id="${category.catid}" 
                    data-name="${category.name}">
              Delete
            </button>
          </td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = html;
  }

  async function handleAddCategory(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const categoryName = formData.get('name');
    
    try {
      const response = await fetch('/api/categories', {
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

  function openEditCategoryModal(catId, catName) {
    // Populate form fields
    document.getElementById('edit-category-id').value = catId;
    document.getElementById('edit-category-name').value = catName;
    
    // Show the modal
    document.getElementById('edit-category-modal').style.display = 'block';
  }

  async function handleEditCategory(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const catId = formData.get('catid');
    const catName = formData.get('name');
    
    try {
      const response = await fetch(`/api/categories/${catId}`, {
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

  function confirmDeleteCategory(catId, catName) {
    if (confirm(`Are you sure you want to delete the category "${catName}"? This action cannot be undone.`)) {
      deleteCategory(catId);
    }
  }

  async function deleteCategory(catId) {
    try {
      const response = await fetch(`/api/categories/${catId}`, {
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

  function renderProductsTable(tableBody, products) {
    if (products.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="6">No products found</td></tr>';
      return;
    }
    
    let html = '';
    
    products.forEach(product => {
      html += `
        <tr>
          <td>${product.pid}</td>
          <td>
            <img src="/uploads/products/${product.image}" alt="${product.name}" height="50">
          </td>
          <td>${product.name}</td>
          <td>${product.category_name}</td>
          <td>$${parseFloat(product.price).toFixed(2)}</td>
          <td class="table-actions">
            <button class="btn btn-edit edit-product-btn" 
                    data-id="${product.pid}">
              Edit
            </button>
            <button class="btn btn-danger delete-product-btn" 
                    data-id="${product.pid}" 
                    data-name="${product.name}">
              Delete
            </button>
          </td>
        </tr>
      `;
    });
    
    tableBody.innerHTML = html;
  }

  async function handleAddProduct(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData
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
      
      // Populate form fields
      document.getElementById('edit-product-id').value = product.pid;
      document.getElementById('edit-product-name').value = product.name;
      document.getElementById('edit-product-price').value = product.price;
      document.getElementById('edit-product-description').value = product.description;
      
      // Set the selected category
      const categorySelect = document.getElementById('edit-product-category');
      for (let i = 0; i < categorySelect.options.length; i++) {
        if (categorySelect.options[i].value == product.catid) {
          categorySelect.selectedIndex = i;
          break;
        }
      }
      
      // Show current image
      document.getElementById('current-product-image').src = `/uploads/products/${product.image}`;
      
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
    
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        body: formData
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

  function confirmDeleteProduct(productId, productName) {
    if (confirm(`Are you sure you want to delete the product "${productName}"? This action cannot be undone.`)) {
      deleteProduct(productId);
    }
  }

  async function deleteProduct(productId) {
    try {
      const response = await fetch(`/api/products/${productId}`, {
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
