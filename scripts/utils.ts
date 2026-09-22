/*
* @author: potemk.in
* @brief: Utility script for building the kMax Mod and emulating its execution in Node.js.
* @desc: Bundles with esbuild, injects a self-SHA into the output, prepends the Tampermonkey header,
*        and supports watch / clean / stats / emulate. The self-SHA is computed from the bundle
*        with the SHA marker region collapsed to an empty string, so both build-time and runtime
*        can reproduce the exact same hash without needing a fixed point.
*/

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const buildDir = path.join(rootDir, 'build');
const outputFile = path.join(buildDir, 'mod.user.js');
const outputMinFile = path.join(buildDir, 'mod.min.user.js');

// ============================================================
// SELF-SHA MARKER
// ------------------------------------------------------------
// esbuild injects the placeholder between these two markers.
// After bundling, we collapse the region and hash the result.
// checkForUpdate() at runtime does the exact same collapse,
// so the hash always matches.
// ============================================================

const SHA_START = '__KMOD_SHA_START__';
const SHA_END = '__KMOD_SHA_END__';
const SHA_STUB = `${SHA_START}${SHA_END}`;
const SHA_REGEX = new RegExp(`${SHA_START}[^"]*${SHA_END}`, 'g');

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
    } catch {
        console.warn('⚠️ Could not read config.ts, using fallback values');
        return {
            name: 'kMax Mod',
            version: '1.0.0',
            author: 'kMax Team',
            site: 'max.ru',
        };
    }
}

