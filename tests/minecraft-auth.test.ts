import {crackedAccount, CrackedAuth, mojangAccount, XHR_GET_BEARER} from "../src";
import {XHR_CUSTOM, XHR_GET, XHR_POST} from "../src/httpMethods";
import {mocked} from "ts-jest/utils";

let mXHR_POST = mocked(XHR_POST)
let mXHR_GET = mocked(XHR_GET)
let mXHR_CUSTOM = mocked(XHR_CUSTOM)

let username = "username";
let password = "password"
let accessToken = CrackedAuth.uuid("accessToken") //In real situation it's not an uuid. It's there to check equality of tokens in requests.
jest.mock("../src/httpMethods");

test("cracked-auth", async () => {
    let account = new crackedAccount(username);
    expect(account.uuid).toBeDefined()
    expect(account.username).toBe(username)
    expect(account.accessToken).toBeUndefined()
    expect(await account.getProfile()).toBeUndefined();
    expect(account.ownership).toBeFalsy()
    expect(await account.canChangeName()).toBeFalsy()
})

test("mojang-auth", async () => {
    let account = new mojangAccount();
    mXHR_POST.mockImplementation(async (url: string, body: string, headers?: {}) => {
        expect(url).toBe("https://authserver.mojang.com/authenticate");
        expect(headers["Content-Type"]).toBe("application/json");
        let jsonBody = JSON.parse(body);
        expect(jsonBody["agent"]).toStrictEqual({
            "name": "Minecraft",
            "version": 1
        })
        expect(jsonBody["username"]).toBe(username)
        expect(jsonBody["password"]).toBe(password)
        return JSON.stringify({
            "user": {
                "username": "user@email.example",
                "properties": [
                    {
                        "name": "preferredLanguage",
                        "value": "en-us"
                    },
                    {
                        "name": "registrationCountry",
                        "value": "US"
                    }
                ],
                "id": CrackedAuth.uuid("id1")
            },
            "clientToken": CrackedAuth.uuid("clientToken") ,
            "accessToken": accessToken,
            "availableProfiles": [
                {
                    "name": username,
                    "id": CrackedAuth.uuid(username)
                }
            ],
            "selectedProfile": {
                "name": username,
                "id": CrackedAuth.uuid(username)
            }
        })
    })

    await account.Login(username, password);
    expect(account.login_password).toBeUndefined();
    expect(account.login_username).toBeUndefined();
    expect(account.accessToken).toBe(accessToken)
    expect(account.clientToken).toBe(CrackedAuth.uuid("clientToken"))

    await account.Login(username, password,true);
    expect(account.login_password).toBe(password);
    expect(account.login_username).toBe(username);


})

test("account-getProfile",async()=>{
    mocked(XHR_CUSTOM).mockImplementation(async (method:string,url: string,body,  headers?: {}) => {
        expect(method).toBe("get");
        expect(url).toBe("https://api.minecraftservices.com/minecraft/profile");
        expect(headers["Authorization"]).toBe("Bearer "+accessToken);
        return JSON.stringify({
            "id": CrackedAuth.uuid(username),
            "name": username,
            "skins": [
                {
                    "id": CrackedAuth.uuid("skin"),
                    "state": "ACTIVE",
                    "url": "http://example.com",
                    "variant": "CLASSIC"
                }
            ],
            "capes": []
        })
    })

    let account = new mojangAccount();
    account.accessToken = accessToken;
    account.ownership = true;
    expect(account.profile).toBeUndefined();
    await account.getProfile();
    expect(account.profile).toBeDefined();
    expect(account.profile.id).toBe(CrackedAuth.uuid(username));
})

test("account-checkValidToken",async()=>{
    mXHR_POST.mockImplementation(async (url: string,body,  headers?: {}) => {
        expect(url).toBe("https://authserver.mojang.com/validate");
        expect(headers["Content-Type"]).toBe("application/json");
        let jsonBody = JSON.parse(body);
        expect(jsonBody["accessToken"]).toBe(accessToken);
        return "";
    })

    let account = new mojangAccount();
    account.accessToken = accessToken;
    expect(await account.checkValidToken()).toBeTruthy();
})

