const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Paths to persistent data
const ORDERS_FILE = path.join(__dirname, 'data', 'orders.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const { PRODUCTS, CATEGORIES } = require('./public/js/products.js');

// Utility to read JSON
function readJson(filePath, defaultVal = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultVal, null, 2));
      return defaultVal;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading JSON:', filePath, err);
    return defaultVal;
  }
}

// Utility to write JSON
function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('Error writing JSON:', filePath, err);
    return false;
  }
}

// --- API ENDPOINTS ---

// 1. Get Products (Category filter, Search, Sorting)
app.get('/api/products', (req, res) => {
  const { category, search, sort } = req.query;
  let list = [...PRODUCTS];

  if (category && category !== 'all') {
    list = list.filter(p => p.categorySlug === category);
  }

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(p => 
      p.title.toLowerCase().includes(q) || 
      p.category.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (sort === 'price-low') {
    list.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-high') {
    list.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    list.sort((a, b) => b.rating - a.rating);
  }

  res.json({
    success: true,
    total: list.length,
    products: list
  });
});

// 2. Get Single Product
app.get('/api/products/:id', (req, res) => {
  const product = PRODUCTS.find(p => p.id === req.params.id || p.sku.toLowerCase() === req.params.id.toLowerCase());
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product });
});

// 3. Get Categories
app.get('/api/categories', (req, res) => {
  res.json({ success: true, categories: CATEGORIES });
});

// 4. Create New Order (Cash on Delivery, Credit Card, PayPal)
app.post('/api/orders', (req, res) => {
  const { customer, items, paymentMethod, paymentDetails, discount = 0 } = req.body;

  if (!customer || !items || !items.length || !paymentMethod) {
    return res.status(400).json({ success: false, message: 'Missing required order details' });
  }

  // Calculate pricing
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const settings = readJson(SETTINGS_FILE, {});
  const freeThreshold = settings.shipping?.freeShippingThreshold || 50;
  const shipping = subtotal >= freeThreshold ? 0 : 4.99;
  const tax = Number((subtotal * 0.0825).toFixed(2)); // Texas 8.25% standard sales tax
  const total = Number((subtotal - discount + shipping + tax).toFixed(2));

  // Generate Walmart-compliant IDs & Carrier Tracking
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const orderId = `TET-${randomSuffix}`;
  const trackingNumber = `FX-78${Math.floor(1000000000 + Math.random() * 9000000000)}`;

  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').substring(0, 16);

  const newOrder = {
    id: orderId,
    createdAt: now.toISOString(),
    customer: {
      fullName: customer.fullName || `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      state: customer.state || 'TX',
      zip: customer.zip
    },
    items,
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    shipping,
    tax,
    total,
    paymentMethod, // 'cod', 'card', 'paypal'
    paymentStatus: paymentMethod === 'cod' ? 'Cash on Delivery (Pending on Arrival)' : 'Paid (Authorized)',
    orderStatus: 'Confirmed & Processing',
    carrier: 'FedEx Home Delivery',
    trackingNumber,
    timeline: [
      { status: 'Order Placed & Verified', time: dateStr, location: 'Online Verification Hub', done: true },
      { status: 'Sent to Texas Fulfillment Depot', time: 'In Progress', location: 'Houston Logistics Facility', done: true },
      { status: 'Quality Packing & Barcode Scan', time: 'Pending', location: 'Fulfillment Center #1', done: false },
      { status: 'FedEx Courier Pickup', time: 'Scheduled', location: 'Houston, TX', done: false },
      { status: paymentMethod === 'cod' ? 'Out for Delivery (Cash on Arrival)' : 'Out for Delivery', time: 'Expected 3-5 Days', location: 'Local Customer Depot', done: false }
    ]
  };

  const orders = readJson(ORDERS_FILE, []);
  orders.unshift(newOrder);
  writeJson(ORDERS_FILE, orders);

  res.status(201).json({
    success: true,
    message: 'Order placed successfully',
    order: newOrder
  });
});

// 5. Track Order by ID or Tracking Number
app.get('/api/orders/:identifier', (req, res) => {
  const id = req.params.identifier.trim().toUpperCase();
  const orders = readJson(ORDERS_FILE, []);
  const order = orders.find(o => 
    o.id.toUpperCase() === id || 
    (o.trackingNumber && o.trackingNumber.toUpperCase() === id)
  );

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order or tracking number not found. Please verify your order number.' });
  }

  res.json({ success: true, order });
});

// 6. Get All Orders (Admin Dashboard)
app.get('/api/admin/orders', (req, res) => {
  const orders = readJson(ORDERS_FILE, []);
  res.json({ success: true, total: orders.length, orders });
});

// 7. Update Order Status (Admin)
app.put('/api/admin/orders/:id', (req, res) => {
  const id = req.params.id;
  const { orderStatus, paymentStatus, trackingNumber } = req.body;
  const orders = readJson(ORDERS_FILE, []);
  const index = orders.findIndex(o => o.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (orderStatus) orders[index].orderStatus = orderStatus;
  if (paymentStatus) orders[index].paymentStatus = paymentStatus;
  if (trackingNumber) orders[index].trackingNumber = trackingNumber;

  writeJson(ORDERS_FILE, orders);
  res.json({ success: true, message: 'Order updated', order: orders[index] });
});

// 8. Get Store Settings
app.get('/api/settings', (req, res) => {
  const settings = readJson(SETTINGS_FILE, {});
  res.json({ success: true, settings });
});

// 9. Update Store Settings (Admin)
app.post('/api/settings', (req, res) => {
  const currentSettings = readJson(SETTINGS_FILE, {});
  const updatedSettings = { ...currentSettings, ...req.body };
  writeJson(SETTINGS_FILE, updatedSettings);
  res.json({ success: true, message: 'Store settings updated successfully', settings: updatedSettings });
});

// Handle direct navigation to admin
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Texas Expo Tech Solutions LLC - Storefront Live!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🔒 Admin: http://localhost:${PORT}/admin`);
  console.log(`📦 Loaded Catalog: ${PRODUCTS.length} Products across ${CATEGORIES.length} Categories`);
  console.log(`💵 Cash on Delivery (COD) & Instant Invoicing Active`);
  console.log(`=======================================================`);
});
