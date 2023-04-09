import {AuthenticationError} from "../types";
import * as MojangAuth from "./MojangAuth";
import {Account} from "../Account";

export class MojangAccount extends Account {
    clientToken?: string;
    login_username?: string;
    login_password?: string;

    constructor() {
        super(undefined, "mojang");
    }

    async Login(username?: string, password?: string, saveCredentials?: boolean) {
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
        if (!this.accessToken) throw new AuthenticationError("Access token not provided", "Access token not provided for refreshing");
        if (!this.clientToken) throw new AuthenticationError("Client token not provided", "Client token not provided for refreshing");

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

