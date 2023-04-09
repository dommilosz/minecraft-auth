import * as CrackedAuth from "./CrackedAuth";
import {Account} from "../Account";

export class CrackedAccount extends Account {
    constructor(username:string) {
        super(undefined, "cracked");
        this.ownership = false;
        this.setUsername(username);
    }

    setUsername(username:string) {
        if (!username) return;
        this.username = username;
        this.uuid = CrackedAuth.uuid(username);
    }
}
