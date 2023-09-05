const WebSocket = require('ws')
const EventEmitter = require('events');
const unified = require('./unified')

let log, token, username, password
let commandId = 0
const waitTime = 3000

module.exports = async function (platform) {

	return new Promise((resolve) => {
		log = platform.log
		username = platform.username
		password = platform.password
		
		const eventEmitter = new EventEmitter();
		const WebsocketURL = `ws://${platform.ip}:7891`
		let connection = new WebSocket(WebsocketURL)

		connection.onerror = (error) => {
			log(`WebSocket error: ${JSON.stringify(error)}`)
			log(`Connecting again in 5 seconds`)
			setTimeout(() => {
				connection = new WebSocket(WebsocketURL)
			}, 5000)
		}
		connection.onmessage = (e) => {
			processMessage(e.data)
		}

		connection.onopen = () => {
			log(`WebSocket Connected Successfully`)
			resolve(websocketApi)
		}
		
		function processMessage(message) {
			message = JSON.parse(message)
			log.easyDebug(`New Message from Websocket: ${JSON.stringify(message)}`)
			if ('commandId' in message)
				eventEmitter.emit(`command_${message.commandId}`, message);
			else if (message.notificationType === 'CONFIGURATION_CHANGE') {
				const messageValue = message.newValue != null ? message.newValue : message.data
				log.easyDebug(`Status Change Notification for device ${message.name}(${message.id}):`)
				log.easyDebug(messageValue)
				if (message.id in platform.connectedDevices) {
					const device = platform.connectedDevices[message.id]
					if (device && unified.state[device.type] && messageValue !== -1) {
						device.updateHomeKit(unified.state[device.type](messageValue, device))
					}
				} else {
					log.easyDebug(`Device is not recognized: ${message.name}(${message.id})`)
				}
			}


		}

		function request(command, params) {
			// eslint-disable-next-line no-async-promise-executor
			return new Promise(async (resolve, reject) => {
				let requestToken
				try {
					requestToken = await getToken()
				} catch (err) {
					log('The plugin was NOT able to find stored token or acquire one from SwitchBee Central Unit !!')
					reject(err)
					return
				}
				
				// if (params)
				// 	log.easyDebug('params: ' +JSON.stringify(params))
		
				commandId ++ 
				const thisCommand = commandId
				log.easyDebug(`Creating WebSocket ${command} request(${thisCommand}) to SwitchBee Central Unit --->`)
				const message = JSON.stringify({ commandId: thisCommand, token: requestToken, command, params })
				log.easyDebug(`WebSocket message to send: ${message}`)
				connection.send(message)
				const waitingTimeout = setTimeout(() => {
					const error = `ERROR: No response from websocket after ${waitTime}ms for request ${thisCommand}`
					eventEmitter.removeAllListeners(`command_${thisCommand}`)
					reject(error)

				}, waitTime)
				eventEmitter.once(`command_${thisCommand}`, (data) => {
					clearTimeout(waitingTimeout)
					if (data.status === 'OK') {
						const json = data.data
						log.easyDebug(`Successful response!`)
						// log.easyDebug(JSON.stringify(json))
						resolve(json)
					} else {
						const error = `Could NOT complete the request -> ERROR: "${JSON.stringify(data)}"`
						// log.error(error)
						if (data.status && typeof data.status === 'string' && data.status.includes('TOKEN')) {
							token = null
							setTimeout(() => {
								log(`retrying command`)
								resolve(request(command, params))
							}, 1000)
						} else
							reject(error)
					}
					
				});
			})
		}
		
		function getToken() {
			// eslint-disable-next-line no-async-promise-executor
			return new Promise(async (resolve, reject) => {
				
				if (token && new Date().getTime() < (token.expirationDate - 3000)) {
					log.easyDebug(`Found valid token in cache ${token.key}`)
					resolve(token.key)
					return
				}
			
				let params = {
					username: username,
					password: password
				}

				commandId ++ 
				const thisCommand = commandId
				log.easyDebug(`Creating WebSocket token request(${thisCommand}) to SwitchBee Central Unit --->`)
				const message = JSON.stringify({ commandId: thisCommand, command: 'LOGIN', params })
				connection.send(message)
				const waitingTimeout = setTimeout(() => {
					log(`ERROR: No response from websocket after ${waitTime}ms for token request ${thisCommand}`)
					eventEmitter.off(`command_${thisCommand}`)
				}, waitTime)
				eventEmitter.once(`command_${thisCommand}`, (data) => {
					clearTimeout(waitingTimeout)
					if (data.status === 'OK') {
						token = {
							key: data.data.token,
							expirationDate: data.data.expiration
						}
						log.easyDebug('Token successfully acquired from Central Unit')
						// log.easyDebug(token)
						resolve(token.key)
					} else {
						const error = `Could NOT complete the token request -> ERROR: "${JSON.stringify(data)}"`
						// log(error)
						reject(error)
					}
				})
			})
		}

		const websocketApi =  {

			getDevices: async () => {
				try {
					const devices = {}
					const configurations = await request('GET_CONFIGURATION')
					configurations.zones.forEach(zone => {
						zone.items.forEach(item => {
							devices[item.id] = {
								...item,
								zone: zone.name
							}
						})
					})
					return devices
				} catch(err) {
					log(`Failed to get devices configurations!!`)
					throw err
				}
			},

			getState: async (ids) => {
				try {
					ids = ids.map(id => parseInt(id))
					const state = {}
					const devices = await request('GET_MULTIPLE_STATES', ids)
					devices.forEach(device => {
						state[device.id] = device.state
					})
					return state
				} catch(err) {
					log(`Failed to get devices state!!`)
					throw err
				}
			},

			setDeviceState: async (id, state) => {
				const params = {
					directive: 'SET',
					itemId: id,
					value: state
				}
				return await request('OPERATE', params)
			}
		}
	})
}
