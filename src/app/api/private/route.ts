import { NextRequest, NextResponse } from "next/server";

export async function POST(res:NextRequest){

    const data = await res.json()
    const {reviever} = data
    const {message} = data


    console.log(reviever)
    console.log(message)

    return NextResponse.json({
        reciever  : reviever,
        message: message
    })
    
}