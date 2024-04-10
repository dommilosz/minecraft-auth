import {HttpGet} from "http-client-methods";
import {MicrosoftAuth} from "../src/index"

const host = "127.0.0.1"
const port = 8080
const redirectUrl = "https://httpbin.org/get?test";
const timeout = 1000
const onClose = jest.fn()
const onStart = jest.fn()
const onCode = jest.fn()

const baseUrl = `http://${host}:${port}`

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
        host: host,
        port: port,
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

    await HttpGet(`${baseUrl}/token?code=${codeIn}`)

    await expect(listenForCodePromise).resolves.toBe(codeIn)
})

test("Microsoft Auth: Server timeout", async () => {
    await expect(listenForCodePromise).rejects.toBe("Timeout error")
})

test("Microsoft Auth: /url endpoint", async () => {
    const url = await HttpGet(`${baseUrl}/url`)

    expect(url).toBe(MicrosoftAuth.createUrl())
})

test("Microsoft Auth: /close endpoint", async () => {
    const matcher = expect(listenForCodePromise).rejects.toBe("Closed")

    await HttpGet(`${baseUrl}/close`)
    await matcher

    expect(onCode).toBeCalledTimes(0)

    expect(onClose).toBeCalledTimes(1)
    expect(onClose).toBeCalledWith(false)
})

test("Microsoft Auth: /close endpoint with a keep-alive connection", async () => {
    const matcher = expect(listenForCodePromise).rejects.toBe("Closed")

    await HttpGet(`${baseUrl}/close`, {
        "Connection": "keep-alive"
    })

    await matcher

    expect(onCode).toBeCalledTimes(0)

    expect(onClose).toBeCalledTimes(1)
    expect(onClose).toBeCalledWith(false)
})

test("Microsoft Auth: Redirect after authentication", async () => {
    const codeIn = "test_code_123"
    const res = await HttpGet(`${baseUrl}/token?code=${codeIn}`, {}, true)

    expect(res.url).toBe(redirectUrl)
})

test("Microsoft Auth: Test onstart", async () => {
    await expect(listenForCodePromise).rejects.toBe("Timeout error")

    expect(onStart).toBeCalledTimes(1)
    expect(onStart).toBeCalledWith(host, port)
})

test("Microsoft Auth: Test onclose", async () => {
    await expect(listenForCodePromise).rejects.toBe("Timeout error")

    expect(onClose).toBeCalledTimes(1)
    expect(onClose).toBeCalledWith(false)
})

test("Microsoft Auth: Test oncode", async () => {
    const codeIn = "test_code_123"

    await HttpGet(`${baseUrl}/token?code=${codeIn}`)

    await expect(listenForCodePromise).resolves.toBe(codeIn)

    expect(onCode).toBeCalledTimes(1)
    expect(onCode).toBeCalledWith(codeIn)
})

test("Microsoft Auth: Test onstart on error condition", async () => {
    const secondOnStart = jest.fn()

    await expect(MicrosoftAuth.listenForCode({
        host: host,
        port: port,
        onstart: secondOnStart
    })).rejects.toThrowError(`listen EADDRINUSE: address already in use ${host}:${port}`)

    expect(onStart).toBeCalledTimes(1)
    expect(onStart).toBeCalledWith(host, port)

    expect(secondOnStart).not.toBeCalled()
})

test("Microsoft Auth: Can be aborted", async () => {
    abortController.abort()

    await expect(listenForCodePromise).rejects.toBe("Aborted")
})
