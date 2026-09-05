import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Data } from '@/types';

import { route } from './index';

const { ofetchMock, ofetchRawMock } = vi.hoisted(() => ({
    ofetchMock: vi.fn(),
    ofetchRawMock: vi.fn(),
}));

vi.mock('@/utils/cache', () => ({
    default: {
        tryGet: vi.fn((_key, getter) => getter()),
    },
}));

vi.mock('@/utils/ofetch', () => {
    const fn = (...args: unknown[]) => ofetchMock(...args);
    fn.raw = (...args: unknown[]) => ofetchRawMock(...args);
    return {
        default: fn,
    };
});

const ctx = {
    req: {
        param: (name: string) => (name === 'id' ? '3' : undefined),
        query: () => '',
    },
} as unknown as Parameters<typeof route.handler>[0];

const listHtml = `
<div id="main"><div id="breadCrumb"><a>首页</a><a>最新合集</a></div></div>
<table id="ajaxtable">
    <tbody>
        <tr class="tr2"><th>Header</th></tr>
        <tr class="tr3">
            <td>
                <a class="subject" href="read.php?tid=123456">List Entry Title Anchor</a>
            </td>
        </tr>
    </tbody>
</table>
`;

const detailHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Browser Title from Detail Page - 2048核基地</title>
</head>
<body>
    <span class="fl black">TestAuthor</span>
    <span class="fl gray" title="2026-09-05 12:00:00">2026-09-05</span>
    <div id="read_tpc">
        <p>Post content with magnet link</p>
        <div class="magnet-text">magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567</div>
    </div>
</body>
</html>
`;

afterEach(() => {
    vi.clearAllMocks();
});

describe('2048 route', () => {
    it('uses browser title from detail page for feed item title', async () => {
        // 1. redirect response from domainInfo.url
        ofetchRawMock.mockResolvedValueOnce({
            url: 'https://bbs.vsbskpo.com/index.php',
        });
        // 2. captcha page to get safeid
        ofetchMock.mockResolvedValueOnce("<script>var safeid = 'test-safeid';</script>");
        // 3. thread list raw response
        ofetchRawMock.mockResolvedValueOnce({
            url: 'https://bbs.vsbskpo.com/thread.php?fid=3',
            _data: listHtml,
        });
        // 4. detail page response
        ofetchMock.mockResolvedValueOnce(detailHtml);

        const result = (await route.handler(ctx)) as Data;

        expect(result.title).toBe('最新合集 - 2048核基地');
        expect(result.item).toHaveLength(1);
        expect(result.item![0].title).toBe('Browser Title from Detail Page - 2048核基地');
        expect(result.item![0].author).toBe('TestAuthor');
        expect(result.item![0].link).toBe('https://bbs.vsbskpo.com/read.php?tid=123456');
        expect(result.item![0].guid).toBe('https://bbs.vsbskpo.com/2048/read.php?tid=123456');
        expect(result.item![0].enclosure_url).toBe('magnet:?xt=urn:btih:0123456789abcdef0123456789abcdef01234567');
        expect(result.item![0].enclosure_type).toBe('x-scheme-handler/magnet');
    });

    it('falls back to list entry title if detail page title is not found', async () => {
        const detailHtmlWithoutTitle = `
        <body>
            <span class="fl black">TestAuthor2</span>
            <span class="fl gray" title="2026-09-05 12:00:00">2026-09-05</span>
            <div id="read_tpc">No magnet content</div>
        </body>
        `;

        ofetchRawMock.mockResolvedValueOnce({
            url: 'https://bbs.vsbskpo.com/index.php',
        });
        ofetchMock.mockResolvedValueOnce("<script>var safeid = 'test-safeid';</script>");
        ofetchRawMock.mockResolvedValueOnce({
            url: 'https://bbs.vsbskpo.com/thread.php?fid=3',
            _data: listHtml,
        });
        ofetchMock.mockResolvedValueOnce(detailHtmlWithoutTitle);

        const result = (await route.handler(ctx)) as Data;

        expect(result.item![0].title).toBe('List Entry Title Anchor');
    });
});
