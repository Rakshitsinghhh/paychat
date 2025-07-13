import { NextRequest, NextResponse } from "next/server";

const ws = new WebSocket("ws://localhost:8080")


export async function POST(res:NextRequest){

    const data = await res.json()
    const {reciever} = data
    const {message} = data


    const payload = JSON.stringify({
        type:"message",
        to:reciever,
        Content:message
    })

    const resp = ws.send(payload)
    

    console.log(reciever)
    console.log(message)

    return NextResponse.json({
        reciever  : reciever,
        message: message,
        responsefromws: resp
    })
    
}