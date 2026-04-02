'use strict';

const fs = require('fs');
const path = require('path');
const { loadThemeSync } = require('../lib/theme.ts');

const country = process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md';
const theme = loadThemeSync(country);
const outPath = path.join(__dirname, '..', 'lib', 'theme.json');
fs.writeFileSync(outPath, JSON.stringify(theme, null, 2));
