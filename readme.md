# Minecraft-auth package
![npm bundle size](https://img.shields.io/bundlephobia/min/minecraft-auth?label=npm%20size)
![GitHub package.json version](https://img.shields.io/github/package-json/v/dommilosz/minecraft-auth)
![GitHub top language](https://img.shields.io/github/languages/top/dommilosz/minecraft-auth)
![npm](https://img.shields.io/npm/dt/minecraft-auth)

Minecraft-auth is a package to authenticate and get minecraft access tokens.

Authentication Types:
* Mojang Authentication - standard mojang authentication using username and password
* Microsoft Authentication - new Microsoft oauth authentication to login to new accounts / migrated to microsoft.
Read how to setup it [here](https://github.com/dommilosz/minecraft-auth/wiki/How-to-setup-Microsoft-Auth) 
* Cracked Authentication - non premium offline mode authentication. Requires only username.

Mojang API:

Package contains MojangApi class which can be used to fetch other users skins, uuids, check server status and more.

### 2.0.0 migration
Version 2.0.0 changes how Microsoft Authentication works. 
* Azure application should be registered with `Mobile and desktop applications` type
* parameters in Setup and listenForCode functions changed

### Error handling:
All authentication errors are thrown by using AuthenticationError or OwnershipError classes they all extend Error class.
AuthenticationError also contains `additionalInfo: string`

### Installation:
```shell
npm i --save minecraft-auth
```
Importing:
```javascript
import * as minecraftAuth from "./src/index";
//or
const minecraftAuth = require("./src/index.ts");
```

### Authentication Examples: 

 * Microsoft Authentication (public client, [valid for 24h](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#refresh-the-access-token)): 
```javascript
const MicrosoftAuth = minecraftAuth.MicrosoftAuth;

let account = new minecraftAuth.MicrosoftAccount();
MicrosoftAuth.setup({appID:"747bf062-ab9c-4690-842d-a77d18d4cf82"}); //https://github.com/dommilosz/minecraft-auth/wiki/How-to-setup-Microsoft-Auth
let code = await MicrosoftAuth.listenForCode();

if(code !== undefined){
    await account.authFlow(code);
}
 ```

* Microsoft Authentication ([don't have specified lifetimes](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow#refresh-the-access-token)):
 ```javascript
const MicrosoftAuth = minecraftAuth.MicrosoftAuth;

let account = new minecraftAuth.MicrosoftAccount();
MicrosoftAuth.setup({appID:"YOUR APP ID", appSecret:"YOUR APP SECRET"}); //https://github.com/dommilosz/minecraft-auth/wiki/How-to-setup-Microsoft-Auth
let code = await MicrosoftAuth.listenForCode();

if(code !== undefined){
    await account.authFlow(code);
}
 ```

* Mojang Authentication (obsolete due to migration):
```javascript
let account = new minecraftAuth.MojangAccount();
await account.Login("email","password");
```


* Cracked Authentication:
```javascript
let account = new minecraftAuth.CrackedAccount("username");
```

### Usage example
```javascript
//any type of authentication eg. from above examples
        
console.log(account.accessToken);
await account.getProfile();
console.log(account.username);            //Username of the account
console.log(account.uuid);                //UUID of the account (without dashes)
console.log(account.ownership);           //Does account even have minecraft
console.log(account.profile)              //User profile - skins, capes, uuid, username
console.log(account.profile.skins[0].url) //URL of the 1st skin.
```

### accountsStorage:
AccountsStorage is a storage for your accounts. 
###### Adding accounts:
You can add new account with `AccountsStorage::addAccount(account)`
###### Removing accounts:
You can remove account with `AccountsStorage::removeAccount(account)`

###### Getting accounts:
You can get accounts with:
* `getAccount(index)`
* `getAccountByName(name)`
* `getAccountByUUID(uuid)`
###### Saving/Reading accounts:
* `serialize` converts storage to JSON string to save in file
* `deserialize` converts string to AccountStorage object