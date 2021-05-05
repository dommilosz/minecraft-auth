const fetch = require('node-fetch');

export async function XHR_GET(url,headers?:{}) {
    let res = await fetch(url, {
        method: 'get',
        headers: headers,
    });
    return await res.text();
}

export async function XHR_POST(url,data:string,headers?:{}){
    let res = await fetch(url, {
        method: 'post',
        body:    data,
        headers: headers,
    });
    return await res.text();
}
