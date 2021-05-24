import {accountsStorage, crackedAccount, CrackedAuth, mojangAccount} from "../src";
import {mocked} from "ts-jest/utils";
import {HttpCustom, HttpGet, HttpPost} from "http-client-methods";

let mXHR_POST = mocked(HttpPost)
let mXHR_GET = mocked(HttpGet)
let mXHR_CUSTOM = mocked(HttpCustom)

let username = "username";
let password = "password"
let accessToken = CrackedAuth.uuid("accessToken") //In real situation it's not an uuid. It's there to check equality of tokens in requests.
jest.mock("http-client-methods");

test("cracked-auth", async () => {
    let account = new crackedAccount(username);
    expect(account.uuid).toBeDefined()
    expect(account.username).toBe(username)
    expect(account.accessToken).toBeUndefined()
    expect(await account.getProfile()).toBeUndefined();
    expect(account.ownership).toBeFalsy()
    expect(await account.canChangeName()).toBeFalsy()
})

test("accountsStorage-addAccount", async () => {
    let store = new accountsStorage();
    let acc1 = new mojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new crackedAccount(username);
    let acc3 = new crackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(3);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc2);
    expect(store.accountList[2]).toStrictEqual(acc3);
})

test("accountsStorage-removeAccount", async () => {
    let store = new accountsStorage();
    let acc1 = new mojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new crackedAccount(username);
    let acc3 = new crackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    store.deleteAccount(acc2);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(2);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc3);
})

test("accountsStorage-getByUUID", async () => {
    let store = new accountsStorage();
    let acc1 = new mojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new crackedAccount(username);
    let acc3 = new crackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    let acc4 = store.getAccountByUUID(acc2.uuid);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(3);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc2);
    expect(store.accountList[2]).toStrictEqual(acc3);
    expect(acc4).toStrictEqual(acc2);
})

test("accountsStorage-getByName", async () => {
    let store = new accountsStorage();
    let acc1 = new mojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new crackedAccount(username);
    let acc3 = new crackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    let acc4 = store.getAccountByName(acc2.username);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(3);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc2);
    expect(store.accountList[2]).toStrictEqual(acc3);
    expect(acc4).toStrictEqual(acc2);
})

test("accountsStorage-getById", async () => {
    let store = new accountsStorage();
    let acc1 = new mojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new crackedAccount(username);
    let acc3 = new crackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    let acc4 = store.getAccount(1);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(3);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc2);
    expect(store.accountList[2]).toStrictEqual(acc3);
    expect(acc4).toStrictEqual(acc2);
})

test("accountsStorage-serialization", async () => {
    let store = new accountsStorage();
    let acc1 = new mojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new crackedAccount(username);
    let acc3 = new crackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    let string = store.serialize();
    let store2 = accountsStorage.deserialize(string);
    expect(store.accountList).toStrictEqual(store2.accountList);
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
            "clientToken": CrackedAuth.uuid("clientToken"),
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

    await account.Login(username, password, true);
    expect(account.login_password).toBe(password);
    expect(account.login_username).toBe(username);


})

test("account-getProfile", async () => {
    mocked(HttpCustom).mockImplementation(async (method: string, url: string, body, headers?: {}) => {
        expect(method).toBe("get");
        expect(url).toBe("https://api.minecraftservices.com/minecraft/profile");
        expect(headers["Authorization"]).toBe("Bearer " + accessToken);
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

test("account-checkValidToken", async () => {
    mXHR_POST.mockImplementation(async (url: string, body, headers?: {}) => {
        expect(url).toBe("https://authserver.mojang.com/validate");
        expect(headers["Content-Type"]).toBe("application/json");
        let jsonBody;
        if (typeof body === "string") {
            jsonBody = JSON.parse(body);
        } else {
            jsonBody = body;
        }
        expect(jsonBody["accessToken"]).toBe(accessToken);
        return "";
    })

    let account = new mojangAccount();
    account.accessToken = accessToken;
    expect(await account.checkValidToken()).toBeTruthy();
})

