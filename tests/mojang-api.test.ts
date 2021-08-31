import {MojangAPI} from "../src";

test('api-status', async () => {
    let status = await MojangAPI.getStatus();
    expect(status).toBeDefined();
    expect(typeof status).toBe("object");
    status.forEach(el => {
        expect(typeof el).toBe("object");
    })
})

test('api-statistics', async () => {
    let statistics = await MojangAPI.getStatistics();
    expect(statistics).toBeDefined();
    expect(typeof statistics).toBe("object");
    expect(typeof statistics.last24h).toBe("number");
    expect(typeof statistics.saleVelocityPerSeconds).toBe("number");
    expect(typeof statistics.total).toBe("number");
})

test('api-getUUID', async () => {
    let response = await MojangAPI.usernameToUUID("MHF_Steve");
    expect(response).toBeDefined();
    expect(typeof response).toBe("object");
    expect(typeof response.id).toBe("string");
    expect(typeof response.name).toBe("string");
})

test('api-getBlockedServers', async () => {
    let response = await MojangAPI.getBlockedServers();
    expect(response).toBeDefined();
    expect(typeof response).toBe("object");
    expect(response.length).toBeGreaterThan(0);
    expect(typeof response[0]).toBe("string");
})

test('api-getProfileByUUID', async () => {
    let response = await MojangAPI.getProfileByUUID("c06f89064c8a49119c29ea1dbd1aab82"); //MHF_Steve uuid
    expect(response).toBeDefined();
    expect(typeof response).toBe("object");
    expect(typeof response.id).toBe("string");
    expect(typeof response.name).toBe("string");
    expect(typeof response.properties).toBe("object");

    expect(typeof response.properties[0].value.textures.SKIN.url).toBe("string");
})

test('api-nameHistory', async () => {
    let response = await MojangAPI.nameHistory("c06f89064c8a49119c29ea1dbd1aab82"); //MHF_Steve uuid
    expect(response).toBeDefined();
    expect(typeof response).toBe("object");
    expect(response.length).toBeGreaterThan(0);
    expect(typeof response[0].name).toBe("string");
})