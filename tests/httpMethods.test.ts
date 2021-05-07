import {MojangAPI, XHR_GET_BEARER} from "../src";
import {XHR_CUSTOM, XHR_GET, XHR_POST} from "../src/httpMethods";

test('methods-get', async () => {
    let response = await XHR_GET("https://httpbin.org/get")
    expect(response).toBeDefined();
    let json = JSON.parse(response);
    expect(json).toBeDefined();
})

test('methods-post', async () => {
    let body = JSON.stringify({"foo":"bar"});
    let response = await XHR_POST("https://httpbin.org/post",(body),{"Content-Type": "application/json"})
    expect(response).toBeDefined();
    let json = JSON.parse(response);
    expect(json).toBeDefined();
    expect(json.data).toBeDefined();
    expect(json.data).toBe(body);
})

test('methods-custom-no-body', async () => {
    let response = await XHR_CUSTOM("delete","https://httpbin.org/delete")
    expect(response).toBeDefined();
    let json = JSON.parse(response);
    expect(json).toBeDefined();
})
test('methods-custom-body', async () => {
    let body = JSON.stringify({"foo":"bar"});
    let response = await XHR_CUSTOM("put","https://httpbin.org/put",body,{"Content-Type": "application/json"})
    expect(response).toBeDefined();
    let json = JSON.parse(response);
    expect(json).toBeDefined();
    expect(json.data).toBeDefined();
    expect(json.data).toBe(body);
})