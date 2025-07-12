"use client"
import axios from "axios"
import { useRef } from "react"

export default function Register(){

    const nref=useRef<HTMLInputElement>(null)

    async function handleRegister(){

        try{
            axios.post("http://localhost:3000/api/register",{
                name: nref.current?.value
            }).then(()=>{
                console.log("data sended via regiter frontend")
            })
        }catch(err){
            console.log(err)
        }
    }

    return<div>
        <input type="string" placeholder="enter your name" ref={nref}/>
        <button onClick={handleRegister}>
            continue
        </button>
    </div>
}