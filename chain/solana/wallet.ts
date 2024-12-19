// import { Mnemonic } from 'bip39';
// import { BIP44, BIP44Coins, BIP44Changes } from 'bip44';
// import * as base58 from 'base58';

// function createNewSolanaWallet() {
//     // Generate mnemonic phrase using bip39
//     const mnemonicPhrase = Mnemonic.generateMnemonic(256); // equivalent to Mnemonic(language="english")
    
//     // Convert the mnemonic to seed bytes using bip39
//     const seed = Mnemonic.mnemonicToSeedSync(mnemonicPhrase); // Convert to seed

//     // Create a BIP44 context for Solana
//     const bip44Context = new BIP44(seed, BIP44Coins.SOLANA);
    
//     // Create the account and external change (chain) context
//     const accountContext = bip44Context.derivePath("m/44'/501'/0'"); // 501 is Solana's coin type
//     const externalContext = accountContext.derive(BIP44Changes.CHAIN_EXT); // External change (chain)
    
//     // Extract private and public keys
//     const privateKeyBytes = externalContext.privateKey();
//     const publicKeyBytes = externalContext.publicKey();
    
//     // Create key pair
//     const keyPair = Buffer.concat([privateKeyBytes, publicKeyBytes.slice(1)]); // Public key is compressed, so slice the first byte

//     // Return the wallet information
//     return {
//         privateKey: base58.encode(keyPair), // Encode private key in base58
//         publicKey: externalContext.publicKey().toBase58(), // Public key encoded in base58
//         mnemonic: mnemonicPhrase
//     };
// }

// const newSolanaWallet = createNewSolanaWallet();
// console.log(newSolanaWallet);
