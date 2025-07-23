// Appbar.tsx
import { useAccount, useBalance, useConnect } from 'wagmi';
import { useDisconnect } from 'wagmi';
import { useEffect } from 'react';

export function Appbar({ setWalletConnected }: { setWalletConnected: (val: boolean) => void }) {
  const { connectors, connect } = useConnect();
  const { address, isConnected } = useAccount();

  // Sync connection status with parent state
  useEffect(() => {
    setWalletConnected(!!address); // set true if address exists, false otherwise
  }, [address]);

  return (
    <div className='flex justify-between p-2 m-2'>
      <div>
        {!address ? <Connection /> : <Disconnect />}
      </div>
    </div>
  );

  function Connection() {
    return (
      <div>
        {connectors.map((connector) => (
          <button
            className='mx-2 border rounded p-2'
            key={connector.uid}
            onClick={() => connect({ connector })}
          >
            {connector.name}
          </button>
        ))}
      </div>
    );
  }

  function Disconnect() {
    const { disconnect } = useDisconnect();
    const { data, isLoading, error } = useBalance({ address });

    return (
      <>
        <h1>{isConnected ? `Connected: ${address}` : 'Not connected'}</h1>

        <h1>
          {isLoading && 'Loading balance...'}
          {error && 'Unable to fetch balance'}
          {data && `Balance: ${data.formatted} ${data.symbol}`}
        </h1>

        <button onClick={() => disconnect()}>Disconnect</button>
      </>
    );
  }
}
