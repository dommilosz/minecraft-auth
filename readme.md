# Minecraft-auth package
Minecraft-auth is a package to authenticate and get minecraft access tokens.

Authentication Types:
* Mojang Authentication - standard mojang authentication using username and password
* Microsoft Authentication - new Microsoft oauth authentication to login to new accounts / migrated to microsoft
* Cracked Authentication - non premium offline mode authentication. Requires only username.

Mojang API:

Package contains MojangApi class which can be used to fetch other users skins, uuids, check server status and more.

### Error handling:
All authentication errors are thrown by using AuthenticationError class.
```javascript
message: string;
error: string;
additionalInfo: string 
```

### Authentication Examples: 
* Mojang Authentication:
```javascript
var minecraftAuth = require("minecraft-auth")
let account = new minecraftAuth.mojangAccount();
async function authenticate(){
    try{
        await account.Login("username","password");
    }
    catch(e){
        console.error(e) 
    }
}
authenticate();
```
 
 * Microsoft Authentication:
 ```javascript
var minecraftAuth = require("minecraft-auth")
const prompt = require('prompt');

let account = new minecraftAuth.microsoftAccount();

async function authenticate() {
    try {
        let appID = "app id";
        let appSecret = "app secret";
        let redirectURL = "http://localhost/auth";
        minecraftAuth.MicrosoftAuth.setup(appID, appSecret, redirectURL);
        console.log(minecraftAuth.MicrosoftAuth.createUrl())
        prompt.start();
        let result = await prompt.get(['code']);
        console.log('Command-line input received:');
        console.log('  code: ' + result.code);
        await account.authFlow(result.code)
    } catch (e) {
        console.error(e)
    }
}

authenticate();
 ```

* Cracked Authentication:
```javascript
var minecraftAuth = require("minecraft-auth")
let account = new minecraftAuth.crackedAccount("username");
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
accountsStorage is a storage for your accounts. 
###### Adding accounts:
You can add new account with `accountsStorage::addAccount(account)`
###### Removing accounts:
You can remove account with `accountsStorage::removeAccount(account)`

###### Getting accounts:
You can get accounts with:
* `getAccount(index)`
* `getAccountByName(name)`
* `getAccountByUUID(uuid)`
###### Saving/Reading accounts:
* `deserialize` converts storage to JSON string to save in file
* `serialize` converts string to accountStorage object