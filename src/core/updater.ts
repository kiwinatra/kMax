/*
* @author: potemk.in
* @brief: Self-update checker — compares local bundle SHA against the remote raw file.
* @desc: SHA of the current build is injected at build time via esbuild --define:__BUILD_SHA__.
*       On init we persist it to storage. On demand we fetch the raw GitHub file,
*       hash it the same way, and compare.
*/

import { storage } from './storage';
import { logger } from './logger';


const UPDATE_URL =
    'https://raw.githubusercontent.com/kiwinatra/kmax-builds/main/mod.min.user.js';

const SELF_SHA_KEY = 'selfSha';

/** SHA текущего билда. Fallback на 'dev', если билд без --define (ts-node, тесты). */
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
        const remoteSha = await sha256Hex(await res.text());
        logger.debug(`🔍 Self SHA:   ${selfSha}`);
        logger.debug(`🔍 Remote SHA: ${remoteSha}`);
        return remoteSha !== selfSha;
    } catch (error) {
        logger.error('Update check error:', error);
        return null;
    }
}