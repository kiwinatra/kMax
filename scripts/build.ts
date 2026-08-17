import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const outputFile = path.join(buildDir, 'mod.user.js');

function ensureBuildDir(): void {
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }
}

function build(): void {
    console.log('🔨 Building kmod...');

    try {
        ensureBuildDir();

        const command = [
            'esbuild',
            'src/main.ts',
            '--bundle',
            '--minify',
            `--outfile=${outputFile}`,
            '--format=iife',
            '--platform=browser',
            '--target=es2020',
            '--sourcemap',
            '--legal-comments=none',
        ].join(' ');

        console.log(`📦 Running: ${command}`);
        execSync(command, { stdio: 'inherit', cwd: rootDir });

        console.log(`✅ Build complete: ${outputFile}`);

        const stats = fs.statSync(outputFile);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`📊 Size: ${size} KB`);

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

function watch(): void {
    console.log('👀 Watching for changes...');

    try {
        ensureBuildDir();

        const command = [
            'esbuild',
            'src/main.ts',
            '--bundle',
            `--outfile=${outputFile}`,
            '--format=iife',
            '--platform=browser',
            '--target=es2020',
            '--sourcemap',
            '--watch',
        ].join(' ');

        execSync(command, { stdio: 'inherit', cwd: rootDir });

    } catch (error) {
        console.error('❌ Watch failed:', error);
        process.exit(1);
    }
}

function clean(): void {
    console.log('🧹 Cleaning build directory...');

    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
        console.log('✅ Clean complete');
    } else {
        console.log('ℹ️  Build directory does not exist');
    }
}

function createTampermonkeyHeader(): void {
    console.log('📝 Creating Tampermonkey header...');

    const header = `// ==UserScript==
// @name         kMax Mod
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  Mod for max.ru
// @author       kMax Team
// @match        *://*.max.ru/*
// @match        *://max.ru/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

`;

    const outputWithHeader = path.join(buildDir, 'mod.user.js');

    if (fs.existsSync(outputFile)) {
        const content = fs.readFileSync(outputFile, 'utf-8');
        fs.writeFileSync(outputWithHeader, header + content);
        console.log(`✅ Tampermonkey script created: ${outputWithHeader}`);
    } else {
        console.log('⚠️  Build file not found, run build first');
    }
}

function fullBuild(): void {
    clean();
    build();
    createTampermonkeyHeader();
    console.log('🎉 Full build complete!');
}

function createDevBuild(): void {
    console.log('🔨 Building dev version with sourcemap...');

    try {
        ensureBuildDir();

        const command = [
            'esbuild',
            'src/main.ts',
            '--bundle',
            `--outfile=${outputFile}`,
            '--format=iife',
            '--platform=browser',
            '--target=es2020',
            '--sourcemap',
            '--legal-comments=none',
        ].join(' ');

        console.log(`📦 Running: ${command}`);
        execSync(command, { stdio: 'inherit', cwd: rootDir });

        console.log(`✅ Dev build complete: ${outputFile}`);

        const stats = fs.statSync(outputFile);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`📊 Size: ${size} KB`);

        createTampermonkeyHeader();

    } catch (error) {
        console.error('❌ Dev build failed:', error);
        process.exit(1);
    }
}

const args = process.argv.slice(2);
const command = args[0] || 'build';

switch (command) {
    case 'build':
        build();
        break;
    case 'watch':
        watch();
        break;
    case 'clean':
        clean();
        break;
    case 'header':
        createTampermonkeyHeader();
        break;
    case 'full':
        fullBuild();
        break;
    case 'dev':
        createDevBuild();
        break;
    default:
        console.log(`
Usage: npm run build [command]

Commands:
  build   - Build the mod (minified)
  watch   - Watch for changes and rebuild
  clean   - Clean build directory
  header  - Create Tampermonkey header
  full    - Clean + Build + Header
  dev     - Build with sourcemap (no minify)
        `);
        break;
}