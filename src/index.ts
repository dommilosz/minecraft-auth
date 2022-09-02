import crypto from "crypto";
import atob from "atob";
import {HttpCustom, HttpGet, HttpPost} from "http-client-methods";
import * as http from "http";

export type ListeningHttpServer = http.Server & {fullClose:any};
export type AccountType = "mojang"|"cracked"|"microsoft"|"token"

export module MicrosoftAuth {
    export let appID;
    export let appSecret;
    export let redirectURL;
    export let scope = "XboxLive.signin offline_access";
    let compiledID;
    let compiledScope;
    let compiledUrl;
    let compiledSecret;

    export function setup(_appID, _appSecret, _redirectURL) {
        appID = _appID
        appSecret = _appSecret
        redirectURL = _redirectURL
        compiledID = encodeURIComponent(appID);
        compiledScope = encodeURIComponent(scope);
        compiledUrl = encodeURIComponent(redirectURL);
        compiledSecret = encodeURIComponent(appSecret);
    }

    export async function _createServer(port: number):Promise<ListeningHttpServer> {
        const http = require("http");
        const host = 'localhost';
        const server = http.createServer();
        await server.listen(port, host, () => {
            console.log(`MS Token Server is running on http://${host}:${port}`);
        });
        server.fullClose = async function(){
            await server.close();
        }
        return server;
    }

    export async function _listenForCode(server:ListeningHttpServer, timeout:number = 60*1000):Promise<string>{
        return await new Promise<string>((r, j) => {
            server.fullClose = async function (){
                await server.close();
                clearTimeout(_timeout);
            }
            let _timeout = setTimeout(async () => {
                await server.fullClose();
                j(undefined);
            }, timeout)
            const requestListener = async function (req, res) {
                switch (req.url.split("?")[0]) {
                    case "/token":
                        await res.writeHead(200);
                        await res.end();
                        await server.fullClose();
                        if(req.url.includes("?code"))
                        r(req.url.split("?code=")[1]);
                        if(req.url.includes("?error")){
                            let error = req.url.split("?error=")[1].split("&")[0];
                            let error_description = decodeURIComponent(req.url.split("&error_description=")[1])
                            j(new AuthenticationError(error,error_description,""));
                        }
                        break;
                    case "/url":
                        await res.writeHead(200);
                        await res.end(createUrl());
                        break;
                    case "/close":
                        await server.fullClose();
                        j(undefined);
                        break;
                    case "/auth":
                        res.writeHead(302, {
                            'Location': createUrl()
                        });
                        res.end();
                        break;
                }
                await res.writeHead(404);
                await res.end();
            };
            server.on("request",requestListener);
        })
    }

    export async function listenForCode(port: number, timeout: number = 60 * 1000): Promise<string> {
        let server =  await _createServer(port);
        return _listenForCode(server,timeout);
    }

    export function onTokenResponse() {

    }

    export function createUrl() {
        return `https://login.live.com/oauth20_authorize.srf?client_id=${compiledID}&response_type=code&redirect_uri=${compiledUrl}&scope=${compiledScope}`
    }

    export async function getToken(authCode) {
        let url = "https://login.live.com/oauth20_token.srf";
        let body = `client_id=${compiledID}&client_secret=${compiledSecret}&code=${authCode}&grant_type=authorization_code&redirect_uri=${compiledUrl}`
        let response = await HttpPost(url, body, {"Content-Type": "application/x-www-form-urlencoded"})

        let jsonResponse: TokenResponse = JSON.parse(response);
        if (jsonResponse.error) {
            throw new AuthenticationError(jsonResponse.error, jsonResponse.error_description, jsonResponse.correlation_id);
        }

        return jsonResponse;
    }

    export async function getTokenRefresh(refreshToken) {
        let url = "https://login.live.com/oauth20_token.srf";
        let body = `client_id=${compiledID}&client_secret=${compiledSecret}&refresh_token=${refreshToken}&grant_type=refresh_token&redirect_uri=${compiledUrl}`
        let response = await HttpPost(url, body, {"Content-Type": "application/x-www-form-urlencoded"})

        let jsonResponse: TokenResponse = JSON.parse(response);
        if (jsonResponse.error) {
            throw new AuthenticationError(jsonResponse.error, jsonResponse.error_description, jsonResponse.correlation_id);
        }

        return jsonResponse;
    }

