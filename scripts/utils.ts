/*
* @author: potemk.in
* @brief: Utility script for building the kMax Mod and emulating its execution in Node.js.
* @desc: This file provides build utilities including bundling with esbuild, minification, sourcemap generation, Tampermonkey header injection, watch mode, cleaning, build statistics, and a simple Node.js emulation mode for testing the mod structure without jsdom.
*/

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

function ensureBuildDir(): void {
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
        console.log('📁 Build directory created');
    }
}

function getConfig(): { name: string; version: string; author: string; site: string } {
    try {
        const configPath = path.join(rootDir, 'src', 'config.ts');
        const content = fs.readFileSync(configPath, 'utf-8');
        
        const nameMatch = content.match(/name:\s*['"]([^'"]+)['"]/);
        const versionMatch = content.match(/version:\s*['"]([^'"]+)['"]/);
        const authorMatch = content.match(/author:\s*['"]([^'"]+)['"]/);
        const siteMatch = content.match(/site:\s*['"]([^'"]+)['"]/);
        
        return {
            name: nameMatch ? nameMatch[1] : 'kMax Mod',
            version: versionMatch ? versionMatch[1] : '1.0.0',
            author: authorMatch ? authorMatch[1] : 'kMax Team',
            site: siteMatch ? siteMatch[1] : 'max.ru',
        };
    } catch (error) {
        console.warn('⚠️ Could not read config.ts, using fallback values');
        return {
            name: 'kMax Mod',
            version: '1.0.0',
            author: 'kMax Team',
            site: 'max.ru',
        };
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

function createTampermonkeyHeader(): string {
    const config = getConfig();
    return `// ==UserScript==
// @name         ${config.name}
// @namespace    http://tampermonkey.net/
// @version      ${config.version}
// @description  Mod for ${config.site} with extra features: beta tester crown, photo metadata, hiding elements and analytics blocking
// @author       ${config.author}
// @match        *://*.${config.site}/*
// @match        *://${config.site}/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

`;
}

function build({ minify = true, sourcemap = true, watch = false } = {}): string | undefined {
    console.log(`🔨 Building kmod... (minify: ${minify}, sourcemap: ${sourcemap})`);

    try {
        ensureBuildDir();

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

        const content = fs.readFileSync(outfile, 'utf-8');
        const header = createTampermonkeyHeader();
        fs.writeFileSync(outfile, header + content);

        const size = getFileSize(outfile);
        console.log(`✅ Build complete: ${outfile} (${size} KB)`);

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
    build({ minify: true, sourcemap: true });
    console.log('🎉 Full build complete!');
}

function devBuild(): void {
    console.log('🔧 Building dev version (no minify)...');
    build({ minify: false, sourcemap: true });
    console.log('✅ Dev build complete!');
}

function headerOnly(): void {
    console.log('📝 Creating Tampermonkey header...');

    const header = createTampermonkeyHeader();

    const files = [
        { path: outputMinFile, label: 'minified' },
        { path: outputFile, label: 'source' },
    ];

    let found = false;
    for (const file of files) {
        if (fs.existsSync(file.path)) {
            const content = fs.readFileSync(file.path, 'utf-8');
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

    const config = getConfig();
    console.log(`  Name: ${config.name}`);
    console.log(`  Version: ${config.version}`);
    console.log(`  Author: ${config.author}`);
    console.log(`  Site: ${config.site}`);

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

async function emulate(): Promise<void> {
    console.log('🚀 Emulating mod in Node.js...');

    const config = getConfig();
    console.log(`📋 Config: ${config.name} v${config.version}`);

    const buildFile = outputMinFile;
    if (!fs.existsSync(buildFile)) {
        console.log('⚠️ Build file not found. Building first...');
        build({ minify: true, sourcemap: true });
    }

    try {
        console.log('🔄 Loading mod...');
        
        const modCode = fs.readFileSync(buildFile, 'utf-8');
        
        const vm = await import('vm');
        
        const eventListeners: Map<string, Function[]> = new Map();
        
        const context: any = {
            console: console,
            setTimeout: setTimeout,
            clearTimeout: clearTimeout,
            setInterval: setInterval,
            clearInterval: clearInterval,
            window: {
                addEventListener: (event: string, handler: Function) => {
                    if (!eventListeners.has(event)) {
                        eventListeners.set(event, []);
                    }
                    eventListeners.get(event)!.push(handler);
                },
                removeEventListener: (event: string, handler: Function) => {
                    if (eventListeners.has(event)) {
                        const handlers = eventListeners.get(event)!;
                        const index = handlers.indexOf(handler);
                        if (index !== -1) {
                            handlers.splice(index, 1);
                        }
                    }
                },
                dispatchEvent: (event: any) => {
                    const handlers = eventListeners.get(event.type || '');
                    if (handlers) {
                        for (const handler of handlers) {
                            handler(event);
                        }
                    }
                },
                location: {
                    hostname: 'max.ru',
                    href: 'https://max.ru/',
                    pathname: '/',
                    search: '',
                    hash: '',
                },
                open: () => ({ document: { write: () => {}, close: () => {} }, focus: () => {} }),
                // ===== ДОБАВЛЯЕМ НЕДОСТАЮЩИЕ БРАУЗЕРНЫЕ API =====
                setTimeout: setTimeout,
                clearTimeout: clearTimeout,
                setInterval: setInterval,
                clearInterval: clearInterval,
                requestAnimationFrame: (cb: any) => setTimeout(cb, 16),
                cancelAnimationFrame: (id: any) => clearTimeout(id),
                performance: {
                    now: () => Date.now(),
                },
                navigator: {
                    userAgent: 'Node.js',
                },
                // ===== КОНЕЦ ДОБАВЛЕНИЙ =====
            },
            document: {
                createElement: (tag: string) => ({ 
                    style: {}, 
                    classList: { add: () => {}, remove: () => {}, contains: () => false },
                    appendChild: () => {},
                    remove: () => {},
                    addEventListener: () => {},
                    removeEventListener: () => {},
                    setAttribute: () => {},
                    getAttribute: () => null,
                    textContent: '',
                    innerHTML: '',
                    querySelector: () => null,
                    querySelectorAll: () => [],
                    getElementById: () => null,
                }),
                querySelector: () => null,
                querySelectorAll: () => [],
                getElementById: () => null,
                body: {
                    appendChild: () => {},
                    querySelector: () => null,
                    querySelectorAll: () => [],
                },
                head: {
                    appendChild: () => {},
                    querySelector: () => null,
                    querySelectorAll: () => [],
                },
                documentElement: {
                    dataset: {},
                },
                addEventListener: (event: string, handler: Function) => {
                    if (!eventListeners.has(event)) {
                        eventListeners.set(event, []);
                    }
                    eventListeners.get(event)!.push(handler);
                },
                removeEventListener: (event: string, handler: Function) => {
                    if (eventListeners.has(event)) {
                        const handlers = eventListeners.get(event)!;
                        const index = handlers.indexOf(handler);
                        if (index !== -1) {
                            handlers.splice(index, 1);
                        }
                    }
                },
                dispatchEvent: (event: any) => {
                    const handlers = eventListeners.get(event.type || '');
                    if (handlers) {
                        for (const handler of handlers) {
                            handler(event);
                        }
                    }
                },
                readyState: 'complete',
                visibilityState: 'visible',
                createTreeWalker: () => ({
                    nextNode: () => null,
                }),
                createEvent: (type: string) => ({
                    initEvent: () => {},
                }),
                createTextNode: (text: string) => ({ textContent: text }),
            },
            localStorage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
                clear: () => {},
                length: 0,
                key: () => null,
            },
            sessionStorage: {
                getItem: () => null,
                setItem: () => {},
                removeItem: () => {},
                clear: () => {},
                length: 0,
                key: () => null,
            },
            MutationObserver: class {
                observe() {}
                disconnect() {}
            },
            requestAnimationFrame: (cb: any) => setTimeout(cb, 16),
            cancelAnimationFrame: (id: any) => clearTimeout(id),
            performance: {
                now: () => Date.now(),
            },
            navigator: {
                userAgent: 'Node.js',
            },
            Event: class Event {
                type: string;
                constructor(type: string) {
                    this.type = type;
                }
            },
            CustomEvent: class CustomEvent extends Event {
                detail: any;
                constructor(type: string, options?: any) {
                    super(type);
                    this.detail = options?.detail;
                }
            },
            alert: (msg: string) => console.log('[ALERT]', msg),
            confirm: (msg: string) => { console.log('[CONFIRM]', msg); return true; },
            prompt: (msg: string) => { console.log('[PROMPT]', msg); return null; },
        };

        const script = new vm.Script(`
            (function() {
                const global = this;
                ${modCode}
                return typeof window !== 'undefined' && window.kmod ? window.kmod : null;
            })()
        `);

        const kmod = script.runInNewContext(context);

        if (kmod) {
            console.log('✅ Mod loaded successfully!');
            console.log('📦 Available API:', Object.keys(kmod).join(', '));
            if (kmod.config) {
                console.log(`📋 Config:`, kmod.config);
            }
        } else {
            console.log('⚠️ Mod loaded but kmod API not found on window');
        }

        console.log('🎉 Emulation complete!');

    } catch (error) {
        console.error('❌ Emulation failed:', error);
        process.exit(1);
    }
}

function help(): void {
    console.log(`
╔══════════════════════════════════════════════════════════╗
║                   kMax Mod Utils                        ║
╚══════════════════════════════════════════════════════════╝

Usage: npm run utils [command]

Commands:
  build   - Build the mod (minified, with sourcemap)
  watch   - Watch for changes and rebuild (dev mode)
  clean   - Clean build directory
  header  - Add Tampermonkey header to existing build
  full    - Clean + Build + Header (production)
  dev     - Build without minification (debug)
  stats   - Show build statistics
  emulate - Emulate the mod in Node.js (no jsdom required)
  help    - Show this help

Examples:
  npm run utils build          # Quick build
  npm run utils full           # Full production build
  npm run utils watch          # Watch mode
  npm run utils dev            # Dev build with sourcemap
  npm run utils emulate        # Test mod in Node.js
`);
}

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
    case 'emulate':
        emulate();
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