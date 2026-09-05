import { load } from 'cheerio';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchDomainInfoUrl, parseThreadList } from './index';

const ofetchMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/ofetch', () => ({
    default: ofetchMock,
}));

describe('2048 domain info URL', () => {
    beforeEach(() => {
        ofetchMock.mockReset();
    });

    it('uses the URL published by 2048.info', async () => {
        ofetchMock.mockResolvedValue('<button class="button" onclick="window.open(\'https://example.com/forum/\')"></button>');

        await expect(fetchDomainInfoUrl()).resolves.toBe('https://example.com/forum/');
        expect(ofetchMock).toHaveBeenCalledWith('https://2048.info');
    });

    it.each([
        ['a network error', new Error('network error')],
        ['an unparseable response', '<button class="button"></button>'],
        ['an empty URL', '<button class="button" onclick="window.open(\'\')"></button>'],
        ['an invalid URL', '<button class="button" onclick="window.open(\'http://[\')"></button>'],
        ['a non-HTTP URL', '<button class="button" onclick="window.open(\'javascript:alert(1)\')"></button>'],
    ])('falls back to hjd2048.com for %s', async (_, response) => {
        if (response instanceof Error) {
            ofetchMock.mockRejectedValue(response);
        } else {
            ofetchMock.mockResolvedValue(response);
        }

        await expect(fetchDomainInfoUrl()).resolves.toBe('https://hjd2048.com');
    });
});

describe('2048 thread list', () => {
    it('extracts rows following the last section header', () => {
        const $ = load(`
            <table id="ajaxtable"><tbody>
                <tr class="tr3"><td><a class="subject" href="read.php?tid=ignored">Ignored</a></td></tr>
                <tr class="tr2"></tr>
                <tr class="tr3"><td><a class="subject" href="read.php?tid=123">Thread</a></td></tr>
            </tbody></table>
        `);

        expect(parseThreadList($, 'https://example.com', 'https://example.com/thread.php')).toEqual([
            {
                title: 'Thread',
                link: 'https://example.com/read.php?tid=123',
                guid: 'https://hjd2048.com/2048/read.php?tid=123',
            },
        ]);
    });

    it('falls back to all thread rows and skips links without href', () => {
        const $ = load(`
            <table><tbody>
                <tr class="tr3"><td><a class="subject">Missing href</a></td></tr>
                <tr class="tr3"><td><a href="/read.php?tid=456">Fallback thread</a></td></tr>
            </tbody></table>
        `);

        expect(parseThreadList($, 'https://example.com', 'https://example.com/thread.php')).toEqual([
            {
                title: 'Fallback thread',
                link: 'https://example.com/read.php?tid=456',
                guid: 'https://hjd2048.com/2048//read.php?tid=456',
            },
        ]);
    });

    it('throws a diagnostic error when no threads can be parsed', () => {
        const $ = load('<html><title>Interstitial</title></html>');

        expect(() => parseThreadList($, 'https://example.com', 'https://example.com/interstitial')).toThrow('2048 route parsed 0 items from https://example.com/interstitial');
    });
});
