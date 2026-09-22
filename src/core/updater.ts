/*
* @author: potemk.in
* @brief: Self-update checker — compares local CONFIG.version against the remote userscript's @version.
* @desc: No hashing. Just parse @version from the raw GitHub file and compare with the local build version.
*/

import { CONFIG } from '../config';
import { logger } from './logger';

const UPDATE_URL =
    'https://raw.githubusercontent.com/kiwinatra/kmax-builds/main/mod.min.user.js';

/**
 * true  — есть обновление
 * false — версия совпадает
 * null  — не удалось проверить (сеть/CORS/не нашли @version)
 */
export async function checkForUpdate(): Promise<boolean | null> {
    try {
        const res = await fetch(UPDATE_URL, { cache: 'no-store' });
        if (!res.ok) {
            logger.warn(`Update check failed: HTTP ${res.status}`);
            return null;
        }

        const remoteText = await res.text();
        const match = remoteText.match(/@version\s+([\d.]+)/);
        if (!match) {
            logger.warn('Could not parse @version from remote script');
            return null;
        }

        const remoteVersion = match[1];
        logger.debug(`🔍 Local: ${CONFIG.version}, Remote: ${remoteVersion}`);

        return remoteVersion !== CONFIG.version;
    } catch (error) {
        logger.error('Update check error:', error);
        return null;
    }
}