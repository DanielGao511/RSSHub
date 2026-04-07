import { load } from 'cheerio';

import cache from '@/utils/cache';
import { getPuppeteerPage } from '@/utils/puppeteer';

const rootUrl = 'https://www.gongkaoleida.com';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getListCount = (html: string) => load(html)('.notice-list .link-list > li').length;

const puppeteerGet = (url: string) =>
    cache.tryGet(url, async () => {
        const { page, destroy } = await getPuppeteerPage(url, {
            gotoConfig: {
                waitUntil: 'domcontentloaded',
            },
            onBeforeLoad: async (page) => {
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                    const type = request.resourceType();
                    if (type === 'document' || type === 'script' || type === 'xhr' || type === 'fetch' || type === 'stylesheet') {
                        request.continue();
                    } else {
                        request.abort();
                    }
                });
            },
        });

        try {
            // The page sometimes renders the area list late in containerized Chromium.
            for (let attempt = 0; attempt < 8; attempt++) {
                const html = await page.evaluate(() => document.documentElement.innerHTML);
                if (getListCount(html) > 0) {
                    return html;
                }
                await sleep(3000);
            }
            throw new Error('Gongkaoleida area list did not render in time');
        } finally {
            await destroy();
        }
    });

const buildAreaUrl = (path: string) => `${rootUrl}/area/${path}`;

const buildAbsoluteUrl = (path?: string) => new URL(path || '/', rootUrl).href;

const parseAreaList = (html: string) => {
    const $ = load(html);
    const areaTitle = $('title').text().trim();
    const description = $('meta[name="Description"]').attr('content') || '';
    const items = $('.notice-list .link-list > li')
        .toArray()
        .map((element) => {
            const item = $(element);
            const anchor = item.find('a').first();
            return {
                title: anchor.text().trim(),
                link: buildAbsoluteUrl(anchor.attr('href')),
                pubDateText: item.find('time').text().trim(),
            };
        })
        .filter((item) => item.title && item.link);

    return {
        title: areaTitle,
        description,
        items,
    };
};

export { buildAreaUrl, parseAreaList, puppeteerGet };