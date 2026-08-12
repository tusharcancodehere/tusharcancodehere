#!/usr/bin/env node
/**
 * generate-starship-gif.py launcher / runner helper
 * This script invokes python scripts/generate_gif.py to create assets/starship-activity.gif
 */

const { execSync } = require('child_process');
const path = require('path');

try {
  console.log('Generating animated starship activity GIF via Python script...');
  const pyScript = path.resolve(__dirname, 'generate_gif.py');
  const output = execSync(`python "${pyScript}"`, { encoding: 'utf8' });
  console.log(output);
} catch (err) {
  console.error('GIF generation failed:', err.message);
  if (err.stdout) console.log(err.stdout);
  if (err.stderr) console.error(err.stderr);
}
