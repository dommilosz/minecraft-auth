export type MSConfigType = {
    appID: string,
    appSecret?:string
    redirectURL: string,
    scope: string,
    mode:"SPA"|"Web"
}

export type ServerConfigType = {
    port: number,
    host: string,
    redirectAfterAuth?: string,
    timeout: number
}

export type TokenResponse = {
    token_type: string;
    expires_in: number;
    scope: string;
    access_token: string;
    refresh_token: string;
    user_id: string;
    foci: string;
    error_description: string;
    error: string;
    correlation_id: string;
};
export type MCTokenResponse = {
    username: string;
    roles: [];
    access_token: string;
    token_type: string;
    expires_in: 86400;
};
export type XBLResponse = {
    IssueInstant: string;
    NotAfter: string;
    Token: string;
    DisplayClaims: {
        xui: [
            {
                uhs: string;
            }
        ];
    };
};

export type XSTSResponse = {
    IssueInstant: string;
    NotAfter: string;
    Token: string;
    DisplayClaims: {
        xui: [
            {
                uhs: string;
            }
        ];
    };
    Identity: string;
    XErr: number;
    Message: string;
    Redirect: string;
};