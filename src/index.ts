import {XHR_GET, XHR_POST} from "./httpMethods";
import 'reflect-metadata';
import {plainToClass} from "class-transformer";
import crypto from "crypto";

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

export async function XHR_GET_BEARER(url, token) {
    return XHR_GET(url, {"Authorization": `Bearer ${token}`})
}

export class account {
    accessToken: string;
    ownership: boolean;
    uuid: string;
    username: string;
    type: string;

    constructor(token: string, type: any) {
        this.accessToken = token;
        this.type = type;
    }

    async checkValidToken() {
        return await MojangAuth.validateToken(this.accessToken);
    }

    async checkOwnership() {
        this.ownership = await MojangAuth.checkOwnership(this.accessToken);
        return this.ownership;
    }

    async getProfile() {
        if (this.ownership == undefined) {
            await this.checkOwnership();
            return this.getProfile()
        }
        let profile = await MojangAuth.getProfile(this.accessToken);
        this.username = profile.name;
        this.uuid = profile.id;
        return profile;
    }
}

export class mojangAccount extends account {
    clientToken: string;

    constructor() {
        super(undefined, "mojang");
    }

    async Login(username: string, password: string) {
        let resp = await MojangAuth.authenticate(username, password);
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
    }

    async refresh() {
        let resp = await MojangAuth.refresh(this.accessToken, this.clientToken);
        this.clientToken = resp.clientToken;
        this.accessToken = resp.accessToken;
    }

    async use() {
        if (await this.checkValidToken()) {

        } else {
            await this.refresh();
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
        this.username = username;
        this.uuid = CrackedAuth.uuid(username);
        this.ownership = true;
    }
}

export class accountsStorage {
    accountList: any[] = [];

    constructor() {

    }

    getAccount(index):any {
        return this.accountList[index];
    }

    getAccountByUUID(uuid):any{
        this.accountList.forEach((el:account)=>{
            if(el.uuid===uuid){
                return el;
            }
        })
        return undefined;
    }

    getAccountByName(name):any{
        this.accountList.forEach((el:account)=>{
            if(el.username===name){
                return el;
            }
        })
        return undefined;
    }

    addAccount(account: account) {
        this.accountList.push(account);
    }

    deserialize() {
        return JSON.stringify(this.accountList);
    }

    static serialize(data: string): accountsStorage {
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