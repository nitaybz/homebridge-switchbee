const axios = require('axios')
const https = require('https')
const compareVersions = require('compare-versions').compare
let log, token, username, password, storage

module.exports = async function (platform) {
	log = platform.log
	username = platform.username
	password = platform.password
	storage = platform.storage

	token = await storage.getItem('switchbee-token')
	
	axios.defaults.baseURL = 'https://' + platform.ip
	axios.defaults.httpsAgent = new https.Agent({
		rejectUnauthorized: false
	})
	
	return {
	
		getVersion: async () => {
			try {
				log.easyDebug(`Getting version from the device`)
				const configurations = await request('GET_CONFIGURATION')
				const version = configurations.version
				log.easyDebug(`Found Version ${version}`)
				const modifiedVersion = version.replace('(', '.').replace(')', '')
				const newerVersion = '1.4.6.2'
				const isNew = compareVersions(modifiedVersion, newerVersion, '>')
				return { version, isNew }
			} catch(err) {
				log(`Failed to get devices configurations!!`)
				throw err
			}
		},
	
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
		
	
		log.easyDebug(`Creating ${command} request to SwitchBee Central Unit --->`)
		
		if (params)
			log.easyDebug('params: ' +JSON.stringify(params))

		axios.post('/commands', { token: requestToken, command, params })
			.then(response => {
				const data = response.data
				if (data.status === 'OK') {
					const json = data.data
					log.easyDebug(`Successful response:`)
					log.easyDebug(JSON.stringify(json))
					resolve(json)
				} else {
					const error = `Could NOT complete the request -> ERROR: "${JSON.stringify(data)}"`
					// log(error)
					reject(error)
					if (data.status && typeof data.status === 'string' && data.status.includes('TOKEN'))
						token = null
				}
			})
			.catch(err => {
				log(`ERROR: ${err.message}`)
				if (err.response)
					log.easyDebug(err.response.data)
				reject(err)
			})
	})
}

function getToken() {
	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve, reject) => {
		
		if (token && new Date().getTime() < (token.expirationDate - 3000)) {
			// log.easyDebug('Found valid token in cache')
			resolve(token.key)
			return
		}
	
		let data = {
			command: 'LOGIN',
			params: {
				username: username,
				password: password
			}
		}

		axios.post('/commands', data)
			.then(async response => {
				const data = response.data
				if (data.status === 'OK') {
					token = {
						key: data.data.token,
						expirationDate: data.data.expiration
					}
					await storage.setItem('switchbee-token', token)
					log.easyDebug('Token successfully acquired from Central Unit')
					// log.easyDebug(token)
					resolve(token.key)
				} else {
					const error = `Could NOT complete the token request -> ERROR: "${JSON.stringify(data)}"`
					log(error)
					reject(error)
				}
			})
			.catch(err => {
				// log(`Could NOT complete the token request -> ERROR: ${err.message}`)
				if (err.response)
					log.easyDebug(err.response.data)
				reject(err)
			})
	})
}