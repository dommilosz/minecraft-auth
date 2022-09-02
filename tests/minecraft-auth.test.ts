import {AccountsStorage, CrackedAccount, CrackedAuth, MicrosoftAccount, MojangAccount} from "../src";
import {mocked} from "jest-mock";
import {HttpCustom, HttpPost} from "http-client-methods";
let mXHR_POST = mocked(HttpPost)

let username = "username";
let password = "password"
let accessToken = CrackedAuth.uuid("accessToken") //In real situation it's not an uuid. It's there to check equality of tokens in requests.
jest.mock("http-client-methods");

test("cracked-auth", async () => {
    let account = new CrackedAccount(username);
    expect(account.uuid).toBeDefined()
    expect(account.username).toBe(username)
    expect(account.accessToken).toBeUndefined()
    expect(await account.getProfile()).toBeUndefined();
    expect(account.ownership).toBeFalsy()
    expect(await account.canChangeName()).toBeFalsy()
})

test("AccountsStorage-addAccount", async () => {
    let store = new AccountsStorage();
    let acc1 = new MojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new CrackedAccount(username);
    let acc3 = new CrackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(3);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc2);
    expect(store.accountList[2]).toStrictEqual(acc3);
})

test("AccountsStorage-removeAccount", async () => {
    let store = new AccountsStorage();
    let acc1 = new MojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new CrackedAccount(username);
    let acc3 = new CrackedAccount("username2");
    store.addAccount(acc1);
    store.addAccount(acc2);
    store.addAccount(acc3);

    store.deleteAccount(acc2);

    expect(store.accountList).toBeDefined();
    expect(store.accountList).toHaveLength(2);
    expect(store.accountList[0]).toStrictEqual(acc1);
    expect(store.accountList[1]).toStrictEqual(acc3);
})

test("AccountsStorage-getByUUID", async () => {
    let store = new AccountsStorage();
    let acc1 = new MojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new CrackedAccount(username);
    let acc3 = new CrackedAccount("username2");
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

test("AccountsStorage-getByName", async () => {
    let store = new AccountsStorage();
    let acc1 = new MojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new CrackedAccount(username);
    let acc3 = new CrackedAccount("username2");
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

test("AccountsStorage-getById", async () => {
    let store = new AccountsStorage();
    let acc1 = new MojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new CrackedAccount(username);
    let acc3 = new CrackedAccount("username2");
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

test("AccountsStorage-serialization", async () => {
    let expectedStore = new AccountsStorage();
    let acc1 = new MojangAccount();
    acc1.accessToken = accessToken;
    let acc2 = new CrackedAccount(username);
    let acc3 = new CrackedAccount("username2");
    let acc4 = new MicrosoftAccount();
    expectedStore.addAccount(acc1);
    expectedStore.addAccount(acc2);
    expectedStore.addAccount(acc3);
    expectedStore.addAccount(acc4);

    let string = expectedStore.serialize();
    let deserializedStore = AccountsStorage.deserialize(string);
    expect(deserializedStore.accountList).toEqual(expectedStore.accountList);
    expect(deserializedStore.accountList[0]).toBeInstanceOf(MojangAccount);
    expect(deserializedStore.accountList[1]).toBeInstanceOf(CrackedAccount);
    expect(deserializedStore.accountList[2]).toBeInstanceOf(CrackedAccount);
    expect(deserializedStore.accountList[3]).toBeInstanceOf(MicrosoftAccount);
})

test("mojang-auth", async () => {
    let account = new MojangAccount();
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

    let account = new MojangAccount();
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

    let account = new MojangAccount();
    account.accessToken = accessToken;
    expect(await account.checkValidToken()).toBeTruthy();
})