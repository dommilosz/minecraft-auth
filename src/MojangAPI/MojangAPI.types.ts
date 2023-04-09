export type MCOwnershipResponse = {
    "items": [{
        "name": string,
        "signature": string
    }, {
        "name": string,
        "signature": string
    }],
    "signature": string,
    "keyId": string
}
export type MCProfileResponse =
    {
        "id": string,
        "name": string,
        "skins": [{
            "id": string,
            "state": string,
            "url": string,
            "variant": string,
            "alias": string
        }],
        "capes": []
    }

export type NameChangeInfoResponse = {
    "changedAt": string,
    "createdAt": string,
    "nameChangeAllowed": boolean
}
export type NameAvailabilityResponse = {
    "status": "DUPLICATE" | "AVAILABLE"
}
export type StatusResponse = [
    {
        "minecraft.net": StatusType
    },
    {
        "session.minecraft.net": StatusType
    },
    {
        "account.mojang.com": StatusType
    },
    {
        "authserver.mojang.com": StatusType
    },
    {
        "sessionserver.mojang.com": StatusType
    },
    {
        "api.mojang.com": StatusType
    },
    {
        "textures.minecraft.net": StatusType
    },
    {
        "mojang.com": StatusType
    }
]
export type StatusType = "green" | "red" | "yellow";
export type UsernameToUUIDResponse = {
    "name": string,
    "id": string
}
export type NameHistoryResponse = NameHistoryEntry[]
export type NameHistoryEntry = {
    "name": string,
    "changedToAt": number
}
export type ProfileResponse = {
    "id": string,
    "name": string,
    "properties": [
        {
            "name": string,
            "value": string
        }
    ]
}
export type ProfileResponseDecoded = {
    "id": string,
    "name": string,
    "properties": [
        {
            "name": string,
            "value": DecodedTextures
        }
    ]
}
export type DecodedTextures = {
    "timestamp": number,
    "profileId": string,
    "profileName": string,
    "signatureRequired": boolean,
    "textures": {
        "SKIN": {
            "url": string
        },
        "CAPE": {
            "url": string
        }
    }
}