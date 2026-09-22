/*
* @author: potemk.in
* @brief: Self-update checker — compares local bundle SHA against the remote raw file.
* @desc: The SHA is injected at build time between two markers (__KMOD_SHA_START__/__KMOD_SHA_END__).
*        Both build.ts and this file collapse that marker region to an empty stub before hashing,
*        so the runtime hash and the build-time hash always match — regardless of the SHA value itself.
*/

import { storage } from './storage';
import { logger } from './logger';
import type { StorageKey } from '../types';

const UPDATE_URL =
    'https://raw.githubusercontent.com/kiwinatra/kmax-builds/main/mod.min.user.js';

const SELF_SHA_KEY: StorageKey = 'selfSha';

// Must match the markers used in build.ts exactly.
const SHA_START = '__KMOD_SHA_START__';
const SHA_END = '__KMOD_SHA_END__';
const SHA_STUB = `${SHA_START}${SHA_END}`;
const SHA_REGEX = new RegExp(`${SHA_START}[^"]*${SHA_END}`, 'g');

/** Встроенный SHA из бандла. Fallback на 'dev', если билд без --define. */
const SELF_SHA: string =
    typeof __BUILD_SHA__ !== 'undefined' ? __BUILD_SHA__ : 'dev';

/** Сохранить SHA текущего билда в storage. Вызывать один раз при инициализации. */
export function saveSelfSha(): void {
    try {
        const existing = storage.get<string>(SELF_SHA_KEY);
        if (existing === SELF_SHA) return;
        storage.set(SELF_SHA_KEY, SELF_SHA);
        logger.debug(`🔑 Self SHA saved: ${SELF_SHA}`);
    } catch (error) {
        logger.error('Failed to save self SHA:', error);
    }
}

/** SHA-256 строки → hex. */
async function sha256Hex(text: string): Promise<string> {
    const buf = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/** Заменить маркерный регион на пустой стаб — так же, как в build.ts. */
function collapseStub(text: string): string {
    return text.replace(SHA_REGEX, SHA_STUB);
}

/**
 * true  — есть обновление
 * false — версия совпадает
 * null  — не удалось проверить (сеть/CORS/нет selfSha)
 */
export async function checkForUpdate(): Promise<boolean | null> {
    const selfSha = storage.get<string>(SELF_SHA_KEY);
    if (!selfSha) {
        logger.warn('Self SHA not found in storage');
        return null;
    }

    try {
        const res = await fetch(UPDATE_URL, { cache: 'no-store' });
        if (!res.ok) {
            logger.warn(`Update check failed: HTTP ${res.status}`);
            return null;
        }

        const remoteText = await res.text();
        const remoteStub = collapseStub(remoteText);
        const remoteSha = await sha256Hex(remoteStub);

        logger.debug(`🔍 Self SHA:   ${selfSha}`);
        logger.debug(`🔍 Remote SHA: ${remoteSha}`);

        return remoteSha !== selfSha;
    } catch (error) {
        logger.error('Update check error:', error);
        return null;
    }
}