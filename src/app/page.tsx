import Link from "next/link";

export default function Home() {
  return (
    <div>
      <Link href="/register">REGISTER</Link>
      <br/>
      <Link href="/private">SEND MESSAGE</Link>
    </div>
    );
}
