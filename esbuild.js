const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/main/indexPage.js', 'src/main/workspacePage.js'],
  bundle: true,
  outdir: 'dist',
  minify: false, // We'll keep it readable for now
  sourcemap: true,
  format: 'iife', // Safe for file:// execution
}).catch(() => process.exit(1));
