import axios from 'axios';
import * as nock from 'nock';

beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    nock('https://example.com')
        .get('/hello-world')
        .reply(200, "Hello");
});

describe('sum module', () => {
    test('adds 1 + 2 to equal 3', () => {
        expect(1 + 2).toBe(3);
    });
    test('hello-world endpoint', async () => {
        const { data } = await axios.get<string>('https://example.com/hello-world');
        expect(data).toBe('Hello');
    });
});
