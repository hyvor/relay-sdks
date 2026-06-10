import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    target: 'es2022',
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    define: {
        __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
});
