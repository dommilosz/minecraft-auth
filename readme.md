# Minecraft-auth package
![npm bundle size](https://img.shields.io/bundlephobia/min/minecraft-auth?label=npm%20size)
![GitHub package.json version](https://img.shields.io/github/package-json/v/dommilosz/minecraft-auth)
![GitHub top language](https://img.shields.io/github/languages/top/dommilosz/minecraft-auth)
![npm](https://img.shields.io/npm/dt/minecraft-auth)

Minecraft-auth is a package to authenticate and get minecraft access tokens.

Authentication Types:
* Mojang Authentication - standard mojang authentication using username and password
* Microsoft Authentication - new Microsoft oauth authentication to login to new accounts / migrated to microsoft
* Cracked Authentication - non premium offline mode authentication. Requires only username.

Mojang API:

Package contains MojangApi class which can be used to fetch other users skins, uuids, check server status and more.

### Deprecation Notice:
Usage of lowercase classes like `mojangAccount` should be converted to use uppercase equivalents like `MojangAccount`. Usage of lowercase classes may be removed in the future. Currently, it only shows warning about the deprecation.   

### Error handling:
All authentication errors are thrown by using AuthenticationError or OwnershipError classes they all extend Error class.
AuthenticationError also contains `additionalInfo: string`

### Authentication Examples: 
* Mojang Authentication:
```javascript
var minecraftAuth = require("minecraft-auth")
let account = new minecraftAuth.MojangAccount();

await account.Login("email","password");
```
 
 * Microsoft Authentication:
 ```javascript
var minecraftAuth = require("minecraft-auth")
let account = new minecraftAuth.MicrosoftAccount();

let appID = "app id";
let appSecret = "app secret";
let redirectURL = "http://localhost/auth";

minecraftAuth.MicrosoftAuth.setup(appID, appSecret, redirectURL);

console.log(minecraftAuth.MicrosoftAuth.createUrl());

let code = await MicrosoftAuth.listenForCode(8080);
if(code !== undefined){
    await account.authFlow(code);
}
 ```

* Cracked Authentication:
```javascript
var minecraftAuth = require("minecraft-auth")
let account = new minecraftAuth.CrackedAccount("username");
```

### Usage example
```javascript
await authenticate(); //function from above examples
        
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