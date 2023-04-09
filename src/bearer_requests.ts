import {HttpCustom} from "http-client-methods";

export async function HttpGet_BEARER(url:string, token:string, headers?: {}, objectResponse = false) {
    return await HttpCustom_BEARER("get", url, token, undefined, headers, objectResponse);
}

export async function HttpCustom_BEARER(method:string, url:string, token:string, body?: string, headers?: any, objectResponse = false) {
    if (!headers) headers = {};
    headers["Authorization"] = `Bearer ${token}`
    return HttpCustom(method, url, body, headers, objectResponse);
}

export async function HttpPost_BEARER(url:string, data: string, token:string, headers?: {}, objectResponse = false) {
    return await HttpCustom_BEARER("post", url, token, data, headers, objectResponse);
}