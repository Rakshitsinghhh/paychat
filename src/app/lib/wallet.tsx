'use client';

import { useAccount, useBalance, useConnect, useDisconnect } from 'wagmi';

export function Appbar() {
  const { connectors, connect } = useConnect();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data, isLoading, error } = useBalance({ address });

  return (
    <div className='flex justify-between p-2 m-2'>
      {!isConnected ? (
        connectors.map((connector) => (
          <button
            className='mx-2 border rounded p-2'
            key={connector.uid}
            onClick={() => connect({ connector })}
          >
            Connect {connector.name}
          </button>
        ))
      ) : (
        <div>
          <p>✅ Connected: {address}</p>
          {isLoading && <p>Loading balance...</p>}
          {error && <p>❌ Error fetching balance</p>}
          {data && <p>💰 Balance: {data.formatted} {data.symbol}</p>}
          <button onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
