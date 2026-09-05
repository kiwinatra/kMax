import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const outputFile = path.join(buildDir, 'mod.user.js');
const outputMinFile = path.join(buildDir, 'mod.min.user.js');

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

function ensureBuildDir(): void {
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
        console.log('📁 Build directory created');
    }
}

function getPackageVersion(): string {
    try {
        const pkgPath = path.join(rootDir, 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return pkg.version || '1.0.0';
    } catch {
        return '1.0.0';
    }
}

function getFileSize(filePath: string): string {
    try {
        const stats = fs.statSync(filePath);
        return (stats.size / 1024).toFixed(2);
    } catch {
        return '0';
    }
}

function createTampermonkeyHeader(version: string = getPackageVersion()): string {
    return `// ==UserScript==
// @name         kMax Mod
// @namespace    http://tampermonkey.net/
// @version      ${version}
// @description  Mod for max.ru with extra features: beta tester crown, photo metadata, hiding elements and analytics blocking
// @author       kMax Team
// @match        *://*.max.ru/*
// @match        *://max.ru/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

`;
}

// ============================================================
// ОСНОВНЫЕ ФУНКЦИИ СБОРКИ
// ============================================================

function build({ minify = true, sourcemap = true, watch = false } = {}): void {
    console.log(`🔨 Building kmod... (minify: ${minify}, sourcemap: ${sourcemap})`);

    try {
        ensureBuildDir();

        const version = getPackageVersion();
        const outfile = minify ? outputMinFile : outputFile;

        const command = [
            'esbuild',
            'src/main.ts',
            '--bundle',
            minify ? '--minify' : '',
            sourcemap ? '--sourcemap' : '',
            `--outfile=${outfile}`,
            '--format=iife',
            '--platform=browser',
            '--target=es2020',
            '--legal-comments=none',
            watch ? '--watch' : '',
        ].filter(Boolean).join(' ');

        console.log(`📦 Running: ${command}`);
        execSync(command, { stdio: 'inherit', cwd: rootDir });

        // Добавляем заголовок
        const content = fs.readFileSync(outfile, 'utf-8');
        const header = createTampermonkeyHeader(version);
        fs.writeFileSync(outfile, header + content);

        const size = getFileSize(outfile);
        console.log(`✅ Build complete: ${outfile} (${size} KB)`);

        // Если есть минифицированная версия — показываем размер
        if (minify && fs.existsSync(outputMinFile)) {
            const minSize = getFileSize(outputMinFile);
            console.log(`📊 Minified: ${outputMinFile} (${minSize} KB)`);
        }

        return outfile;

    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

function watch(): void {
    console.log('👀 Watching for changes...');
    build({ minify: false, sourcemap: true, watch: true });
}

function clean(): void {
    console.log('🧹 Cleaning build directory...');

    if (fs.existsSync(buildDir)) {
        const files = fs.readdirSync(buildDir);
        let count = 0;
        for (const file of files) {
            fs.rmSync(path.join(buildDir, file), { recursive: true, force: true });
            count++;
        }
        console.log(`✅ Clean complete: ${count} files removed`);
    } else {
        console.log('ℹ️  Build directory does not exist');
    }
}

function fullBuild(): void {
    console.log('🎯 Full build started...');
    clean();
    const outfile = build({ minify: true, sourcemap: true });
    console.log(`🎉 Full build complete! Output: ${outfile}`);
}

function devBuild(): void {
    console.log('🔧 Building dev version (no minify)...');
    build({ minify: false, sourcemap: true });
    console.log('✅ Dev build complete!');
}

function headerOnly(): void {
    console.log('📝 Creating Tampermonkey header...');

    const version = getPackageVersion();
    const header = createTampermonkeyHeader(version);

    // Проверяем наличие собранного файла
    const files = [
        { path: outputMinFile, label: 'minified' },
        { path: outputFile, label: 'source' },
    ];

    let found = false;
    for (const file of files) {
        if (fs.existsSync(file.path)) {
            const content = fs.readFileSync(file.path, 'utf-8');
            // Удаляем старый заголовок, если есть
            const cleanContent = content.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n/, '');
            fs.writeFileSync(file.path, header + cleanContent);
            console.log(`✅ Header added to: ${file.path}`);
            found = true;
        }
    }

    if (!found) {
        console.log('⚠️  No build file found. Run "npm run build" first.');
    }
}

function stats(): void {
    console.log('📊 Build statistics:');

    const files = [
        { path: outputMinFile, label: 'Minified' },
        { path: outputFile, label: 'Source' },
    ];

    let totalSize = 0;
    for (const file of files) {
        if (fs.existsSync(file.path)) {
            const size = getFileSize(file.path);
            const stats = fs.statSync(file.path);
            console.log(`  ${file.label}: ${size} KB (${stats.size} bytes)`);
            totalSize += stats.size;
        } else {
            console.log(`  ${file.label}: not found`);
        }
    }

    if (totalSize > 0) {
        console.log(`  Total: ${(totalSize / 1024).toFixed(2)} KB`);
    }
}

function help(): void {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                   kMax Mod Builder                       ║
╚══════════════════════════════════════════════════════════╝

Usage: npm run build [command]

Commands:
  build   - Build the mod (minified, with sourcemap)
  watch   - Watch for changes and rebuild (dev mode)
  clean   - Clean build directory
  header  - Add Tampermonkey header to existing build
  full    - Clean + Build + Header (production)
  dev     - Build without minification (debug)
  stats   - Show build statistics
  help    - Show this help

Examples:
  npm run build          # Quick build
  npm run build full     # Full production build
  npm run build watch    # Watch mode
  npm run build dev      # Dev build with sourcemap
`);
}

// ============================================================
// ЗАПУСК
// ============================================================

const args = process.argv.slice(2);
const command = args[0] || 'build';

switch (command) {
    case 'build':
        build({ minify: true, sourcemap: true });
        break;
    case 'watch':
        watch();
        break;
    case 'clean':
        clean();
        break;
    case 'header':
        headerOnly();
        break;
    case 'full':
        fullBuild();
        break;
    case 'dev':
        devBuild();
        break;
    case 'stats':
        stats();
        break;
    case 'help':
    case '--help':
    case '-h':
        help();
        break;
    default:
        console.log(`❌ Unknown command: ${command}`);
        help();
        break;
}