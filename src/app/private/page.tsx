"use client"
import axios from "axios"
import { useRef } from "react"

export default function Private(){
    const rref = useRef<HTMLInputElement>(null)
    const mref = useRef<HTMLInputElement>(null)

    async function handleprivate(){

        try{
            axios.post("http://localhost:3000/api/private",{
                reviever : rref.current?.value,
                message : mref.current?.value
        }).then(()=>{
            console.log("private message sended")
        })
    }
    catch(err){
        console.log(err)
        }
    }

    return(
        <div>
            <input placeholder="message" ref={rref}/>
            <input placeholder="name" ref={mref}/>

            <button onClick={handleprivate}>
                submit
            </button>
        </div>
    )
}