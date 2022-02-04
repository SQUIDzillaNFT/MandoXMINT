import './App.css';
import 'font-awesome/css/font-awesome.min.css';
import logo from './images/logo.png';
import React, { useState, useEffect } from "react";

import axios from 'axios';

import LaceContract from './contract/Lacedameon.json';
import { ethers, utils } from "ethers";
import Countdown from "react-countdown";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { initOnboard } from "./utils/walletService"

function App() {
  return (
    <>
      <MainComponent />
      <ToastContainer autoClose={5000} hideProgressBar />
    </>
  )
}

function MainComponent() {
  const [walletAddr, setWalletAddr] = useState("");

  // mandox
  const [isStarted, setIsStarted] = useState(false);
  const [statusShow, setStatusShow] = useState(false);
  const [mintCount, setMintCount] = useState(1);
  const [mintFlag, setMintFlag] = useState(false);
  const [onboard, setOnboard] = useState();
  const [walletConnected, setWalletConnected] = useState(false);
  const [web3, setWeb3] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  useEffect(() => {
    const _onboard = initOnboard({
      address: (address) => {
        console.log('address callback: ', address);
        setWalletAddress(address);
        if (!!address) {
          setWalletAddr(
            shortenHex(address)
          );
        } else {
          setWalletConnected(false);
        }
      },
      network: (network) => {
        console.log('network callback: ', network)
      },
      balance: (balance) => {
        console.log('balance', balance);
      },
      wallet: async (wallet) => {
        console.log('wallet', wallet);
        if (wallet.provider) {
          let ethersProvider = new ethers.providers.Web3Provider(wallet.provider);
          let _nftContract = new ethers.Contract(LaceContract.networks[1].address, LaceContract.abi, ethersProvider.getUncheckedSigner());
          setContract(_nftContract);
          let _totalSupply = await _nftContract.totalSupply();
          setTotalSupply(Number(_totalSupply));
          let _maxTokenNumber = await _nftContract.MAX_ELEMENTS();
          setMaxTokenNumber(Number(_maxTokenNumber));
          setStatusShow(true);
        }
      }
    })

    setOnboard(_onboard)
  }, [])

  const connectWallet = async () => {
    if (onboard) {
      const walletSelected = await onboard.walletSelect()
      if (!walletSelected) return

      console.log('wallet selected: ', walletSelected)
      const readyToTransact = await onboard.walletCheck()
      console.log('Wallet selected: ', walletSelected, ' Ready to transact: ', readyToTransact)
      if (walletSelected && readyToTransact) {
        setWalletConnected(true);
      }
    }
  };

  const disconnectWallet = async () => {
    if (onboard) {
      onboard.walletReset();
    }
  }

  const renderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) {
      // Render a complete state
      setIsStarted(true);
      return (
        <div>
          Count down is finished and You can mint now!
        </div>
      );
    } else {
      // Render a countdown
      return (
        <div className="count-down">
          WHITELIST SALE BEGINS IN<br />
          {days > 0 ? (<span className="count-box">{days}d</span>) : ''}
          <span className="count-box">{hours}</span>h
          <span className="count-box">{minutes}</span>m
          <span className="count-box">{seconds}</span>s <br />
        </div>
      );
    }
  };

  const shortenHex = (hex, length = 4) => {
    return `${hex.substring(0, length + 2)}…${hex.substring(
      hex.length - length
    )}`;
  }

  const [contract, setContract] = useState(null);
  const [maxTokenNumber, setMaxTokenNumber] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);

  async function estimateGas() {
    let responseValue;
    try {
      await axios.get(`https://ethgasstation.info/api/ethgasAPI.json?api-key=c94facbd2247d1a3d63557a1caf6d9e126c943e1a5294d0ccef18006651b`).then(res => {
        responseValue = res.data.average / 10;
      })
    } catch (e) {
      responseValue = 70;
    }
    return responseValue;
  }

  const mint = async (numberofTokens) => {
    if (contract) {
      console.log('contract', contract);
      let _totalSupply = await contract.totalSupply();
      setTotalSupply(Number(_totalSupply));
      const privateSale = await contract.privateSaleIsActive();
      let mintPrice = 0;
      if (privateSale) {
        mintPrice = await contract.privateMintPrice();
      } else {
        mintPrice = await contract.publicMintPrice();
      }
      const price = Number(mintPrice) * numberofTokens;
      setStatusShow(true);
      try {
        setMintFlag(true);
        let gas = 70;
        await estimateGas().then(function (res) {
          gas = res;
        });
        await contract.mint(numberofTokens, { from: walletAddress, value: String(price), gasPrice: ethers.utils.parseUnits(String(gas), 'gwei') }).then((result) => {
          console.log(result);
          setTotalSupply(totalSupply + numberofTokens);
          setMintCount(1);
          setMintFlag(false);
        })

      } catch (err) {
        setMintFlag(false);
        console.log('error minting:', err);
        if (err.constructor !== Object) {
          if (String(err).includes('"code":-32000')) {
            toast.error('Error: insufficient funds for intrinsic transaction cost');
          } else {

            let startingIndex = String(err).indexOf('"message"');
            let endingIndex = String(err).indexOf('"data"');
            let sub1 = String(err).substring(startingIndex, endingIndex);

            let sub2 = sub1.replace('"message":"', '');
            let ret = sub2.replace('",', '');
            toast.error(ret.charAt(0).toUpperCase() + ret.slice(1));
          }
        } else if (err.code === -32000) {
          toast.error('Gas price is changing rapidly. if you try to mint now, minting might fail. please try again after a few mins.');
        }
      }
    }
  };

  return (
    <div className="App">
      <div className="mint-page">
        <div>
          <img className="logo-icon" src={logo} />
        </div>
        <div className="mint-section container">
          <div className="row">
            <div className="col-md-12 mt-5">

              {
                !isStarted && (
                  <div className="mt-5">
                    <Countdown date={new Date("2022-02-03T17:00:00+0000")} renderer={renderer} />
                  </div>
                )
              }
              {
                isStarted && statusShow &&
                <h3>MINTED LACEDAMEON: {totalSupply}/{maxTokenNumber}</h3>
              }
              <h5 className={`black ${isStarted ? "mt-2" : "mt-5"}`}>
                1 LDMN costs 0.075 ETH <br />
                Excluding gas fees.
              </h5>
              {
                isStarted && (
                  <div>
                    <div className="qty mt-3">
                      <h4>Quantity:</h4>
                      <span className="minus bg-dark" onClick={(e) => setMintCount(mintCount > 1 ? mintCount - 1 : 1)}>-</span>
                      <input type="number" className="count" name="qty" value={mintCount} disabled />
                      <span className="plus bg-dark" onClick={(e) => setMintCount(mintCount < 5 ? mintCount + 1 : 5)}>+</span>
                    </div>
                  </div>
                )
              }
              {
                isStarted && walletConnected && (
                  <>
                    <div className="btn-wrapper mt-3">
                      <div className="btn-shadow"></div>
                      <a className="btn btn-primary btn-bold btn-connect" onClick={() => mint(mintCount)} disabled={mintFlag}>{mintFlag ? <i className="fa fa-spinner fa-spin"></i> : 'MINT'}</a>
                    </div>
                    <h5 className="mt-1">Connected Wallet: {walletAddr}</h5>
                    <a className="btn btn-primary btn-bold btn-disconnect mt-1" onClick={() => disconnectWallet()} >DISCONNECT</a>
                  </>
                )
              }
              {
                isStarted && !walletConnected && (
                  <>
                    <h5 className="mt-5">Connect to the Ethereum network</h5>
                    <div className="btn-wrapper mt-3">
                      <div className="btn-shadow"></div>
                      <a className="btn btn-primary btn-bold btn-connect" onClick={() => connectWallet()}>Connect Wallet</a>
                    </div>
                  </>
                )
              }

            </div>
          </div>
        </div>
        <div className="mint-footer">
          <h6>Make sure you are connected to right network! (Ethereum) Please note: All Minting Sales are FINAL!</h6>
          <h6>Gas limit is preset to 28500, Any Lower and you Risk loss of Gas Fee with a Failed transaction.</h6>
        </div>
      </div>
    </div>
  );
}

export default App;
