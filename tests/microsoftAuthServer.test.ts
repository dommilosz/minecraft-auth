import {HttpGet} from "http-client-methods";
import {MicrosoftAuth} from "../src/index"

const redirectUrl = "https://httpbin.org/get?test";
const timeout = 1000
const onClose = jest.fn()
const onStart = jest.fn()
const onCode = jest.fn()

let abortController: AbortController
let listenForCodePromise: Promise<string>
let closePromise: Promise<void>

beforeEach(function() {
    abortController = new AbortController()
    closePromise = new Promise<void>(function(resolve) {
        onClose.mockImplementationOnce(resolve)
    })
    listenForCodePromise = MicrosoftAuth.listenForCode({
        abort: abortController.signal,
        redirectAfterAuth: redirectUrl,
        timeout: timeout,
        onclose: onClose,
        onstart: onStart,
        oncode: onCode,
    })
})

afterEach(async function() {
    listenForCodePromise.catch(() => {})

    abortController.abort()

    await closePromise
})

test("Microsoft Auth: Code test", async () => {
    const codeIn = "test_code_123"

    await HttpGet(`http://localhost:8080/token?code=${codeIn}`)

    await expect(listenForCodePromise).resolves.toBe(codeIn)
})

test("Microsoft Auth: Server timeout", async () => {
    await expect(listenForCodePromise).rejects.toBe("Timeout error")
})

test("Microsoft Auth: /url endpoint", async () => {
    const url = await HttpGet("http://localhost:8080/url")

    expect(url).toBe(MicrosoftAuth.createUrl())
})

test("Microsoft Auth: /close endpoint", async () => {
    const matcher = expect(listenForCodePromise).rejects.toBe("Closed")

    await HttpGet("http://localhost:8080/close")
    await matcher

    expect(onCode).toBeCalledTimes(0)

    expect(onClose).toBeCalledTimes(1)
    expect(onClose).toBeCalledWith(false)
})

test("Microsoft Auth: /close endpoint with a keep-alive connection", async () => {
    const matcher = expect(listenForCodePromise).rejects.toBe("Closed")

    await HttpGet("http://localhost:8080/close", {
        "Connection": "keep-alive"
    })

    await matcher

    expect(onCode).toBeCalledTimes(0)

    expect(onClose).toBeCalledTimes(1)
    expect(onClose).toBeCalledWith(false)
})

test("Microsoft Auth: Redirect test", async () => {
    const res = await HttpGet("http://localhost:8080/auth", {}, true)

    expect(res.url).toBe(MicrosoftAuth.createUrl())
})

test("Microsoft Auth: Redirect test - unknown url", async () => {
    const res = await HttpGet(`http://localhost:8080/asdsada${Math.floor(Math.random()*10000)}`, {}, true)

    expect(res.url).toBe(MicrosoftAuth.createUrl())
})

test("Microsoft Auth: Redirect after authentication", async () => {
    const codeIn = "test_code_123"
    const res = await HttpGet(`http://localhost:8080/token?code=${codeIn}`, {}, true)

    expect(res.url).toBe(redirectUrl)
})

test("Microsoft Auth: Test onstart", async () => {
    await expect(listenForCodePromise).rejects.toBe("Timeout error")

    expect(onStart).toBeCalledTimes(1)
    expect(onStart).toBeCalledWith("localhost", 8080)
})

test("Microsoft Auth: Test onclose", async () => {
    await expect(listenForCodePromise).rejects.toBe("Timeout error")

    expect(onClose).toBeCalledTimes(1)
    expect(onClose).toBeCalledWith(false)
})

test("Microsoft Auth: Test oncode", async () => {
    const codeIn = "test_code_123"

    await HttpGet(`http://localhost:8080/token?code=${codeIn}`)

    await expect(listenForCodePromise).resolves.toBe(codeIn)

    expect(onCode).toBeCalledTimes(1)
    expect(onCode).toBeCalledWith(codeIn)
})

test("Microsoft Auth: Test onstart on error condition", async () => {
    const secondOnStart = jest.fn()

    await expect(MicrosoftAuth.listenForCode({
        onstart: secondOnStart
    })).rejects.toThrowError(/listen EADDRINUSE: address already in use (127.0.0.1|::1):8080/)

    expect(onStart).toBeCalledTimes(1)
    expect(onStart).toBeCalledWith("localhost", 8080)

    expect(secondOnStart).not.toBeCalled()
})

test("Microsoft Auth: Can be aborted", async () => {
    abortController.abort()

    await expect(listenForCodePromise).rejects.toBe("Aborted")
})
