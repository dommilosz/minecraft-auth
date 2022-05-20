import {MicrosoftAuth} from "../src";
import {HttpGet} from "http-client-methods";

test("microsoft-auth-server-code-test",async () =>{
    let codeIn = "test_code_123";
    let server = await MicrosoftAuth._createServer(8080);
    let code = await new Promise(async (r, j) => {
        MicrosoftAuth._listenForCode(server).then(r);
        await HttpGet("http://localhost:8080/token?code=" + codeIn);
    })
    expect(code).toStrictEqual(codeIn);
})

test("microsoft-auth-server-close-test",async () =>{
    let server = await MicrosoftAuth._createServer(8080);
    let code = await new Promise(async (r, j) => {
        MicrosoftAuth._listenForCode(server).then(r).catch(j);
        await HttpGet("http://localhost:8080/close");
    }).catch(code=>{
        expect(code).toStrictEqual(undefined);
        return;
    })
    expect(false);
})

test("microsoft-auth-server-timeout-test",async () =>{
    let server = await MicrosoftAuth._createServer(8080);
    let code = await new Promise(async (r, j) => {
        MicrosoftAuth._listenForCode(server,100).then(r).catch(j);
    }).catch(code=>{
        expect(code).toStrictEqual(undefined);
        return;
    })
    expect(false);
})

test("microsoft-auth-server-url-test",async () =>{
    let server = await MicrosoftAuth._createServer(8080);
    MicrosoftAuth._listenForCode(server).catch(e=>{});
    let url = await HttpGet("http://localhost:8080/url");
    await server.fullClose();
    expect(url).toStrictEqual(MicrosoftAuth.createUrl());
})

test("microsoft-auth-server-redirect-test",async () =>{
    let server = await MicrosoftAuth._createServer(8080);
    MicrosoftAuth._listenForCode(server).catch(e=>{});
    let obj = await HttpGet("http://localhost:8080/auth",undefined,true);
    await server.fullClose();
    expect(obj.url).toStrictEqual(MicrosoftAuth.createUrl());
})