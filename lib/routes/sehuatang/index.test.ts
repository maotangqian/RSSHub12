import { afterEach, describe, expect, it, vi } from 'vitest';

import { route } from './index';

const { ofetchMock } = vi.hoisted(() => ({
    ofetchMock: vi.fn(),
}));

vi.mock('@/utils/cache', () => ({
    default: {
        tryGet: vi.fn((_key, getter) => getter()),
    },
}));

vi.mock('@/utils/ofetch', () => ({
    default: ofetchMock,
}));

const forumHtml = '<div id="pt"><div><a>Forum</a></div></div><table id="threadlisttableid"></table>';
const ctx = {
    req: {
        param: (name: string) => (name === 'subforumid' ? '36' : '368'),
        query: () => '',
    },
} as unknown as Parameters<typeof route.handler>[0];

afterEach(() => {
    vi.clearAllMocks();
});

describe('sehuatang route', () => {
    it('continues without a safeid cookie when the homepage request fails', async () => {
        ofetchMock.mockRejectedValueOnce(new Error('403 Forbidden')).mockResolvedValueOnce(forumHtml);

        await route.handler(ctx);

        expect(ofetchMock).toHaveBeenCalledTimes(2);
        expect(ofetchMock.mock.calls[0][1].headers).toMatchObject({
            accept: expect.any(String),
            'accept-language': expect.any(String),
            referer: 'https://www.sehuatang.net/',
            'user-agent': expect.any(String),
        });
        expect(ofetchMock.mock.calls[1][1].headers).not.toHaveProperty('cookie');
    });

    it('sends the safeid cookie when the homepage provides one', async () => {
        ofetchMock.mockResolvedValueOnce("<script>var safeid = 'safe-value';</script>").mockResolvedValueOnce(forumHtml);

        await route.handler(ctx);

        expect(ofetchMock).toHaveBeenCalledTimes(2);
        expect(ofetchMock.mock.calls[1][1].headers).toMatchObject({
            cookie: '_safe=safe-value;',
            referer: 'https://www.sehuatang.net/',
        });
    });
});
