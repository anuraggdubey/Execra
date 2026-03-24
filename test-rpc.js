const testRpc = async (url) => {
    try {
        console.log(`Testing ${url}...`)
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: "2.0", method: "starknet_chainId", params: [], id: 1 })
        });
        const text = await res.text();
        console.log(`Response: ${res.status} - ${text.substring(0, 100)}`);
    } catch (e) {
        console.error(`Error:`, e.message);
    }
}

testRpc("https://free-rpc.nethermind.io/sepolia-juno");
testRpc("https://starknet-sepolia.public.cartridge.gg");
