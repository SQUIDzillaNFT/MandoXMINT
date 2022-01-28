import './App.css';
import 'font-awesome/css/font-awesome.min.css';
// import './styles/w3.css';
import logo from './images/logo.png';
import imgMetamask from './images/metamask-logo.svg';
import imgWalletConnect from './images/walletconnect.svg';
import React, { useState, useEffect } from "react";
import {
  Button
} from "reactstrap";

import { Modal } from "react-bootstrap";
import axios from 'axios';

import { useWeb3React, Web3ReactProvider } from '@web3-react/core';
import { getLibrary, connectorsByName, resetWalletConnector } from './utils/web3React';
import LaceContract from './contract/Lacedameon.json';
import { useContract, useContractCallData } from "./utils/hooks";
import { ethers, utils } from "ethers";
import Countdown from "react-countdown";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Web3 from 'web3';

function App() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <MainComponent />
      <ToastContainer autoClose={5000} hideProgressBar />
    </Web3ReactProvider>
  )
}

function MainComponent() {
  const [walletConnectionModalShow, setWalletConnectionModalShow] = useState(false);
  const [installMetamaskModalShow, setInstallMetamaskModalShow] = useState(false);
  const [walletAddr, setWalletAddr] = useState("");
  const { account, library, activate, deactivate, active, chainId } = useWeb3React();
  const [currentConnectorName, setCurrentConnectorName] = useState(null);

  // mandox
  const [isStarted, setIsStarted] = useState(false);
  const [statusShow, setStatusShow] = useState(false);
  const [mintCount, setMintCount] = useState(1);
  const [mintFlag, setMintFlag] = useState(false);

  const connectWallet = () => {
    setWalletConnectionModalShow(true);
  };

  useEffect(() => {
    const connectorId = window.localStorage.getItem('currentConnector');
    if (connectorId) {
      activate(connectorsByName[connectorId]);
      setCurrentConnectorName(connectorId);
    }
  }, [])

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

  useEffect(() => {
    let walletAddress = "";
    if (account !== undefined) {
      walletAddress = account
      setWalletAddr(
        shortenHex(walletAddress)
      );
    }
    else walletAddress = ""
  }, [account]);

  const [contract, setContract] = useState(null);
  const [maxTokenNumber, setMaxTokenNumber] = useState(0);
  const [totalSupply, setTotalSupply] = useState(0);

  useEffect(() => {
    if (chainId && LaceContract.networks && LaceContract.networks[chainId]) {
      async function loadData() {
        if (!!(library && account) && currentConnectorName) {
          window.localStorage.setItem('currentConnector', currentConnectorName);
          const signer = library.getSigner(account).connectUnchecked();
          let nftcontract = new ethers.Contract(LaceContract.networks[chainId].address, LaceContract.abi, signer);
          if (nftcontract) {
            setContract(nftcontract);
            try {
              let _maxTokenNumber = await nftcontract.MAX_ELEMENTS();
              setMaxTokenNumber(Number(_maxTokenNumber));
              let _totalSupply = await nftcontract.totalSupply();
              setTotalSupply(Number(_totalSupply));
              setStatusShow(true);
            } catch (ex) {
              console.log(`failed call contract method MAX_ELEMENT: `, ex)
            }
          }
        }
      }
      loadData();
    }
  }, [library, account, chainId])


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

  const connectMetamask = () => {
    if (typeof window.web3 !== 'undefined') {
      window.web3 = new Web3(window.ethereum);

    } else {
      setInstallMetamaskModalShow(true);
      return;
    }
    setWalletConnectionModalShow(false);
    window.ethereum.enable()
      .then(function (accounts) {
        window.web3.eth.net.getNetworkType()
          // checks if connected network is mainnet (change this to rinkeby if you wanna test on testnet)
          .then((network) => {
            console.log(network);
            if (network !== "rinkeby") {
              toast.error("You are on " + network + " network. Change network to Ethereum Mainnet or you won't be able to do anything here");
            } else {
              activate(connectorsByName["Injected"]);
              setCurrentConnectorName("Injected");
            }
          });
      })
      .catch(function (error) {
        // Handle error. Likely the user rejected the login
        console.error(error)
      })
  }

  const mint = async (numberofTokens) => {
    if (contract) {
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
      try {
        setMintFlag(true);
        let gas = 70;
        await estimateGas().then(function (res) {
          gas = res;
        });


        await contract.mint(numberofTokens, { from: account, value: String(price), gasPrice: ethers.utils.parseUnits(String(gas), 'gwei') }).then((result) => {
          console.log(result);
          setTotalSupply(totalSupply + numberofTokens);
          setMintCount(1);
          setMintFlag(false);
        })

      } catch (err) {
        setMintFlag(false);
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
                    <Countdown date={new Date("2022-01-26 12:00:00 CST")} renderer={renderer} />
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
                isStarted && !!(library && account) && (
                  <>
                    <h5 className="mt-5">Connected Wallet: {walletAddr}</h5>
                    <div className="btn-wrapper mt-3">
                      <div className="btn-shadow"></div>
                      <a className="btn btn-primary btn-bold btn-connect" onClick={() => mint(mintCount)} disabled={mintFlag}>{mintFlag ? <i class="fa fa-spinner fa-spin"></i> : 'MINT'}</a>
                    </div>
                  </>
                )
              }
              {
                isStarted && !(library && account) && (
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
          <h6>Make sure you are connected to right network! (Ethereum) Please note: All Mintings are Final Sales</h6>
          <h6>Gas limit is preset to 28500, Any Lower and you Risk loss of gas with a Failed transactions.</h6>
        </div>
      </div>

      {/* WalletConnection Modal */}
      <Modal
        className="wallet-connection"
        show={walletConnectionModalShow}
        onHide={() => setWalletConnectionModalShow(false)}
      >
        <Modal.Header>
          <Modal.Title>CONNECT TO A WALLET</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Button
            className="metamask-btn"
            variant="primary"
            onClick={() => {
              if (!window.ethereum) {
                setWalletConnectionModalShow(false);
                setInstallMetamaskModalShow(true);
              } else {
                connectMetamask();

              }
            }}
          >
            <img src={imgMetamask} alt="" />
            METAMASK
          </Button>
          <Button
            className="walletconnection-btn"
            variant="primary"
            onClick={() => {
              resetWalletConnector(connectorsByName["WalletConnect"]);
              activate(connectorsByName["WalletConnect"]);
              setCurrentConnectorName("WalletConnect");
              setWalletConnectionModalShow(false);
            }}
          >
            <img src={imgWalletConnect} alt="" />
            WALLET CONNECT
          </Button>
        </Modal.Body>
      </Modal>
      {/* Install Metamask Modal */}
      <Modal
        className="info-modal"
        show={installMetamaskModalShow}
        onHide={() => setInstallMetamaskModalShow(false)}
      >
        <Modal.Header>
          <Modal.Title>Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-center">
            Please install metamask extension on your browser.
          </p>
          <a href="https://metamask.io/download/" target="_blank">Open Metamask</a>
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default App;
