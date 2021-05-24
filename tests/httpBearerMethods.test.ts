import {HttpGet_BEARER} from "../src";

test('bearer-get', async () => {
    let response = await HttpGet_BEARER("https://httpbin.org/get","token")
    expect(response).toBeDefined();
    let json = JSON.parse(response);
    expect(json).toBeDefined();
    expect(json.headers.Authorization).toBe("Bearer token");
})