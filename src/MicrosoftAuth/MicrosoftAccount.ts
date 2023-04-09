import {AuthenticationError} from "../types";
import * as MicrosoftAuth from "./MicrosoftAuth";
import {Account} from "../Account";

export class MicrosoftAccount extends Account {
    refreshToken?: string;
    authCode?: string;

    constructor() {
        super(undefined, "microsoft");
        this.alternativeValidation = true;
    }

    async refresh() {
        if (!this.refreshToken) throw new AuthenticationError("Refresh token not provided", "Refresh token not provided for refreshing");

        let resp = await MicrosoftAuth.authFlowRefresh(this.refreshToken);
        this.refreshToken = resp.refresh_token;
        this.accessToken = resp.access_token;
        return this.accessToken;
    }

    async authFlow(authCode:string) {
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
