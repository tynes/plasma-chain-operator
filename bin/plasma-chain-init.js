#!/usr/bin/env node
const path = require('path')
const program = require('commander')
const colors = require('colors') // eslint-disable-line no-unused-vars
const inquirer = require('inquirer')
const getAccount = require('./utils.js').getAccount
const ethService = require('../src/eth-service.js')
const readConfigFile = require('../src/utils.js').readConfigFile

program
  .description('starts the operator using the first account')
  .option('-n, --newRegistry', 'Initialize a new Plasma Network in addition to a Plasma Chain')
  .action(async (none, cmd) => {
    const account = await getAccount()
    if (account === null) {
      return
    }
    // Get the config
    const configFile = (process.env.CONFIG) ? process.env.CONFIG : path.join(__dirname, '..', 'config.json')
    console.log('Reading config file from:', configFile)
    const config = readConfigFile(configFile)
    // Ask for a Plasma Chain name and ip address
    const chainMetadata = await setChainMetadata(config)
    console.log('Chain metadata:', chainMetadata)
    // Add the chain metadata to the config
    config.plasmaChainName = chainMetadata.chainName
    config.operatorIpAddress = chainMetadata.ipAddress
    // Initialize a new Plasma Chain
    config.privateKey = account.privateKey
    if (cmd.newRegistry === true) {
      config.plasmaRegistryAddress = 'DEPLOY'
    }
    await ethService.startup(config)
  })

async function setChainMetadata (config) {
  console.log('\n~~~~~~~~~plasma~~~~~~~~~chain~~~~~~~~~initialization~~~~~~~~~'.rainbow)
  console.log("\nBefore we deploy your new Plasma Chain, I'll need to ask a couple questions.".white)
  const plasmaChainMetadata = {}
  // Get the Plasma Chain name
  const chainName = await getPlasmaChainName(config)
  Object.assign(plasmaChainMetadata, chainName)
  // Set the hostname
  console.log('\nWhat is your IP address? Or a domain name that points to your IP.\n'.white, 'WARNING:'.yellow, 'This IP address will be posted to the Ethereum blockchain.'.white)
  const hostResponse = await inquirer.prompt([{
    type: 'input',
    name: 'ipAddress',
    default: (config.operatorIpAddress === undefined) ? '' : config.operatorIpAddress,
    message: 'Your IP address or hostname:'
  }])
  Object.assign(plasmaChainMetadata, hostResponse)
  return plasmaChainMetadata
}

async function getPlasmaChainName (config) {
  console.log('\nWhat is the name of your new Plasma Chain?\nThis will be displayed in the'.white, 'Plasma Network Explorer'.green, '--'.white, 'http://plasma.run'.blue)
  const chainNameResponse = await inquirer.prompt([{
    type: 'input',
    name: 'chainName',
    message: "Your Plasma Chain's Name:",
    default: (config.plasmaChainName === undefined) ? '' : config.plasmaChainName,
    validate: (input) => {
      if (input.length < 3) {
        console.log('Error!'.red, 'Plasma Chain Name is too short!')
        return false
      } else if (Buffer.from(input, 'utf8').length > 32) {
        console.log('Error!'.red, 'Plasma Chain Name is too long!')
        return false
      }
      return true
    }
  }])
  return chainNameResponse
}

program.parse(process.argv)
