import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchDomainInfoUrl } from './index';

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
