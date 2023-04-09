import {HttpPost} from "http-client-methods";
import {MCAuthResponse, MCErrorResponse} from "./MojangAuth.types";
import {AuthenticationError} from "../types";
import {HttpGet_BEARER} from "../bearer_requests";

let authUrl = "https://authserver.mojang.com";

export async function authenticate(username:string, password:string, clientToken?:string) {
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

export async function refresh(accessToken:string, clientToken:string) {
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

export async function validateToken(token:string, alternativeValidation?: boolean) {
    if (!alternativeValidation) return await _validateToken(token);
    else return await _validateTokenAlternative(token);
}

export async function _validateToken(token:string) {
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

export async function _validateTokenAlternative(token:string) {
    let res = await HttpGet_BEARER("https://api.minecraftservices.com/minecraft/profile", token, {}, true);
    return res.status != 401 && res.status != 403;

}

