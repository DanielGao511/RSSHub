import { load } from 'cheerio';

import cache from '@/utils/cache';
import { getPuppeteerPage } from '@/utils/puppeteer';

const rootUrl = 'https://www.gongkaoleida.com';

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
            await page.waitForSelector('.notice-list .link-list > li', { timeout: 15000 });
            const html = await page.evaluate(() => document.documentElement.innerHTML);
            return html;
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

