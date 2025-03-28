const sharp = require('sharp');
const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const sqlite3 = require('better-sqlite3');

// Create Express app
const app = express();
const port = 3000;

// Connect to SQLite database
const dbPath = path.join(__dirname, 'myshop.db');
// Check if DB file exists, and if not, create it
if (!fs.existsSync(dbPath)) {
  console.log('Database file does not exist. Creating new database.');
  fs.writeFileSync(dbPath, '');
}

const db = sqlite3(dbPath, { verbose: console.log });

// Create tables if they don't exist
function initializeDatabase() {
  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      catid INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);

  // Create products table
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      pid INTEGER PRIMARY KEY AUTOINCREMENT,
      catid INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      description TEXT,
      image TEXT,
      FOREIGN KEY (catid) REFERENCES categories(catid)
    )
  `);

  console.log('Database initialized successfully');
}

// Initialize database
try {
  initializeDatabase();
} catch (err) {
  console.error('Error initializing database:', err);
}

// Middleware to parse form data
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads/products');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // For new products, we'll rename after DB insert to include product ID
    // For now, use a timestamp to avoid filename collisions
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + extension);
  }
});

// File filter function to validate image files
const fileFilter = (req, file, cb) => {
  // Accept only jpeg, png, and gif
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/gif') {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Only JPG, PNG, and GIF are allowed.'), false);
  }
};

// Set up multer with size limits (10MB)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB in bytes
  fileFilter: fileFilter
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Also serve the same files at the root path
app.use(express.static(path.join(__dirname, 'public')));

// Serve admin.html for both root and /admin routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Upload directory for product images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Helper function to validate input
const validateInput = (input, type) => {
  switch (type) {
    case 'name':
      // Alphanumeric and spaces only
      return /^[a-zA-Z0-9\s]+$/.test(input);
    case 'price':
      // Positive number with up to 2 decimal places
      return /^\d+(\.\d{1,2})?$/.test(input) && parseFloat(input) > 0;
    case 'catid':
      // Positive integer
      return /^\d+$/.test(input) && parseInt(input) > 0;
    default:
      return true;
  }
};

// API Routes
// Frontend API Endpoints
// Get all categories for the frontend
app.get('/api/frontend/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get products by category for the frontend
app.get('/api/frontend/products', (req, res) => {
  try {
    const catId = req.query.catid;
    let query = 'SELECT pid, name, price, image FROM products';
    let params = [];
    
    if (catId && validateInput(catId, 'catid')) {
      query += ' WHERE catid = ?';
      params = [catId];
    }
    
    query += ' ORDER BY name';
    
    const stmt = db.prepare(query);
    let results;
    
    if (params.length > 0) {
      results = stmt.all(params[0]);
    } else {
      results = stmt.all();
    }
    
    // Update image URLs to point to thumbnails
    results.forEach(product => {
      if (product.image) {
        // Check if a thumbnail exists, if not, use the original image
        const thumbnailName = 'thumb_' + product.image;
        const thumbnailPath = path.join(__dirname, 'uploads/products', thumbnailName);
        if (fs.existsSync(thumbnailPath)) {
          product.thumbnail = thumbnailName;
        } else {
          product.thumbnail = product.image;
        }
      }
    });
    
    res.json(results);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single product details for the frontend
app.get('/api/frontend/products/:id', (req, res) => {
  try {
    const productId = req.params.id;
    
    if (!validateInput(productId, 'catid')) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.catid = c.catid
      WHERE p.pid = ?
    `;
    
    const product = db.prepare(query).get(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Add thumbnail URL if available
    if (product.image) {
      const thumbnailName = 'thumb_' + product.image;
      const thumbnailPath = path.join(__dirname, 'uploads/products', thumbnailName);
      if (fs.existsSync(thumbnailPath)) {
        product.thumbnail = thumbnailName;
      } else {
        product.thumbnail = product.image;
      }
    }
    
    res.json(product);
  } catch (err) {
    console.error('Error fetching product details:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new category
app.post('/api/categories', (req, res) => {
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name || !validateInput(name, 'name')) {
      return res.status(400).json({ error: 'Invalid category name' });
    }
    
    const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const result = stmt.run(name);
    
    res.status(201).json({ id: result.lastInsertRowid, name });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update a category
app.put('/api/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    const { name } = req.body;
    
    // Validate input
    if (!validateInput(id, 'catid') || !name || !validateInput(name, 'name')) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    
    const stmt = db.prepare('UPDATE categories SET name = ? WHERE catid = ?');
    const result = stmt.run(name, id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ id, name });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a category
app.delete('/api/categories/:id', (req, res) => {
  try {
    const id = req.params.id;
    
    // Validate input
    if (!validateInput(id, 'catid')) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // First check if there are any products in this category
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM products WHERE catid = ?');
    const { count } = countStmt.get(id);
    
    if (count > 0) {
      return res.status(400).json({ error: 'Cannot delete category with products. Move or delete the products first.' });
    }
    
    // If no products, proceed with deletion
    const deleteStmt = db.prepare('DELETE FROM categories WHERE catid = ?');
    const result = deleteStmt.run(id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all products
app.get('/api/products', (req, res) => {
  try {
    const query = `
      SELECT p.*, c.name as category_name 
      FROM products p
      JOIN categories c ON p.catid = c.catid
      ORDER BY p.name
    `;
    
    const products = db.prepare(query).all();
    res.json(products);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new product with image upload
app.post('/api/products', upload.single('image'), (req, res) => {
  try {
    const { name, price, description, catid } = req.body;
    
    // Validate inputs
    if (!name || !validateInput(name, 'name')) {
      return res.status(400).json({ error: 'Invalid product name' });
    }
    
    if (!price || !validateInput(price, 'price')) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    
    if (!catid || !validateInput(catid, 'catid')) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Product image is required' });
    }
    
    // Get the temporary file path
    const tempFilePath = req.file.path;
    
    // Insert product into database
    const stmt = db.prepare(
      'INSERT INTO products (catid, name, price, description, image) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(catid, name, price, description, req.file.filename);
    
    const productId = result.lastInsertRowid;
    
    // Process image and create thumbnail
    resizeProductImage(tempFilePath, productId)
      .then(newFileName => {
        // Update the image filename in the database
        const updateStmt = db.prepare(
          'UPDATE products SET image = ? WHERE pid = ?'
        );
        updateStmt.run(newFileName, productId);
        
        // Return success response
        res.status(201).json({
          id: productId,
          name,
          price,
          description,
          catid,
          image: newFileName
        });
      })
      .catch(err => {
        console.error('Error processing image:', err);
        res.status(201).json({
          id: productId,
          name,
          price,
          description,
          catid,
          image: req.file.filename
        });
      });
  } catch (err) {
    console.error('Error creating product:', err);
    
    // Delete the uploaded file if DB insert fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Database error' });
  }
});

// Update a product
app.put('/api/products/:id', upload.single('image'), (req, res) => {
  try {
    const id = req.params.id;
    const { name, price, description, catid } = req.body;
    
    // Validate inputs
    if (!validateInput(id, 'catid')) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    if (!name || !validateInput(name, 'name')) {
      return res.status(400).json({ error: 'Invalid product name' });
    }
    
    if (!price || !validateInput(price, 'price')) {
      return res.status(400).json({ error: 'Invalid price' });
    }
    
    if (!catid || !validateInput(catid, 'catid')) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }
    
    // First get the current product to check if it exists and get the current image
    const currentProduct = db.prepare('SELECT * FROM products WHERE pid = ?').get(id);
    
    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    let imageName = currentProduct.image;
    
    // If a new file was uploaded, process it
    if (req.file) {
      // Get the temporary file path
      const tempFilePath = req.file.path;
      
      // Delete the old image and thumbnail if they exist
      const oldImagePath = path.join(__dirname, 'uploads/products', currentProduct.image);
      const oldThumbPath = path.join(__dirname, 'uploads/products', `thumb_${currentProduct.image}`);
      
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      
      if (fs.existsSync(oldThumbPath)) {
        fs.unlinkSync(oldThumbPath);
      }
      
      // Resize the new image and create thumbnail
      resizeProductImage(tempFilePath, id)
        .then(newFileName => {
          imageName = newFileName;
          // Update product in database with new image
          updateProductInDatabase(id, name, price, description, catid, imageName, res);
        })
        .catch(err => {
          console.error('Error processing image:', err);
          // Continue with the update using the original filename
          imageName = req.file.filename;
          updateProductInDatabase(id, name, price, description, catid, imageName, res);
        });
    } else {
      // No new image, update other fields only
      updateProductInDatabase(id, name, price, description, catid, imageName, res);
    }
  } catch (err) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  try {
    const id = req.params.id;
    
    // Validate input
    if (!validateInput(id, 'catid')) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    // First get the product to find the image filename
    const product = db.prepare('SELECT * FROM products WHERE pid = ?').get(id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Delete the product from the database
    const stmt = db.prepare('DELETE FROM products WHERE pid = ?');
    stmt.run(id);
    
    // Delete the product image and thumbnail
    const imagePath = path.join(__dirname, 'uploads/products', product.image);
    const thumbPath = path.join(__dirname, 'uploads/products', `thumb_${product.image}`);
    
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get dashboard stats
app.get('/api/stats', (req, res) => {
  try {
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    
    res.json({
      categoryCount,
      productCount
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Serve admin HTML pages
app.get('/admin-categories.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-categories.html'));
});

app.get('/admin-products.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-products.html'));
});

app.get('/admin-styles.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  res.sendFile(path.join(__dirname, 'public', 'admin-styles.css'));
});

app.get('/admin-scripts.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.sendFile(path.join(__dirname, 'public', 'admin-scripts.js'));
});

// Helper function to resize image and create thumbnail
async function resizeProductImage(imagePath, productId) {
  try {
    const imageExt = path.extname(imagePath);
    const imageDir = path.dirname(imagePath);
    const newFileName = `product-${productId}${imageExt}`;
    const newFilePath = path.join(imageDir, newFileName);
    const thumbnailPath = path.join(imageDir, `thumb_${newFileName}`);
    
    // Rename original image if needed
    if (imagePath !== newFilePath) {
      fs.renameSync(imagePath, newFilePath);
    }
    
    // Create thumbnail (resized to 200x200, maintaining aspect ratio)
    await sharp(newFilePath)
      .resize(200, 200, {
        fit: sharp.fit.inside,
        withoutEnlargement: true
      })
      .toFile(thumbnailPath);
    
    return newFileName;
  } catch (error) {
    console.error('Error resizing image:', error);
    return path.basename(imagePath);
  }
}

// Helper function to update product in database
function updateProductInDatabase(id, name, price, description, catid, imageName, res) {
  try {
    const stmt = db.prepare(
      'UPDATE products SET name = ?, price = ?, description = ?, catid = ?, image = ? WHERE pid = ?'
    );
    stmt.run(name, price, description, catid, imageName, id);
    
    res.json({
      id,
      name,
      price,
      description,
      catid,
      image: imageName
    });
  } catch (err) {
    console.error('Error updating product in database:', err);
    res.status(500).json({ error: 'Database error' });
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size is too large. Maximum size is 10MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + err.message });
  }
  
  res.status(500).json({ error: 'Something went wrong' });
});

// Close database when app is terminated
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});