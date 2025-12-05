/**
 * Threads Toolkit - Main Entry Point
 *
 * A powerful Threads.net scraper supporting multiple actions:
 * - search: Search posts by keyword
 * - profile: Fetch user profile data and recent posts
 * - hashtag: Search posts by hashtag
 * - post: Fetch single post details (with replies)
 * - batch: Run multiple inputs in one run
 */

import { Actor } from 'apify';
import { Log } from 'crawlee';

import { searchAction, profileAction, postAction, hashtagAction } from './actions/index.js';
import type { Input, SearchInput, ProfileInput, HashtagInput, PostInput, BatchInput, ActionInput } from './types.js';

const log = new Log({ prefix: 'ThreadsToolkit' });

// Validate input based on action
function validateInput(input: Input): void {
    switch (input.action) {
        case 'search':
            if (!(input as SearchInput).keyword) {
                throw new Error('keyword is required for search action');
            }
            break;
        case 'profile':
            if (!(input as ProfileInput).username) {
                throw new Error('username is required for profile action');
            }
            break;
        case 'hashtag':
            if (!(input as HashtagInput).tag) {
                throw new Error('tag is required for hashtag action');
            }
            break;
        case 'post':
            if (!(input as PostInput).postUrl) {
                throw new Error('postUrl is required for post action');
            }
            break;
        default:
            throw new Error(`Unknown action: ${(input as Input).action}`);
    }
}

async function runSingle(input: Input, log: Log): Promise<void> {
    switch (input.action) {
        case 'search':
            await searchAction(input as SearchInput, log);
            break;
        case 'profile':
            await profileAction(input as ProfileInput, log);
            break;
        case 'hashtag':
            await hashtagAction(input as HashtagInput, log);
            break;
        case 'post':
            await postAction(input as PostInput, log);
            break;
    }
}

async function runBatch(batch: BatchInput, log: Log): Promise<void> {
    const {
        keywords = [],
        usernames = [],
        tags = [],
        postUrls = [],
        maxItems,
        filter,
        proxyConfiguration,
        concurrency = 2,
    } = batch;

    const tasks: Array<{ name: string; fn: () => Promise<void> }> = [];

    for (const keyword of keywords) {
        tasks.push({
            name: `search:${keyword}`,
            fn: () => runSingle({ action: 'search', keyword, maxItems, filter, proxyConfiguration }, log),
        });
    }
    for (const username of usernames) {
        tasks.push({
            name: `profile:${username}`,
            fn: () => runSingle({ action: 'profile', username, maxItems, proxyConfiguration }, log),
        });
    }
    for (const tag of tags) {
        tasks.push({
            name: `hashtag:${tag}`,
            fn: () => runSingle({ action: 'hashtag', tag, maxItems, filter, proxyConfiguration }, log),
        });
    }
    for (const postUrl of postUrls) {
        tasks.push({
            name: `post:${postUrl}`,
            fn: () => runSingle({ action: 'post', postUrl, proxyConfiguration }, log),
        });
    }

    let active = 0;
    const queue = [...tasks];
    let success = 0;
    let fail = 0;
    const errors: { name: string; error: string }[] = [];

    async function runNext(): Promise<void> {
        if (queue.length === 0) return;
        const task = queue.shift();
        if (!task) return;
        active++;
        try {
            await task.fn();
            success++;
        } catch (err) {
            fail++;
            errors.push({ name: task.name, error: String(err) });
            log.warning('Batch task failed', { task: task.name, error: String(err) });
        } finally {
            active--;
            if (queue.length > 0) {
                await runNext();
            }
        }
    }

    const workers = [];
    for (let i = 0; i < Math.max(1, concurrency); i++) {
        workers.push(runNext());
    }
    await Promise.all(workers);

    log.info('Batch summary', { total: tasks.length, success, fail, errors });
}

// Main execution with proper error handling
try {
    // Initialize Apify Actor
    await Actor.init();

    // Get input
    const input = await Actor.getInput<ActionInput>();

    if (!input) {
        throw new Error('Input is required');
    }

    const batch = input as BatchInput;
    const isBatch =
        Array.isArray(batch.keywords) ||
        Array.isArray(batch.usernames) ||
        Array.isArray(batch.tags) ||
        Array.isArray(batch.postUrls);

    if (isBatch) {
        log.info('Starting Threads Toolkit (batch mode)');
        await runBatch(batch, log);
    } else {
        const single = input as Input;
        log.info('Starting Threads Toolkit', { action: single.action });
        validateInput(single);
        await runSingle(single, log);
    }

    log.info('Threads Toolkit completed');

    // Exit successfully
    await Actor.exit();
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Actor failed', { error: errorMessage });
    await Actor.fail(errorMessage);
}
