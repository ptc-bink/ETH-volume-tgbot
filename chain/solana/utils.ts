// import axios from 'axios';

// const WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"; // This is the WRAPPED_SOL_MINT constant

// interface PairData {
//     pairAddress: string;
//     baseToken: {
//         address: string;
//     };
//     quoteToken: {
//         address: string;
//     };
//     dexId: string;
//     chainId: string;
// }

// interface ResponseData {
//     pair: any;
//     pairs: PairData[];
// }

// async function getPoolKeysByToken(tokenAddress: string) {
//     try {
//         const response = await axios.get<ResponseData>(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
//         const data = response.data;

//         if (!data.pair || data.pairs.length === 0) {
//             return null;
//         }

//         const raydiumPairs = data.pairs.filter(item => 
//             item.dexId === "raydium" && item.quoteToken.address === WRAPPED_SOL_MINT
//         );

//         if (raydiumPairs.length === 0 || data.pairs[0].chainId !== "solana") {
//             return null;
//         }

//         return {
//             pool_key: raydiumPairs[0].pairAddress,
//             base_mint: raydiumPairs[0].baseToken.address,
//             quote_mint: raydiumPairs[0].quoteToken.address
//         };
//     } catch (error) {
//         console.error("Error fetching data:", error);
//         return null;
//     }
// }

// // Example usage:
// const tokenAddress = "YourTokenAddressHere"; // Replace with an actual token address
// getPoolKeysByToken(tokenAddress).then(poolKeys => {
//     if (poolKeys) {
//         console.log("Pool Keys:", poolKeys);
//     } else {
//         console.log("No pool keys found.");
//     }
// });
