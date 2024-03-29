const fanLevels = ['LOW', 'MED', 'HIGH']

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

	state:  {
		Switch: (state) => {
			return {
				On: !!(state && state !== 'OFF' && state !== -1 && state !== 'OFFLINE')
			}
		},

		Dimmer: (state) => {
			return {
				On: !!(state && state !== 'OFF' && state !== 0 && state !== -1 && state !== 'OFFLINE'),
				Brightness: (state && state !== 'OFF' && state !== 0 && state !== -1 && state !== 'OFFLINE') ? state : 0
			}
		},

		Outlet: (state) => {
			return {
				On: !!(state && state !== 'OFF' && state !== -1 && state !== 'OFFLINE')
			}
		},
		
		Lock: (state) => {
			return {
				LockState: (state && state !== 'OFF' && state !== -1 && state !== 'OFFLINE') ? 0 : 1
			}
		},
		
		Shutter: (state, device) => {
			return {
				CurrentPosition: (state && state !== 'OFF' && state !== -1 && state !== 'OFFLINE') ? state : 0,
				TargetPosition: (state && state !== 'OFF' && state !== -1 && state !== 'OFFLINE') ? state : 0,
				PositionState: device.positionState
			}

		},

		Valve: (state) => {
			return {
				Active: (state && state !== 'OFF' && state !== -1 && state !== 'OFFLINE') ? 1 : 0,
				RemainingDuration: (state && state !== 'OFF'  && state > 0 && state !== -1 && state !== 'OFFLINE') ? state * 60 : 0
			}

		},

		Thermostat: (state) => {
			return {
				Active: (state.mode !== 'FAN' && state.power !== 'OFF') ? 1 : 0,
				mode: state.mode || 'COOL',
				TargetTemperature: state.configuredTemperature || 25,
				CurrentTemperature: state.roomTemperature || 25,
				fanSpeed: state.fan ? (fanLevelToHK(state.fan, fanLevels) || 0) : 0
			}
		},

		Sensor: (state) => {
			return {
				trigger: state.trigger ? 1 : 0,
				lowVoltage: state.lowVoltage ? 1 : 0,
				tampered: state.tampered ? 1 : 0
			}
		}

	},

	setState: (device, state) => {

		switch(device.installation) {
			case 'SWITCH':
			case 'TIMED_SWITCH':
			case 'GROUP_SWITCH':
			case 'LOCK_GROUP':
			case 'SCENARIO':
			case 'ROLLING_SCENARIO':
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

			case 'SOMFY':
				return state

			case 'THERMOSTAT':
			case 'VRF_AC':
				return {
					power: state.Active ? 'ON' : 'OFF',
					mode: state.mode,
					fan:  HKToFanLevel(state.fanSpeed, fanLevels),
					configuredTemperature: state.TargetTemperature
				}
				
			case 'IR_DEVICE':
				return state
		}
	}
}