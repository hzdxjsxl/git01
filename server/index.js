const http = require('http');

const products = [
  { id: 1, name: 'iPhone 15 Pro', price: 7999, stock: 50, tags: ['VIP', 'Electronics'] },
  { id: 2, name: 'MacBook Air', price: 8999, stock: 20, tags: ['VIP', 'Electronics', 'New'] },
  { id: 3, name: 'AirPods Pro', price: 1899, stock: 100, tags: ['Electronics'] },
  { id: 4, name: 'Nike Air Max', price: 899, stock: 200, tags: ['Fashion'] },
  { id: 5, name: 'Adidas Ultraboost', price: 1199, stock: 150, tags: ['Fashion', 'VIP'] },
  { id: 6, name: '戴森吹风机', price: 3299, stock: 30, tags: ['Home', 'VIP', 'New'] },
  { id: 7, name: '小米手环 8', price: 299, stock: 500, tags: ['Electronics'] },
  { id: 8, name: '华为 Mate 60', price: 6999, stock: 80, tags: ['VIP', 'Electronics', 'New'] },
  { id: 9, name: '索尼降噪耳机', price: 2499, stock: 60, tags: ['Electronics'] },
  { id: 10, name: 'Levi\'s 牛仔裤', price: 599, stock: 300, tags: ['Fashion'] },
  { id: 11, name: '优衣库羽绒服', price: 799, stock: 250, tags: ['Fashion', 'New'] },
  { id: 12, name: '戴森吸尘器', price: 4999, stock: 25, tags: ['Home', 'VIP'] },
];

const rules = [
  { id: 1, name: '高价商品', expression: "price > 5000" },
  { id: 2, name: 'VIP 商品', expression: "tag == 'VIP'" },
  { id: 3, name: '热门组合', expression: "price > 1000 && tag == 'VIP'" },
  { id: 4, name: '库存充足', expression: "stock > 100" },
  { id: 5, name: '新品且昂贵', expression: "tag == 'New' && price > 2000" },
];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/api/products') {
    res.writeHead(200);
    res.end(JSON.stringify(products));
  } else if (url.pathname === '/api/rules') {
    res.writeHead(200);
    res.end(JSON.stringify(rules));
  } else if (url.pathname === '/api/data') {
    res.writeHead(200);
    res.end(JSON.stringify({ products, rules }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`API Endpoints:`);
  console.log(`  - GET /api/products`);
  console.log(`  - GET /api/rules`);
  console.log(`  - GET /api/data`);
});
