import {Account} from "./Account";
import {CrackedAccount} from "./CrackedAuth/CrackedAccount";
import {MojangAccount} from "./MojangAuth/MojangAccount";
import {MicrosoftAccount} from "./MicrosoftAuth/MicrosoftAccount";

export class AccountsStorage {
    accountList: Account[] = [];

    constructor() {

    }

    getAccount(index:number): Account {
        return this.accountList[index];
    }

    getAccountByUUID(uuid:string): Account | undefined {
        let acc = undefined;
        this.accountList.forEach((el: Account) => {
            if (el.uuid === uuid) {
                acc = el;
            }
        })
        return acc;
    }

    getAccountByName(name:string): Account | undefined {
        let acc = undefined;
        this.accountList.forEach((el: Account) => {
            if (el.username === name) {
                acc = el;
            }
        })
        return acc;
    }

    addAccount(account: Account) {
        this.accountList.push(account);
    }

    deleteAccount(account: Account) {
        for (let i = 0; i < this.accountList.length; i++) {
            if (this.accountList[i] === account) {
                this.accountList.splice(i, 1);
                i--;
            }
        }

    }

    serialize() {
        return JSON.stringify(this.accountList);
    }

    static deserialize(data: string): AccountsStorage {
        let accounts = JSON.parse(data);
        let accStorage = new AccountsStorage();
        accounts.forEach((account:Account) => {
            if (account.type == "microsoft") {
                accStorage.addAccount(Object.setPrototypeOf(account, MicrosoftAccount.prototype))
            } else if (account.type == "mojang") {
                accStorage.addAccount(Object.setPrototypeOf(account, MojangAccount.prototype))
            } else if (account.type == "cracked") {
                accStorage.addAccount(Object.setPrototypeOf(account, CrackedAccount.prototype))
            } else {
                accStorage.addAccount(Object.setPrototypeOf(account, Account.prototype))
            }

        })
        return accStorage;
    }
}
