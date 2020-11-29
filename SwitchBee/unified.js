const fanLevels = ['LOW', 'MEDIUM', 'HIGH']

function fanLevelToHK(value, fanLevels) {
	if (value === 'AUTO')
		return 0

	const totalLevels = fanLevels.length
	const valueIndex = fanLevels.indexOf(value) + 1
	return Math.round(100 * valueIndex / totalLevels)
}

function HKToFanLevel(value, fanLevels) {

	let selected = 'AUTO'
	// if (!fanLevels.includes('auto'))
	// 	selected = fanLevels[0]

	if (value !== 0) {
		// fanLevels = fanLevels.filter(level => level !== 'auto')
		const totalLevels = fanLevels.length
		for (let i = 0; i < fanLevels.length; i++) {
			if (value <= (100 * (i + 1) / totalLevels))	{
				selected = fanLevels[i]
				break
			}
		}
	}
	return selected
}

// function toFahrenheit(value) {
// 	return Math.round((value * 1.8) + 32)
// }


// function toCelsius(value) {
// 	return (value - 32) / 1.8
// }

module.exports = {

	deviceInformation: device => {
		return {
			id: device.id,
			model: device.hw,
			installation: device.type,
			roomName: device.zone,
			serial: device.hw + '_ID' + device.id,
			manufacturer: 'SwitchBee',
			name: device.name
		}
	},

	// capabilities: device => {

	// 	const capabilities = {}

	// 	for (const [key, modeCapabilities] of Object.entries(device.remoteCapabilities.modes)) {

	// 		// Mode options are COOL, HEAT, AUTO, FAN, DRY
	// 		const mode = key.toUpperCase()

	// 		capabilities[mode] = {}

	// 		// set temperatures min & max
	// 		if (['COOL', 'HEAT', 'AUTO'].includes(mode) && modeCapabilities.temperatures && modeCapabilities.temperatures.C) {
	// 			capabilities[mode].temperatures = {
	// 				C: {
	// 					min: modeCapabilities.temperatures.C.values[0],
	// 					max: modeCapabilities.temperatures.C.values[modeCapabilities.temperatures.C.values.length - 1]
	// 				},
	// 				F: {
	// 					min: modeCapabilities.temperatures.F.values[0],
	// 					max: modeCapabilities.temperatures.F.values[modeCapabilities.temperatures.F.values.length - 1]
	// 				}
	// 			}
	// 		}

	// 		// set fanSpeeds
	// 		if (modeCapabilities.fanLevels && modeCapabilities.fanLevels.length) {
	// 			capabilities[mode].fanSpeeds = modeCapabilities.fanLevels

	// 			// set AUTO fanSpeed
	// 			if (capabilities[mode].fanSpeeds.includes('auto'))
	// 				capabilities[mode].autoFanSpeed = true
	// 			else
	// 				capabilities[mode].autoFanSpeed = false
				
	// 		}
	// 	}

	// 	return capabilities
	// },

	state:  {
		Switch: (state) => {
			return {
				On: (state && state !== 'OFF')
			}
		},

		Dimmer: (state) => {
			return {
				On: (state && state !== 'OFF' && state !== 0),
				Brightness: (state && state !== 'OFF' && state !== 0) ? state : 0
			}
		},

		Outlet: (state) => {
			return {
				On: (state && state !== 'OFF')
			}
		},
		
		Lock: (state) => {
			return {
				LockState: (state && state !== 'OFF') ? 0 : 1
			}
		},
		
		Shutter: (state, device) => {
			return {
				CurrentPosition: (state && state !== 'OFF'  && state > 0) ? state : 0,
				TargetPosition: (state && state !== 'OFF'  && state > 0) ? state : 0,
				PositionState: device.positionState
			}

		},
		
		Valve: (state) => {
			return {
				Active: (state && state !== 'OFF') ? 1 : 0,
				RemainingDuration: (state && state !== 'OFF'  && state > 0) ? state * 60 : 0
			}

		},

		Thermostat: (state) => {
			return {
				Active: (state.power && state.mode !== 'FAN') ? 1 : 0,
				mode: state.mode,
				targetTemperature: state.configuredTemperature,
				currentTemperature: state.roomTemperature,
				fanSpeed: fanLevelToHK(state.fan, fanLevels)
			}
		}

	},

	setState: (device, state) => {

		switch(device.installation) {
			case 'SWITCH': 
			case 'TIMED_SWITCH':
				switch (device.type) {
					case 'Lock':
						return (state.LockState ? 'OFF' : 'ON')
					default:
						return (state.On ? 'ON' : 'OFF')
				}

			case 'TIMED_POWER':
				switch (device.type) {
					case 'Lock':
						return (!state.LockState ? device.duration/60 : 0)
					case 'Valve':
						return (state.Active ? device.duration/60 : 0)
					default:
						return (state.On ? device.duration/60 : 0)
				}

			case 'DIMMER':
				return (state.On ? state.Brightness : 0)

			case 'SHUTTER':
				return state.TargetPosition

			case 'THERMOSTAT':
				return {
					power: state.Active ? 'ON' : 'OFF',
					mode: state.mode,
					fan:  HKToFanLevel(state.fanSpeed, fanLevels),
					configuredTemperature: state.targetTemperature
				}
		}
	}
}