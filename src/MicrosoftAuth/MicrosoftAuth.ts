import http, {IncomingMessage, ServerResponse} from "http";
import {HttpPost} from "http-client-methods";
import {
    MCTokenResponse,
    MSConfigType,
    ServerConfigType,
    TokenResponse,
    XBLResponse,
    XSTSResponse
} from "./MicrosoftAuth.types";
import {AuthenticationError, ListeningHttpServer} from "../types";

let config: MSConfigType = {
    scope: "XboxLive.signin offline_access",
    redirectURL: "http://localhost:8080/token",
    appID: "747bf062-ab9c-4690-842d-a77d18d4cf82",
    mode: "SPA",
}


export function setup(_config: Partial<MSConfigType>) {
    if(_config.appSecret){
        config = {...config,mode:"Web",..._config};
    }else{
        config = {...config,mode:"SPA",..._config};
    }
}

async function createServer(serverConfig: ServerConfigType): Promise<ListeningHttpServer> {
    // @ts-ignore
    const server: ListeningHttpServer = http.createServer();

    await server.listen(serverConfig.port, serverConfig.host);

    if (serverConfig.onstart) {
        serverConfig.onstart(serverConfig.host, serverConfig.port)
    } else {
        console.log(`MS Token Server is running on http://${serverConfig.host}:${serverConfig.port}`);
    }

    server.fullClose = async function (success: boolean) {
        await server.close();
        if (serverConfig.onclose) {
            serverConfig.onclose(success)
        }
    };
    return server;
}

async function _listenForCode(server: ListeningHttpServer, serverConfig: ServerConfigType): Promise<string> {
    let _timeout:any;
    try {
        return await new Promise<string>((r, j) => {
            _timeout = setTimeout(async () => {
                await server.fullClose(false);
                j(undefined);
            }, serverConfig.timeout);
            server.fullClose = async function (success: boolean) {
                await server.close();
                clearTimeout(_timeout);
                if (serverConfig.onclose) {
                    serverConfig.onclose(success)
                }
            };

            async function requestListener(req: IncomingMessage, res: ServerResponse) {
                if(!req.url)return;

                switch (req.url.split('?')[0]) {
                    case '/token':
                        if (serverConfig.redirectAfterAuth) {
                            await res.writeHead(301, {
                                Location: serverConfig.redirectAfterAuth,
                            });
                        }
                        await res.end();
                        await server.fullClose(true);
                        if (req.url.includes('?code')) {
                            let code = req.url.split('?code=')[1];
                            if(serverConfig.oncode){
                                serverConfig.oncode(code)
                            }
                            r(code);
                        }
                        if (req.url.includes('?error')) {
                            const error = req.url.split('?error=')[1].split('&')[0];
                            const error_description = decodeURIComponent(
                                req.url.split('&error_description=')[1]
                            );
                            j(new AuthenticationError(error, error_description, ''));
                        }
                        break;
                    case '/url':
                        await res.writeHead(200);
                        await res.end(createUrl());
                        break;
                    case '/close':
                        await server.fullClose(false);
                        j(undefined);
                        break;
                    case '/auth':
                        res.writeHead(302, {
                            Location: createUrl(),
                        });
                        res.end();
                        break;
                    default:
                        res.writeHead(302, {
                            Location: createUrl(),
                        });
                        res.end();
                        break;
                }
                await res.writeHead(404);
                await res.end();
            }

            server.on('request', requestListener);
        })
    }catch (ex){
        server.fullClose(false);
        throw ex;
    }
}

export async function listenForCode(_serverConfig: Partial<ServerConfigType> = {}): Promise<string> {
    const serverConfig: ServerConfigType = {port: 8080, host: "localhost", timeout: 30 * 1000, ..._serverConfig}

    const server = await createServer(serverConfig);
    return _listenForCode(server, serverConfig);
}

export function createUrl() {
    let encodedID = encodeURIComponent(config.appID ?? "");
    let encodedUrl = encodeURIComponent(config.redirectURL);
    let encodedScope = encodeURIComponent(config.scope);

    return `https://login.live.com/oauth20_authorize.srf?client_id=${encodedID}&response_type=code&redirect_uri=${encodedUrl}&scope=${encodedScope}`;
}

