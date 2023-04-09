import {HttpGet} from "http-client-methods";
import {
    DecodedTextures, MCProfileResponse, NameAvailabilityResponse, NameChangeInfoResponse,
    NameHistoryResponse,
    ProfileResponse,
    ProfileResponseDecoded,
    UsernameToUUIDResponse
} from "./MojangAPI.types";
import {HttpCustom_BEARER, HttpGet_BEARER, HttpPost_BEARER} from "../bearer_requests";

export async function usernameToUUID(username: string) {
    let url = `https://api.mojang.com/users/profiles/minecraft/${username}`;
    let response = await HttpGet(url);
    let jsonResponse: UsernameToUUIDResponse = JSON.parse(response);
    return jsonResponse;
}

export async function getProfileByUUID(uuid: string) {
    let url = `https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`;
    let response = await HttpGet(url);
    let jsonResponseEncoded: ProfileResponse = JSON.parse(response);
    let decodedValue: DecodedTextures = JSON.parse(atob(jsonResponseEncoded.properties[0].value));

    let jsonResponse: ProfileResponseDecoded = {
        ...jsonResponseEncoded,
        properties: [{name: jsonResponseEncoded.properties[0].name, value: decodedValue}]
    };
    return jsonResponse;
}

export async function getBlockedServers() {
    let url = "https://sessionserver.mojang.com/blockedservers";
    let response: string = await HttpGet(url);
    return response.split('\n');
}

export async function nameChangeInfo(token:string) {
    let url = "https://api.minecraftservices.com/minecraft/profile/namechange";
    let response = await HttpGet_BEARER(url, token);
    let jsonResponse: NameChangeInfoResponse = JSON.parse(response);
    return jsonResponse;
}

export async function nameAvailability(name: string, token:string) {
    let url = `https://api.minecraftservices.com/minecraft/profile/name/${name}/available`;
    let response = await HttpGet_BEARER(url, token);
    let jsonResponse: NameAvailabilityResponse = JSON.parse(response);
    return jsonResponse.status == "AVAILABLE";

}

export async function changeSkin(url:string, variant: "classic" | "slim", token:string) {
    let body = {
        "variant": variant,
        "url": url
    }
    let Rurl = "https://api.minecraftservices.com/minecraft/profile/skins";
    let response = await HttpPost_BEARER(Rurl, JSON.stringify(body), token, {"Content-Type": "application/json"});
    if (response.length > 0) throw response;
}

export async function resetSkin(uuid:string, token:string) {
    let url = `https://api.mojang.com/user/profile/${uuid}/skin`;
    let response = await HttpCustom_BEARER("delete", url, token);
    if (response.length > 0) throw response;
}

export async function checkOwnership(token:string, profileResp?: MCProfileResponse) {
    if (!profileResp) {
        profileResp = await getProfile(token);
    }
    return !!profileResp.id;
}

export async function getProfile(token:string) {
    let response = await HttpGet_BEARER("https://api.minecraftservices.com/minecraft/profile", token);
    let jsonResponse: MCProfileResponse = JSON.parse(response);
    return jsonResponse;
}