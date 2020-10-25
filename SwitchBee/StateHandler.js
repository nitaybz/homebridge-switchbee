const unified = require('./unified')

module.exports = (device, platform) => {

	const setTimeoutDelay = 100
	let setTimer = null
	let preventTurningOff = false
	const SwitchBeeApi = platform.SwitchBeeApi

	const log = platform.log
	// const state = device.state

	return {
		get: (target, prop) => {
			// check for last update and refresh state if needed
			if (!platform.setProcessing)
				platform.refreshState()

			// return a function to update state (multiple properties)
			if (prop === 'update')
				return (state) => {
					if (!platform.setProcessing) {
						Object.keys(state).forEach(key => { target[key] = state[key] })
						device.updateHomeKit()
					}
				}

			return target[prop]
		},
	
		set: (state, prop, value) => {
			
			if (prop in state && state[prop] === value)
				return

			state[prop] = value
			

			platform.setProcessing = true

			// Make sure device is not turning off when setting fanSpeed to 0 (AUTO)
			if (prop === 'fanSpeed' && value === 0)
				preventTurningOff = true
				
			
			clearTimeout(setTimer)
			setTimer = setTimeout(async function() {
				// Make sure device is not turning off when setting fanSpeed to 0 (AUTO)
				if (preventTurningOff && !state.Active) {
					state.Active = 1
					preventTurningOff = false
				}
		
				const newState = unified.setState(device, state)
				log(device.name, ' -> Setting New State:')
				log(JSON.stringify(newState, null, 2))
				
				try {
					// send state command to Sensibo
					await SwitchBeeApi.setDeviceState(device.id, newState)
				} catch(err) {
					log(`ERROR setting ${prop} to ${value}`)
					setTimeout(() => {
						platform.setProcessing = false
						platform.refreshState()
					}, 1000)
					return
				}
				setTimeout(() => {
					device.updateHomeKit()
					platform.setProcessing = false
				}, 500)

			}, setTimeoutDelay)

			return true
		}
	}
}