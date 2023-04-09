import {HttpGet} from "http-client-methods";
import {MicrosoftAuth} from "../src/index"

test("microsoft-auth-server-code-test",async () =>{
    let codeIn = "test_code_123";
    let code = MicrosoftAuth.listenForCode();
    await HttpGet("http://localhost:8080/token?code=" + codeIn);
    expect(await code).toStrictEqual(codeIn);
})

test("microsoft-auth-server-timeout-test",async () =>{
    try{
        await MicrosoftAuth.listenForCode({timeout:100})
    }catch {
        expect(true)
    }
    expect(false)
})

test("microsoft-auth-server-url-test",async () =>{
    let code = MicrosoftAuth.listenForCode({timeout:500}).catch(_=>{});
    let url = await HttpGet("http://localhost:8080/url");
    await code;
    expect(url).toStrictEqual(MicrosoftAuth.createUrl());
})

test("microsoft-auth-server-redirect-test",async () =>{
    let code = MicrosoftAuth.listenForCode({timeout:500}).catch(_=>{});
    let obj = await HttpGet("http://localhost:8080/auth",undefined,true);
    await code;
    expect(obj.url).toStrictEqual(MicrosoftAuth.createUrl());
})

test("microsoft-auth-server-redirect-after-auth-test",async () =>{
    let codeIn = "test_code_123";
    let redirecturl = "https://httpbin.org/get?test";
    let code = MicrosoftAuth.listenForCode({redirectAfterAuth:redirecturl});
    let obj = await HttpGet("http://localhost:8080/token?code=" + codeIn, undefined, true);
    expect(await code).toStrictEqual(codeIn);
    expect(obj.url).toStrictEqual(redirecturl);
})