export async function getToken(authCode: string) {
    let encodedID = encodeURIComponent(config.appID);
    let encodedUrl = encodeURIComponent(config.redirectURL);

    let url = 'https://login.live.com/oauth20_token.srf';
    let body = `client_id=${encodedID}&code=${authCode}&grant_type=authorization_code&redirect_uri=${encodedUrl}`;

    if (config.mode === "Web") {
        if (!config.appSecret) {
            throw new AuthenticationError("App secret was not provided", "App secret was not provided in getToken")
        }

        let encodedSecret = encodeURIComponent(config.appSecret);

        url = "https://login.live.com/oauth20_token.srf";
        body = `client_id=${encodedID}&client_secret=${encodedSecret}&code=${authCode}&grant_type=authorization_code&redirect_uri=${encodedUrl}`
    }

    let response = await HttpPost(url, body, {"Content-Type": "application/x-www-form-urlencoded"})

    let jsonResponse: TokenResponse = JSON.parse(response);
    if (jsonResponse.error) {
        throw new AuthenticationError(
            jsonResponse.error,
            jsonResponse.error_description,
            jsonResponse.correlation_id
        );
    }

    return jsonResponse;
}

export async function getTokenRefresh(refreshToken:string) {
    let encodedID = encodeURIComponent(config.appID??"");
    let encodedUrl = encodeURIComponent(config.redirectURL);

    let url = 'https://login.live.com/oauth20_token.srf';
    let body = `client_id=${encodedID}&refresh_token=${refreshToken}&grant_type=refresh_token&redirect_uri=${encodedUrl}`;

    if(config.mode === "Web"){
        if(!config.appSecret){
            throw new AuthenticationError("App secret was not provided", "App secret was not provided in getToken")
        }

        let encodedSecret = encodeURIComponent(config.appSecret);

        url = "https://login.live.com/oauth20_token.srf";
        body = `client_id=${encodedID}&client_secret=${encodedSecret}&refresh_token=${refreshToken}&grant_type=refresh_token&redirect_uri=${encodedUrl}`
    }

    const response = await HttpPost(url, body, {
        'Content-Type': 'application/x-www-form-urlencoded',
    });

    const jsonResponse: TokenResponse = JSON.parse(response);
    if (jsonResponse.error) {
        throw new AuthenticationError(
            jsonResponse.error,
            jsonResponse.error_description,
            jsonResponse.correlation_id
        );
    }

    return jsonResponse;
}

export async function authXBL(accessToken:string) {
    const body = {
        Properties: {
            AuthMethod: 'RPS',
            SiteName: 'user.auth.xboxlive.com',
            RpsTicket: `d=${accessToken}`, // your access token from step 2 here
        },
        RelyingParty: 'http://auth.xboxlive.com',
        TokenType: 'JWT',
    };
    const response = await HttpPost(
        'https://user.auth.xboxlive.com/user/authenticate',
        JSON.stringify(body),
        {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        }
    );

    const jsonResponse: XBLResponse = JSON.parse(response);

    return jsonResponse;
}

export async function authXSTS(xblToken:string) {
    const body = {
        Properties: {
            SandboxId: 'RETAIL',
            UserTokens: [`${xblToken}`],
        },
        RelyingParty: 'rp://api.minecraftservices.com/',
        TokenType: 'JWT',
    };
    const response = await HttpPost(
        'https://xsts.auth.xboxlive.com/xsts/authorize',
        JSON.stringify(body),
        {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        }
    );

    const jsonResponse: XSTSResponse = JSON.parse(response);

    if (jsonResponse.XErr) {
        throw new AuthenticationError(
            String(jsonResponse.XErr),
            jsonResponse.Message,
            jsonResponse.Redirect
        );
    }

    return jsonResponse;
}

export async function getMinecraftToken(xstsToken:string, uhs:string) {
    const body = {
        identityToken: `XBL3.0 x=${uhs};${xstsToken}`,
    };
    const response = await HttpPost(
        'https://api.minecraftservices.com/authentication/login_with_xbox',
        JSON.stringify(body),
        {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        }
    );

    const jsonResponse: MCTokenResponse = JSON.parse(response);
    return jsonResponse;
}

export async function authFlow(authCode:string) {
    const tokenRes = await getToken(authCode);
    return await authFlowXBL(tokenRes.access_token, tokenRes.refresh_token);
}

export async function authFlowRefresh(refresh_token:string) {
    const tokenRes = await getTokenRefresh(refresh_token);
    return await authFlowXBL(tokenRes.access_token, tokenRes.refresh_token);
}

export async function authFlowXBL(token:string, refresh_token:string) {
    const xblRes = await authXBL(token);
    const xstsRes = await authXSTS(xblRes.Token);
    const mcToken = await getMinecraftToken(
        xstsRes.Token,
        xblRes.DisplayClaims.xui[0].uhs
    );
    return {access_token: mcToken.access_token, refresh_token};
}

