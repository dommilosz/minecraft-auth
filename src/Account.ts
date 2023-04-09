import {AccountType, OwnershipError} from "./types";
import {MCProfileResponse} from "./MojangAPI/MojangAPI.types";
import * as MojangAuth from "./MojangAuth/MojangAuth";
import * as MojangAPI from "./MojangAPI/MojangAPI";

export class Account {
    accessToken?: string;
    ownership: boolean = false;
    uuid?: string;
    username?: string;
    type: AccountType;
    profile?: MCProfileResponse;
    properties: any = {};
    alternativeValidation: boolean = false;

    constructor(token: string | undefined, type: AccountType) {
        this.accessToken = token;
        this.type = type;
    }

    async checkValidToken() {
        if (!this.accessToken) return false;
        return await MojangAuth.validateToken(this.accessToken, this.alternativeValidation);
    }

    async checkOwnership() {
        if (!this.accessToken) return false;
        this.ownership = await MojangAPI.checkOwnership(this.accessToken);
        return this.ownership;
    }

    async getProfile(): Promise<MCProfileResponse | undefined> {
        if (!this.accessToken) return undefined;
        if (!this.ownership) {
            await this.checkOwnership();
            if (!this.ownership) throw new OwnershipError("User don't have minecraft on his account!");
            return this.getProfile()
        }
        let profile = await MojangAPI.getProfile(this.accessToken);
        this.username = profile.name;
        this.uuid = profile.id;
        this.profile = profile;
        return profile;
    }

    async changeSkin(url: string, variant: "slim" | "classic") {
        if (!this.accessToken) return;
        await MojangAPI.changeSkin(url, variant, this.accessToken);
        return true;
    }

    async checkNameAvailability(name: string) {
        if (!this.accessToken) return false;
        return await MojangAPI.nameAvailability(name, this.accessToken)
    }

    async canChangeName() {
        if (!this.accessToken) return false;
        return (await MojangAPI.nameChangeInfo(this.accessToken)).nameChangeAllowed
    }
}


