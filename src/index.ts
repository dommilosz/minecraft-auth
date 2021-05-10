import {XHR_CUSTOM, XHR_GET, XHR_POST} from "./httpMethods";
import 'reflect-metadata';
import {plainToClass} from "class-transformer";
import crypto from "crypto";
import atob from "atob";

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

    export function createUrl() {
        return `https://login.live.com/oauth20_authorize.srf?client_id=${compiledID}&response_type=code&redirect_uri=${compiledUrl}&scope=${compiledScope}`
    }

    export async function getToken(authCode) {
        let url = "https://login.live.com/oauth20_token.srf";
        let body = `client_id=${compiledID}&client_secret=${compiledSecret}&code=${authCode}&grant_type=authorization_code&redirect_uri=${compiledUrl}`
        let response = await XHR_POST(url, body, {"Content-Type": "application/x-www-form-urlencoded"})

        let jsonResponse: TokenResponse = JSON.parse(response);
        if (jsonResponse.error) {
            throw new AuthenticationError(jsonResponse.error, jsonResponse.error_description, jsonResponse.correlation_id);
        }

        return jsonResponse;
    }

    export async function getTokenRefresh(refreshToken) {
        let url = "https://login.live.com/oauth20_token.srf";
        let body = `client_id=${compiledID}&client_secret=${compiledSecret}&refresh_token=${refreshToken}&grant_type=refresh_token&redirect_uri=${compiledUrl}`
        let response = await XHR_POST(url, body, {"Content-Type": "application/x-www-form-urlencoded"})

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
        let response = await XHR_POST("https://user.auth.xboxlive.com/user/authenticate", JSON.stringify(body), {
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
        let response = await XHR_POST("https://xsts.auth.xboxlive.com/xsts/authorize", JSON.stringify(body), {
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
        let response = await XHR_POST("https://api.minecraftservices.com/authentication/login_with_xbox", JSON.stringify(body), {
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
        let response = await XHR_POST(url, JSON.stringify(body), {"Content-Type": "application/json"})
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
        let response = await XHR_POST(url, JSON.stringify(body), {"Content-Type": "application/json"})
        let jsonResponse: MCAuthResponse = JSON.parse(response);
        if (jsonResponse.error) {
            throw new AuthenticationError(jsonResponse.error, jsonResponse.errorMessage, jsonResponse.cause)
        }
        return jsonResponse;
    }

    export async function validateToken(token) {
        let url = authUrl + "/validate";
        let body = {
            "accessToken": `${token}`,
        }
        let response = await XHR_POST(url, JSON.stringify(body), {"Content-Type": "application/json"})
        if (response.length < 1) return true;
        let jsonResponse: MCErrorResponse = JSON.parse(response);
        if (jsonResponse.error) {
            return false;
        }
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
    export async function getStatus() {
        let url = "https://status.mojang.com/check";
        let response = await XHR_GET(url);
        let jsonResponse: StatusResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function usernameToUUID(username: string) {
        let url = `https://api.mojang.com/users/profiles/minecraft/${username}`;
        let response = await XHR_GET(url);
        let jsonResponse: UsernameToUUIDResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function nameHistory(uuid: string) {
        let url = `https://api.mojang.com/user/profiles/${uuid}/names`;
        let response = await XHR_GET(url);
        let jsonResponse: NameHistoryResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function getProfileByUUID(uuid: string) {
        let url = `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`;
        let response = await XHR_GET(url);
        let jsonResponseEncoded: ProfileResponse = JSON.parse(response);
        let decodedValue: DecodedTextures = JSON.parse(atob(jsonResponseEncoded.properties[0].value));
        // @ts-ignore
        let jsonResponse: ProfileResponseDecoded = jsonResponseEncoded;
        jsonResponse.properties[0].value = decodedValue;
        return jsonResponse;
    }

    export async function getBlockedServers() {
        let url = "https://sessionserver.mojang.com/blockedservers";
        let response: string = await XHR_GET(url);
        return response.split('\n');
    }

    export async function getStatistics(options?: StatisticsOption[]) {
        if (!options) {
            options = ["item_sold_minecraft", "prepaid_card_redeemed_minecraft"];
        }
        let url = "https://api.mojang.com/orders/statistics";
        let body = {
            "metricKeys": options
        }
        let response = await XHR_POST(url, JSON.stringify(body), {"Content-Type": "application/json"})
        let jsonResponse: StatisticsResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function nameChangeInfo(token) {
        let url = "https://api.minecraftservices.com/minecraft/profile/namechange";
        let response = await XHR_GET_BEARER(url, token);
        let jsonResponse: NameChangeInfoResponse = JSON.parse(response);
        return jsonResponse;
    }

    export async function nameAvailability(name, token) {
        let url = `https://api.minecraftservices.com/minecraft/profile/name/${name}/available`;
        let response = await XHR_GET_BEARER(url, token);
        let jsonResponse: NameAvailabilityResponse = JSON.parse(response);
        return jsonResponse.status == "AVAILABLE";

    }

    export async function changeSkin(url, variant: "classic" | "slim", token) {
        let body = {
            "variant": variant,
            "url": url
        }
        let Rurl = "https://api.minecraftservices.com/minecraft/profile/skins";
        let response = await XHR_POST_BEARER(Rurl, JSON.stringify(body), token, {"Content-Type": "application/json"});
        if (response.length > 0) throw response;
    }

    export async function resetSkin(uuid, token) {
        let url = `https://api.mojang.com/user/profile/${uuid}/skin`;
        let response = await XHR_CUSTOM_BEARER("delete", url, token);
        if (response.length > 0) throw response;
    }

    export async function checkOwnership(token, profileResp?: MCProfileResponse) {
        if (!profileResp) {
            profileResp = await getProfile(token);
        }
        if (profileResp.id) return true;
    }

    export async function getProfile(token) {
        let response = await XHR_GET_BEARER("https://api.minecraftservices.com/minecraft/profile", token);
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
    export type StatisticsOption =
        "item_sold_minecraft"
        | "prepaid_card_redeemed_minecraft"
        | "item_sold_cobalt"
        | "item_sold_scrolls"
        | "prepaid_card_redeemed_cobalt"
        | "item_sold_dungeons"
    export type StatisticsResponse = {
        "total": number,
        "last24h": number,
        "saleVelocityPerSeconds": number
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

export class AuthenticationError {
    message: string;
    error: string;
    additionalInfo: string

    constructor(_error, _message, _additionalInfo) {
        this.message = _message;
        this.error = _error;
        this.additionalInfo = _additionalInfo;
    }
}

export class account {
    accessToken: string;
    ownership: boolean;
    uuid: string;
    username: string;
    type: string;
    profile: MojangAPI.MCProfileResponse;
    properties:any = {};

    constructor(token: string, type: any) {
        this.accessToken = token;
        this.type = type;
    }

    async checkValidToken() {
        if (!this.accessToken) return false;
        return await MojangAuth.validateToken(this.accessToken);
    }

    async checkOwnership() {
        if (!this.accessToken) return false;
        this.ownership = await MojangAPI.checkOwnership(this.accessToken);
        return this.ownership;
    }

    async getProfile() {
        if (!this.accessToken) return undefined;
        if (this.ownership == undefined) {
            await this.checkOwnership();
            return this.getProfile()
        }
        let profile = await MojangAPI.getProfile(this.accessToken);
        this.username = profile.name;
        this.uuid = profile.id;
        this.profile = profile;
        return profile;
    }

    async changeSkin(url: any, variant: "slim" | "classic") {
        if (!this.accessToken) return;
        await MojangAPI.changeSkin(url, variant, this.accessToken)
    }

    async checkNameAvailability(name) {
        if (!this.accessToken) return false;
        return await MojangAPI.nameAvailability(name, this.accessToken)
    }

    async canChangeName() {
        if (!this.accessToken) return false;
        return (await MojangAPI.nameChangeInfo(this.accessToken)).nameChangeAllowed
    }
}

export class mojangAccount extends account {
    clientToken: string;
    login_username: string;
    login_password: string;

    constructor() {
        super(undefined, "mojang");
    }

    async Login(username?: string, password?: string, saveCredentials?) {
        if(!username)username=this.login_username;
        if(!password)password=this.login_password;
        if(!username||!password) throw new AuthenticationError("Username or password not provided","Username or password not provided","");
        let resp = await MojangAuth.authenticate(username, password);
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
        this.login_username = undefined;
        this.login_password = undefined;

        if (saveCredentials) {
            this.login_username = username;
            this.login_password = password;
        }
    }

    async refresh() {
        let resp = await MojangAuth.refresh(this.accessToken, this.clientToken);
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
    }

    async use() {
        if (await this.checkValidToken()) {

        } else {
            if(this.login_username&&this.login_password){
                try {
                    await this.refresh();
                } catch (e) {
                    await this.Login();
                }
            }else{
                await this.refresh();
            }
        }
    }
}

export class microsoftAccount extends account {
    refreshToken: string;
    authCode: string;

    constructor() {
        super(undefined, "microsoft");
    }

    async refresh() {
        let resp = await MicrosoftAuth.authFlowRefresh(this.refreshToken);
        this.refreshToken = resp.refresh_token;
        this.accessToken = resp.access_token;
    }

    async authFlow(authCode) {
        this.authCode = authCode;
        let resp = await MicrosoftAuth.authFlow(this.authCode);
        this.refreshToken = resp.refresh_token;
        this.accessToken = resp.access_token;
    }

    async use() {
        if (await this.checkValidToken()) {

        } else {
            await this.refresh();
        }
    }
}

export class crackedAccount extends account {
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

export class accountsStorage {
    accountList: any[] = [];

    constructor() {

    }

    getAccount(index): any {
        return this.accountList[index];
    }

    getAccountByUUID(uuid): any {
        let acc;
        this.accountList.forEach((el: account) => {
            if (el.uuid === uuid) {
                acc = el;
            }
        })
        return acc;
    }

    getAccountByName(name): any {
        let acc;
        this.accountList.forEach((el: account) => {
            if (el.username === name) {
                acc = el;
            }
        })
        return acc;
    }

    addAccount(account: account) {
        this.accountList.push(account);
    }

    deleteAccount(account: account) {
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

    static deserialize(data: string): accountsStorage {
        let accounts = JSON.parse(data);
        let accStorage = new accountsStorage();
        accounts.forEach(el => {
            if (el.type == "microsoft") {
                accStorage.addAccount(plainToClass(microsoftAccount, el))
            } else if (el.type == "mojang") {
                accStorage.addAccount(plainToClass(mojangAccount, el))
            } else if (el.type == "cracked") {
                accStorage.addAccount(plainToClass(crackedAccount, el))
            } else {
                accStorage.addAccount(plainToClass(account, el))
            }

        })
        return accStorage;
    }
}

export async function XHR_GET_BEARER(url, token, headers?: {}) {
    return await XHR_CUSTOM_BEARER("get", url, token, undefined, headers);
}

export async function XHR_CUSTOM_BEARER(method, url, token, body?: string, headers?: {}) {
    if (!headers) headers = {};
    headers["Authorization"] = `Bearer ${token}`
    return XHR_CUSTOM(method, url, body, headers);
}

export async function XHR_POST_BEARER(url, data: string, token, headers?: {}) {
    return await XHR_CUSTOM_BEARER("post", url, token, data, headers);
}
