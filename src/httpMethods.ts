const fetch = require('node-fetch');

export async function XHR_GET(url,headers?:{}) {
    return await XHR_CUSTOM("get",url,undefined,headers);
}
export async function XHR_CUSTOM(method,url,body?:string,headers?:{}) {
    let req = {
        method: method,
        headers: headers,
    }
    if(body)req["body"] = body;
    let res = await fetch(url,req);

    return await res.text();
}


export async function XHR_POST(url,data:string,headers?:{}){
    return await XHR_CUSTOM("post",url,data,headers);
}