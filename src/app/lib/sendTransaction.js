// Make sure to connect to wallet (requestAccounts) before calling this.

export default async function sendTransaction({ to, valueInEth }) {
  if (!window.ethereum) {
    alert("No wallet detected!");
    return;
  }

  // 1. Ensure address and value are provided
  if (!to || !valueInEth) {
    alert("To address and amount (in ETH) required.");
    return;
  }

  // 2. Format value to hex string in wei
  const valueWei = BigInt(Number(valueInEth) * 1e18).toString(16);

  try {
    // 3. Send transaction
    const txHash = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: (await window.ethereum.request({ method: 'eth_accounts' }))[0],
        to: to,
        value: "0x" + valueWei, // hex value
      }]
    });
    alert(`Transaction sent! Tx Hash: ${txHash}`);
    // optionally return or handle txHash
    return txHash;
  } catch (err) {
    alert(`Transaction failed: ${err.message || err}`);
    return null;
  }
}
