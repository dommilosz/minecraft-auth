import {HttpGet} from "http-client-methods";
import {MicrosoftAuth} from "../src/index"

test("Microsoft Auth: Code test", async () => {
    let codeIn = "test_code_123";
    let code = MicrosoftAuth.listenForCode();
    await HttpGet("http://localhost:8080/token?code=" + codeIn);
    expect(await code).toStrictEqual(codeIn);
})

test("Microsoft Auth: Server timeout", async () => {
    try {
        await MicrosoftAuth.listenForCode({timeout: 100})
    } catch {
        expect(true)
    }
    expect(false)
})

test("Microsoft Auth: /url endpoint", async () => {
    let code = MicrosoftAuth.listenForCode({timeout: 500}).catch(_ => {
    });
    let url = await HttpGet("http://localhost:8080/url");
    await code;
    expect(url).toStrictEqual(MicrosoftAuth.createUrl());
})

test("Microsoft Auth: Redirect test", async () => {
    let code = MicrosoftAuth.listenForCode({timeout: 500}).catch(_ => {
    });
    let obj = await HttpGet("http://localhost:8080/auth", {}, true);
    await code;
    expect(obj.url).toStrictEqual(MicrosoftAuth.createUrl());
})

test("Microsoft Auth: Redirect after authentication", async () => {
    let codeIn = "test_code_123";
    let redirecturl = "https://httpbin.org/get?test";
    let code = MicrosoftAuth.listenForCode({redirectAfterAuth: redirecturl});
    let obj = await HttpGet("http://localhost:8080/token?code=" + codeIn, {}, true);
    expect(await code).toStrictEqual(codeIn);
    expect(obj.url).toStrictEqual(redirecturl);
})

test("Microsoft Auth: Test onstart", async () => {
    let callbackExecuted = false;

    await MicrosoftAuth.listenForCode({
        host: "localhost", port: 8080,
        timeout: 500, onstart: (host, port) => {
            expect(host).toBe('localhost');
            expect(port).toBe(8080);
            callbackExecuted = true;
        }
    }).catch(_ => {
    });

    expect(callbackExecuted).toBeTruthy();
})

test("Microsoft Auth: Test onclose", async () => {
    let callbackExecuted = false;

    await MicrosoftAuth.listenForCode({
        timeout: 200, onclose: (success) => {
            expect(success).toBeFalsy()
            callbackExecuted = true;
        }
    }).catch(_ => {
    });

    await new Promise((r) => setTimeout(r, 500))

    expect(callbackExecuted).toBeTruthy();
})

test("Microsoft Auth: Test oncode ", async () => {
    let codeIn = "test_code_123";
    let callbackExecuted = false;

    let p = MicrosoftAuth.listenForCode({
        oncode: (code) => {
            expect(code).toStrictEqual(codeIn);
            callbackExecuted = true;
        }
    });
    await HttpGet("http://localhost:8080/token?code=" + codeIn);
    await p;
    await new Promise((r) => setTimeout(r, 500))
    expect(callbackExecuted).toBeTruthy();
})