    export async function authXBL(accessToken) {
        let body = {
            "Properties": {
                "AuthMethod": "RPS",
                "SiteName": "user.auth.xboxlive.com",
                "RpsTicket": `d=${accessToken}` // your access token from step 2 here
            },
            "RelyingParty": "http://auth.xboxlive.com",
            "TokenType": "JWT"
        }
        let response = await HttpPost("https://user.auth.xboxlive.com/user/authenticate", JSON.stringify(body), {
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

        let jsonResponse: XBLResponse = JSON.parse(response);

        return jsonResponse;
    }

    export async function authXSTS(xblToken) {
        let body = {
            "Properties": {
                "SandboxId": "RETAIL",
                "UserTokens": [
                    `${xblToken}`
                ]
            },
            "RelyingParty": "rp://api.minecraftservices.com/",
            "TokenType": "JWT"
        }
        let response = await HttpPost("https://xsts.auth.xboxlive.com/xsts/authorize", JSON.stringify(body), {
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

        let jsonResponse: XSTSResponse = JSON.parse(response);

        if (jsonResponse.XErr) {
            throw new AuthenticationError(jsonResponse.XErr, jsonResponse.Message, jsonResponse.Redirect)
        }

        return jsonResponse;
    }

    export async function getMinecraftToken(xstsToken, uhs) {
        let body = {
            "identityToken": `XBL3.0 x=${uhs};${xstsToken}`
        }
        let response = await HttpPost("https://api.minecraftservices.com/authentication/login_with_xbox", JSON.stringify(body), {
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

        let jsonResponse: MCTokenResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function authFlow(authCode) {
        let tokenRes = await getToken(authCode);
        return await authFlowXBL(tokenRes.access_token, tokenRes.refresh_token)
    }

    export async function authFlowRefresh(refresh_token) {
        let tokenRes = await getTokenRefresh(refresh_token);
        return await authFlowXBL(tokenRes.access_token, tokenRes.refresh_token)
    }

    export async function authFlowXBL(token, refresh_token) {
        let xblRes = await authXBL(token);
        let xstsRes = await authXSTS(xblRes.Token);
        let mcToken = await getMinecraftToken(xstsRes.Token, xblRes.DisplayClaims.xui[0].uhs)
        return {access_token: mcToken.access_token, refresh_token: refresh_token}
    }

    export type TokenResponse = {
        "token_type": string,
        "expires_in": number,
        "scope": string,
        "access_token": string,
        "refresh_token": string,
        "user_id": string,
        "foci": string,
        error_description: string;
        error: string;
        correlation_id: string
    }
    export type MCTokenResponse = {
        "username": string,
        "roles": [],
        "access_token": string,
        "token_type": string,
        "expires_in": 86400
    }
    export type XBLResponse = {
        "IssueInstant": string,
        "NotAfter": string,
        "Token": string,
        "DisplayClaims": {
            "xui": [
                {
                    "uhs": string
                }
            ]
        }
    }

    export type XSTSResponse = {
        "IssueInstant": string,
        "NotAfter": string,
        "Token": string,
        "DisplayClaims": {
            "xui": [
                {
                    "uhs": string
                }
            ]
        },
        "Identity": string,
        "XErr": number,
        "Message": string,
        "Redirect": string
    }
}
export module MojangAuth {
    let authUrl = "https://authserver.mojang.com";

    export async function authenticate(username, password, clientToken?) {
        let url = authUrl + "/authenticate";
        let body: any = {
            "agent": {
                "name": "Minecraft",
                "version": 1
            },
            "username": `${username}`,
            "password": `${password}`,
            "requestUser": true
        }
        if (clientToken) {
            body.clientToken = clientToken;
        }
        let response = await HttpPost(url, JSON.stringify(body), {"Content-Type": "application/json"})
        let jsonResponse: MCAuthResponse = JSON.parse(response);
        if (jsonResponse.error) {
            throw new AuthenticationError(jsonResponse.error, jsonResponse.errorMessage, jsonResponse.cause)
        }
        return jsonResponse;
    }

    export async function refresh(accessToken, clientToken) {
        let url = authUrl + "/refresh";
        let body = {
            "accessToken": `${accessToken}`,
            "clientToken": `${clientToken}`,
            "requestUser": true
        }
        let response = await HttpPost(url, JSON.stringify(body), {"Content-Type": "application/json"})
        let jsonResponse: MCAuthResponse = JSON.parse(response);
        if (jsonResponse.error) {
            throw new AuthenticationError(jsonResponse.error, jsonResponse.errorMessage, jsonResponse.cause)
        }
        return jsonResponse;
    }

    export async function validateToken(token, alternativeValidation?: boolean) {
        if (!alternativeValidation) return await _validateToken(token);
        else return await _validateTokenAlternative(token);
    }

    export async function _validateToken(token) {
        let url = authUrl + "/validate";
        let body = {
            "accessToken": `${token}`,
        }
        let response = await HttpPost(url, JSON.stringify(body), {"Content-Type": "application/json"})
        if (response.length < 1) return true;
        let jsonResponse: MCErrorResponse = JSON.parse(response);
        if (jsonResponse.error) {
            return false;
        }
    }

    export async function _validateTokenAlternative(token) {
        let res = await HttpGet_BEARER("https://api.minecraftservices.com/minecraft/profile", token, {}, true);
        return res.status != 401 && res.status != 403;

    }

    export type MCAuthResponse = {
        "user": {
            "username": string, // will be account username for legacy accounts
            "properties": [
                {
                    "name": string,
                    "value": string
                },
                {
                    "name": string,
                    "value": string,
                }
            ],
            "id": string
        },
        "clientToken": string,
        "accessToken": string,
        "availableProfiles": [
            {
                "name": string,
                "id": string
            }
        ],
        "selectedProfile": {
            "name": string,
            "id": string
        },
        "error": string,
        "errorMessage": string,
        "cause": string
    }
    export type MCErrorResponse = {
        "error": string,
        "errorMessage": string,
        "cause": string
    }
}
export module CrackedAuth {
    export function uuid(username) {
        let md5Bytes = crypto.createHash('md5').update(username).digest();
        md5Bytes[6] &= 0x0f;
        md5Bytes[6] |= 0x30;
        md5Bytes[8] &= 0x3f;
        md5Bytes[8] |= 0x80;
        return md5Bytes.toString('hex');
    }
}
export module MojangAPI {
    export async function usernameToUUID(username: string) {
        let url = `https://api.mojang.com/users/profiles/minecraft/${username}`;
        let response = await HttpGet(url);
        let jsonResponse: UsernameToUUIDResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function nameHistory(uuid: string) {
        let url = `https://api.mojang.com/user/profiles/${uuid}/names`;
        let response = await HttpGet(url);
        let jsonResponse: NameHistoryResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function getProfileByUUID(uuid: string) {
        let url = `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`;
        let response = await HttpGet(url);
        let jsonResponseEncoded: ProfileResponse = JSON.parse(response);
        let decodedValue: DecodedTextures = JSON.parse(atob(jsonResponseEncoded.properties[0].value));
        // @ts-ignore
        let jsonResponse: ProfileResponseDecoded = jsonResponseEncoded;
        jsonResponse.properties[0].value = decodedValue;
        return jsonResponse;
    }

    export async function getBlockedServers() {
        let url = "https://sessionserver.mojang.com/blockedservers";
        let response: string = await HttpGet(url);
        return response.split('\n');
    }

    export async function nameChangeInfo(token) {
        let url = "https://api.minecraftservices.com/minecraft/profile/namechange";
        let response = await HttpGet_BEARER(url, token);
        let jsonResponse: NameChangeInfoResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function nameAvailability(name:string, token) {
        let url = `https://api.minecraftservices.com/minecraft/profile/name/${name}/available`;
        let response = await HttpGet_BEARER(url, token);
        let jsonResponse: NameAvailabilityResponse = JSON.parse(response);
        return jsonResponse.status == "AVAILABLE";

    }

    export async function changeSkin(url, variant: "classic" | "slim", token) {
        let body = {
            "variant": variant,
            "url": url
        }
        let Rurl = "https://api.minecraftservices.com/minecraft/profile/skins";
        let response = await HttpPost_BEARER(Rurl, JSON.stringify(body), token, {"Content-Type": "application/json"});
        if (response.length > 0) throw response;
    }

    export async function resetSkin(uuid, token) {
        let url = `https://api.mojang.com/user/profile/${uuid}/skin`;
        let response = await HttpCustom_BEARER("delete", url, token);
        if (response.length > 0) throw response;
    }

    export async function checkOwnership(token, profileResp?: MCProfileResponse) {
        if (!profileResp) {
            profileResp = await getProfile(token);
        }
        return !!profileResp.id;
    }

    export async function getProfile(token) {
        let response = await HttpGet_BEARER("https://api.minecraftservices.com/minecraft/profile", token);
        let jsonResponse: MCProfileResponse = JSON.parse(response);
        return jsonResponse;
    }

    export type MCOwnershipResponse = {
        "items": [{
            "name": string,
            "signature": string
        }, {
            "name": string,
            "signature": string
        }],
        "signature": string,
        "keyId": string
    }
    export type MCProfileResponse =
        {
            "id": string,
            "name": string,
            "skins": [{
                "id": string,
                "state": string,
                "url": string,
                "variant": string,
                "alias": string
            }],
            "capes": []
        }

    export type NameChangeInfoResponse = {
        "changedAt": string,
        "createdAt": string,
        "nameChangeAllowed": boolean
    }
    export type NameAvailabilityResponse = {
        "status": "DUPLICATE" | "AVAILABLE"
    }
    export type StatusResponse = [
        {
            "minecraft.net": StatusType
        },
        {
            "session.minecraft.net": StatusType
        },
        {
            "account.mojang.com": StatusType
        },
        {
            "authserver.mojang.com": StatusType
        },
        {
            "sessionserver.mojang.com": StatusType
        },
        {
            "api.mojang.com": StatusType
        },
        {
            "textures.minecraft.net": StatusType
        },
        {
            "mojang.com": StatusType
        }
    ]
    export type StatusType = "green" | "red" | "yellow";
    export type UsernameToUUIDResponse = {
        "name": string,
        "id": string
    }
    export type NameHistoryResponse = NameHistoryEntry[]
    export type NameHistoryEntry = {
        "name": string,
        "changedToAt": number
    }
    export type ProfileResponse = {
        "id": string,
        "name": string,
        "properties": [
            {
                "name": string,
                "value": string
            }
        ]
    }
    export type ProfileResponseDecoded = {
        "id": string,
        "name": string,
        "properties": [
            {
                "name": string,
                "value": DecodedTextures
            }
        ]
    }
    export type DecodedTextures = {
        "timestamp": number,
        "profileId": string,
        "profileName": string,
        "signatureRequired": boolean,
        "textures": {
            "SKIN": {
                "url": string
            },
            "CAPE": {
                "url": string
            }
        }
    }
}

export class AuthenticationError extends Error {
    additionalInfo: string

    constructor(_error, _message, _additionalInfo) {
        super(_message);
        this.name = _error;
        this.additionalInfo = _additionalInfo;
    }
}

export class OwnershipError extends Error {
    constructor(_error) {
        super(_error);
    }
}

export class Account {
    accessToken?: string;
    ownership: boolean;
    uuid: string;
    username: string;
    type: AccountType;
    profile: MojangAPI.MCProfileResponse;
    properties: any = {};
    alternativeValidation: boolean;

    constructor(token: string, type: AccountType) {
        this.accessToken = token;
        this.type = type;
    }

    async checkValidToken() {
        if (!this.accessToken) return false;
        return await MojangAuth.validateToken(this.accessToken, this.alternativeValidation);
    }

    async checkOwnership() {
        if (!this.accessToken) return false;
        this.ownership = await MojangAPI.checkOwnership(this.accessToken);
        return this.ownership;
    }

    async getProfile() {
        if (!this.accessToken) return undefined;
        if (!this.ownership) {
            await this.checkOwnership();
            if (!this.ownership) throw new OwnershipError("User don't have minecraft on his account!");
            return this.getProfile()
        }
        let profile = await MojangAPI.getProfile(this.accessToken);
        this.username = profile.name;
        this.uuid = profile.id;
        this.profile = profile;
        return profile;
    }

    async changeSkin(url: string, variant: "slim" | "classic") {
        if (!this.accessToken) return;
        await MojangAPI.changeSkin(url, variant, this.accessToken);
        return true;
    }

    async checkNameAvailability(name:string) {
        if (!this.accessToken) return false;
        return await MojangAPI.nameAvailability(name, this.accessToken)
    }

    async canChangeName() {
        if (!this.accessToken) return false;
        return (await MojangAPI.nameChangeInfo(this.accessToken)).nameChangeAllowed
    }
}

export class MojangAccount extends Account {
    clientToken: string;
    login_username: string;
    login_password: string;

    constructor() {
        super(undefined, "mojang");
    }

    async Login(username?: string, password?: string, saveCredentials?) {
        if (!username) username = this.login_username;
        if (!password) password = this.login_password;
        if (!username || !password) throw new AuthenticationError("Username or password not provided", "Username or password not provided", "");
        let resp = await MojangAuth.authenticate(username, password);
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
        this.login_username = undefined;
        this.login_password = undefined;

        if (saveCredentials) {
            this.login_username = username;
            this.login_password = password;
        }
        return this.accessToken;
    }

    async refresh() {
        let resp = await MojangAuth.refresh(this.accessToken, this.clientToken);
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
        return this.accessToken;
    }

    async use() {
        if (await this.checkValidToken()) {
            return this.accessToken;
        } else {
            if (this.login_username && this.login_password) {
                try {
                    await this.refresh();
                    return this.accessToken;
                } catch (e) {
                    await this.Login();
                    return this.accessToken;
                }
            } else {
                await this.refresh();
                return this.accessToken;
            }
        }
    }
}

export class MicrosoftAccount extends Account {
    refreshToken: string;
    authCode: string;

    constructor() {
        super(undefined, "microsoft");
        this.alternativeValidation = true;
    }

    async refresh() {
        let resp = await MicrosoftAuth.authFlowRefresh(this.refreshToken);
        this.refreshToken = resp.refresh_token;
        this.accessToken = resp.access_token;
        return this.accessToken;
    }

    async authFlow(authCode) {
        this.authCode = authCode;
        let resp = await MicrosoftAuth.authFlow(this.authCode);
        this.refreshToken = resp.refresh_token;
        this.accessToken = resp.access_token;
        return this.accessToken;
    }

    async use() {
        if (await this.checkValidToken()) {
            return this.accessToken;
        } else {
            await this.refresh();
            return this.accessToken;
        }
    }
}

export class CrackedAccount extends Account {
    constructor(username) {
        super(undefined, "cracked");
        this.ownership = false;
        this.setUsername(username);
    }

    setUsername(username) {
        if (!username) return;
        this.username = username;
        this.uuid = CrackedAuth.uuid(username);
    }
}

export class AccountsStorage {
    accountList: Account[] = [];

    constructor() {

    }

    getAccount(index): Account {
        return this.accountList[index];
    }

    getAccountByUUID(uuid): Account|undefined {
        let acc = undefined;
        this.accountList.forEach((el: Account) => {
            if (el.uuid === uuid) {
                acc = el;
            }
        })
        return acc;
    }

    getAccountByName(name): Account|undefined {
        let acc = undefined;
        this.accountList.forEach((el: Account) => {
            if (el.username === name) {
                acc = el;
            }
        })
        return acc;
    }

    addAccount(account: Account) {
        this.accountList.push(account);
    }

    deleteAccount(account: Account) {
        for (let i = 0; i < this.accountList.length; i++) {
            if (this.accountList[i] === account) {
                this.accountList.splice(i, 1);
                i--;
            }
        }

    }

    serialize() {
        return JSON.stringify(this.accountList);
    }

    static deserialize(data: string): AccountsStorage {
        let accounts = JSON.parse(data);
        let accStorage = new AccountsStorage();
        accounts.forEach(account => {
            if (account.type == "microsoft") {
                accStorage.addAccount(Object.setPrototypeOf(account,MicrosoftAccount.prototype))
            } else if (account.type == "mojang") {
                accStorage.addAccount(Object.setPrototypeOf(account,MojangAccount.prototype))
            } else if (account.type == "cracked") {
                accStorage.addAccount(Object.setPrototypeOf(account,CrackedAccount.prototype))
            } else {
                accStorage.addAccount(Object.setPrototypeOf(account,Account.prototype))
            }

        })
        return accStorage;
    }
}

export async function HttpGet_BEARER(url, token, headers?: {}, objectResponse = false) {
    return await HttpCustom_BEARER("get", url, token, undefined, headers, objectResponse);
}

export async function HttpCustom_BEARER(method, url, token, body?: string, headers?: {}, objectResponse = false) {
    if (!headers) headers = {};
    headers["Authorization"] = `Bearer ${token}`
    return HttpCustom(method, url, body, headers, objectResponse);
}

export async function HttpPost_BEARER(url, data: string, token, headers?: {}, objectResponse = false) {
    return await HttpCustom_BEARER("post", url, token, data, headers, objectResponse);
}