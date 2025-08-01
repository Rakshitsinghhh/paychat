
import sendTransaction from "./sendTransaction";


export async function promptAndSendTransaction() {
  const to = prompt("Enter receiver address (0x...)");
  if (!to) return alert("Receiver address is required");

  const valueInEth = prompt("Enter amount in ETH");
  if (!valueInEth) return alert("Amount is required");

  await sendTransaction({ to, valueInEth });
}
