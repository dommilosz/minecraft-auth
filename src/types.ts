import http from "http";

export type ListeningHttpServer = http.Server & {
    fullClose: (success:boolean) => any;
    serverTimeout?: NodeJS.Timeout;
};
export type AccountType = "mojang" | "cracked" | "microsoft" | "token";

export class AuthenticationError extends Error {
    additionalInfo?: string

    constructor(_error:string, _message:string, _additionalInfo?:string) {
        super(_message);
        this.name = _error;
        this.additionalInfo = _additionalInfo;
    }
}

export class OwnershipError extends Error {
    constructor(_error:string) {
        super(_error);
    }
}