function getFileSize(filePath: string): string {
    try {
        return (fs.statSync(filePath).size / 1024).toFixed(2);
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

/** SHA-256 of a file's raw bytes → hex string. */
function computeFileSha(filePath: string): string {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/** Collapse the SHA marker region, then hash. Used both here and at runtime. */
function computeStubSha(content: string): string {
    const stub = content.replace(SHA_REGEX, SHA_STUB);
    return crypto.createHash('sha256').update(stub, 'utf-8').digest('hex');
}

function build({ minify = true, sourcemap = false, watch = false } = {}): string | undefined {
    console.log(`🔨 Building kmod... (minify: ${minify}, sourcemap: ${sourcemap})`);

    try {
        ensureBuildDir();

        const outfile = minify ? outputMinFile : outputFile;

        // The value we inject must be a valid JS string literal (with quotes).
        // We wrap it between markers so runtime can find and collapse it.
        const defineValue = JSON.stringify(`${SHA_START}PLACEHOLDER${SHA_END}`);

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

        // Prepend Tampermonkey header
        const bundle = fs.readFileSync(outfile, 'utf-8');
        const header = createTampermonkeyHeader();
        let content = header + bundle;

        // Compute SHA from the collapsed stub (marker region → empty)
        const sha = computeStubSha(content);

        // Inject the real SHA into the marker region
        content = content.replace(SHA_REGEX, `${SHA_START}${sha}${SHA_END}`);
        fs.writeFileSync(outfile, content);

        console.log(`🔑 Self SHA-256: ${sha}`);
        console.log(`✅ Build complete: ${outfile} (${getFileSize(outfile)} KB)`);

        if (minify && fs.existsSync(outputMinFile)) {
            console.log(`📊 Minified: ${outputMinFile} (${getFileSize(outputMinFile)} KB)`);
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
        for (const file of files) {
            fs.rmSync(path.join(buildDir, file), { recursive: true, force: true });
        }
        console.log(`✅ Clean complete: ${files.length} files removed`);
    } else {
        console.log('ℹ️  Build directory does not exist');
    }
}

function fullBuild(): void {
    console.log('🎯 Full build started...');
    clean();
    build({ minify: true, sourcemap: false });
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
    const files = [outputMinFile, outputFile];
    let found = false;
    for (const file of files) {
        if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf-8');
            const clean = content.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\n\n/, '');
            fs.writeFileSync(file, header + clean);
            console.log(`✅ Header added to: ${file}`);
            found = true;
        }
    }
    if (!found) console.log('⚠️  No build file found. Run "npm run build" first.');
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

    let total = 0;
    for (const file of files) {
        if (fs.existsSync(file.path)) {
            const size = fs.statSync(file.path).size;
            total += size;
            console.log(`  ${file.label}: ${(size / 1024).toFixed(2)} KB (${size} bytes)`);
            console.log(`    SHA-256 (full): ${computeFileSha(file.path)}`);
            const stubSha = computeStubSha(fs.readFileSync(file.path, 'utf-8'));
            console.log(`    SHA-256 (stub): ${stubSha}`);
        } else {
            console.log(`  ${file.label}: not found`);
        }
    }
    if (total > 0) console.log(`  Total: ${(total / 1024).toFixed(2)} KB`);
}

async function emulate(): Promise<void> {
    console.log('🚀 Emulating mod in Node.js...');
    const config = getConfig();
    console.log(`📋 Config: ${config.name} v${config.version}`);

    if (!fs.existsSync(outputMinFile)) {
        console.log('⚠️ Build file not found. Building first...');
        build({ minify: true, sourcemap: false });
    }

    try {
        const modCode = fs.readFileSync(outputMinFile, 'utf-8');
        const vm = await import('vm');
        const listeners: Map<string, Function[]> = new Map();

        const context: any = {
            console, setTimeout, clearTimeout, setInterval, clearInterval,
            window: {
                addEventListener: (e: string, h: Function) => {
                    if (!listeners.has(e)) listeners.set(e, []);
                    listeners.get(e)!.push(h);
                },
                removeEventListener: () => {},
                dispatchEvent: () => {},
                location: { hostname: 'max.ru', href: 'https://max.ru/', pathname: '/', search: '', hash: '' },
                open: () => ({ document: { write: () => {}, close: () => {} }, focus: () => {} }),
                setTimeout, clearTimeout, setInterval, clearInterval,
                requestAnimationFrame: (cb: any) => setTimeout(cb, 16),
                cancelAnimationFrame: (id: any) => clearTimeout(id),
                performance: { now: () => Date.now() },
                navigator: { userAgent: 'Node.js' },
            },
            document: {
                createElement: () => ({
                    style: {},
                    classList: { add: () => {}, remove: () => {}, contains: () => false },
                    appendChild: () => {}, remove: () => {},
                    addEventListener: () => {}, removeEventListener: () => {},
                    setAttribute: () => {}, getAttribute: () => null,
                    textContent: '', innerHTML: '',
                    querySelector: () => null, querySelectorAll: () => [], getElementById: () => null,
                }),
                querySelector: () => null,
                querySelectorAll: () => [],
                getElementById: () => null,
                body: { appendChild: () => {}, querySelector: () => null, querySelectorAll: () => [] },
                head: { appendChild: () => {}, querySelector: () => null, querySelectorAll: () => [] },
                documentElement: { dataset: {} },
                addEventListener: (e: string, h: Function) => {
                    if (!listeners.has(e)) listeners.set(e, []);
                    listeners.get(e)!.push(h);
                },
                removeEventListener: () => {},
                dispatchEvent: () => {},
                readyState: 'complete',
                visibilityState: 'visible',
                createTreeWalker: () => ({ nextNode: () => null }),
                createEvent: () => ({ initEvent: () => {} }),
                createTextNode: (t: string) => ({ textContent: t }),
            },
            localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, length: 0, key: () => null },
            sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {}, length: 0, key: () => null },
            MutationObserver: class { observe() {} disconnect() {} },
            requestAnimationFrame: (cb: any) => setTimeout(cb, 16),
            cancelAnimationFrame: (id: any) => clearTimeout(id),
            performance: { now: () => Date.now() },
            navigator: { userAgent: 'Node.js' },
            Event: class { type: string; constructor(t: string) { this.type = t; } },
            CustomEvent: class extends Event { detail: any; constructor(t: string, o?: any) { super(t); this.detail = o?.detail; } },
            alert: (m: string) => console.log('[ALERT]', m),
            confirm: (m: string) => { console.log('[CONFIRM]', m); return true; },
            prompt: (m: string) => { console.log('[PROMPT]', m); return null; },
            __BUILD_SHA__: 'dev',
        };

        const script = new vm.Script(`
            (function() {
                ${modCode}
                return typeof window !== 'undefined' && window.kmod ? window.kmod : null;
            })()
        `);

        const kmod = script.runInNewContext(context);
        if (kmod) {
            console.log('✅ Mod loaded successfully!');
            console.log('📦 Available API:', Object.keys(kmod).join(', '));
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
  build   - Build the mod (minified, no sourcemap)
  watch   - Watch for changes and rebuild (dev mode)
  clean   - Clean build directory
  header  - Add Tampermonkey header to existing build
  full    - Clean + Build (production)
  dev     - Build without minification (debug)
  stats   - Show build statistics (incl. SHA-256)
  emulate - Emulate the mod in Node.js
  help    - Show this help
`);
}

const args = process.argv.slice(2);
const command = args[0] || 'build';

switch (command) {
    case 'build':  build({ minify: true, sourcemap: false }); break;
    case 'watch':  watch(); break;
    case 'clean':  clean(); break;
    case 'header': headerOnly(); break;
    case 'full':   fullBuild(); break;
    case 'dev':    devBuild(); break;
    case 'stats':  stats(); break;
    case 'emulate': emulate(); break;
    case 'help':
    case '--help':
    case '-h':     help(); break;
    default:
        console.log(`❌ Unknown command: ${command}`);
        help();
        break;
}