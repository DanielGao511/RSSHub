import dayjs from 'dayjs';
import type { Route } from '@/types';
import { parseDate } from '@/utils/parse-date';

import { buildAreaUrl, parseAreaList, playwrightGet } from './utils';

const parseAreaPubDate = (value: string) => {
    const text = value.trim();
    if (!text) {
        return undefined;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return parseDate(text, 'YYYY-MM-DD');
    }

    const minuteMatch = text.match(/^(\d+)分钟前$/);
    if (minuteMatch) {
        return dayjs().subtract(Number(minuteMatch[1]), 'minute').toDate();
    }

    const hourMatch = text.match(/^(\d+)小时前$/);
    if (hourMatch) {
        return dayjs().subtract(Number(hourMatch[1]), 'hour').toDate();
    }

    const dayMatch = text.match(/^(\d+)天前$/);
    if (dayMatch) {
        return dayjs().subtract(Number(dayMatch[1]), 'day').toDate();
    }

    return undefined;
};

export const route: Route = {
    path: '/area/:areaPath',
    categories: ['government'],
    example: '/gongkaoleida/area/2129-2156-0-2,3-124',
    parameters: {
        areaPath: '完整 area 路径，例如 `2129-2156-0-2,3-124`',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: true,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['www.gongkaoleida.com/area/:areaPath'],
            target: '/area/:areaPath',
        },
    ],
    name: '地区公告列表',
    maintainers: ['nczitzk'],
    handler,
    url: 'https://www.gongkaoleida.com/',
    description: '按地区 area 页面输出公告标题和详情链接。示例：深圳 `2129-2156-0-2,3-124`，广州 `2129-2130-0-2,3-124`。',
};

async function handler(ctx) {
    const areaPath = ctx.req.param('areaPath');
    const link = buildAreaUrl(areaPath);

    const html = await playwrightGet(link);
    const { title, description, items } = parseAreaList(html);

    return {
        title,
        description,
        link,
        item: items.map((entry) => ({
            title: entry.title,
            link: entry.link,
            description: `<p><a href="${entry.link}">查看详情</a></p>`,
            pubDate: parseAreaPubDate(entry.pubDateText),
        })),
    };
}
