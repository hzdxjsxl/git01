const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('public'));
app.use('/dist', express.static('dist'));
app.use('/node_modules', express.static('node_modules'));

app.get('/api/gcode/:filename', (req, res) => {
  const filename = req.params.filename;
  const gcodeDir = path.join(__dirname, 'gcode');
  const filePath = path.join(gcodeDir, filename);

  if (!fs.existsSync(gcodeDir)) {
    fs.mkdirSync(gcodeDir, { recursive: true });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `G-code file not found: ${filename}` });
  }

  const stats = fs.statSync(filePath);
  const fileSize = stats.size;
  console.log(`[G-code] Serving: ${filename} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

app.get('/api/gcode-list', (req, res) => {
  const gcodeDir = path.join(__dirname, 'gcode');
  
  if (!fs.existsSync(gcodeDir)) {
    fs.mkdirSync(gcodeDir, { recursive: true });
    return res.json({ files: [] });
  }

  const files = fs.readdirSync(gcodeDir)
    .filter(file => file.toLowerCase().endsWith('.gcode') || file.toLowerCase().endsWith('.g'))
    .map(file => {
      const stats = fs.statSync(path.join(gcodeDir, file));
      return {
        name: file,
        size: stats.size,
        modified: stats.mtime
      };
    });

  res.json({ files });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n====================================================`);
  console.log(`  3D Print G-code Viewer Server`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`====================================================\n`);
  console.log(`  Place your G-code files in: ${path.join(__dirname, 'gcode')}`);
  console.log(`  Supported formats: .gcode, .g\n`);
});
