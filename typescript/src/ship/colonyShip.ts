import Vector2 from '../helpers/Vector2.js'
import Sprite from '../sprite.js'
import PassiveSensors from './passiveSensors.js'
import ActiveSensors from './activeSensors.js'
import TurretControls from './turretControls.js'
import ThrusterController from './thrusterController.js'
import DefenceController from '../subsystems/defenceController.js'
import NavigationController from '../subsystems/navigationController.js'
import PropulsionController from '../subsystems/propulsionController.js'
import SensorsController from '../subsystems/sensorsController.js'
import WarpGate from '../spaceObjects/warpGate.js'
import Planet from '../spaceObjects/planet.js'
import Process from '../gameProcess.js'
import Game from '../game.js'
import { ShipStatus } from './shipStatus.js'
import SolarSystem from '../galaxies/solarSystem.js'
import Torpedo from './torpedo.js'
import { getMapData } from './mapData.js'

export default class ColonyShip extends Sprite {
	/* Constructor Params */
	name: string //Ship name
	process: Process //Process in which the ship is currently rendering
	solarSystem: SolarSystem //Current solar system object

	/* SubSystem Controllers */
	defenceController: DefenceController //Defence Subsystem
	navigationController: NavigationController //Navigation Subsystem
	propulsionController: PropulsionController //Propulsion subsystem
	sensorsController: SensorsController //Sensors subsystem

	/* Components */
	turretControls: TurretControls //Implementation of torpedo functions
	thrusterController: ThrusterController //Implementation of thruster functions
	passiveSensors: PassiveSensors //Passive sensors
	activeSensors: ActiveSensors //Active sensors

	/* Other info */
	totalDamage = 0
	energyUsed = 0
	primary = false
	torpedoesFired = 0
	size = new Vector2(30, 20)
	hasLanded = false
	ctx = 'ships'
	mass = 3
	maxASpeed = 0.3
	maxSpeed = 5
	energyTimeCount = 0
	destructed = false

	constructor(
		name: string,
		process: Process,
		DefenceClass: typeof DefenceController,
		NavigationClass: typeof NavigationController,
		PropulsionClass: typeof PropulsionController,
		SensorsClass: typeof SensorsController,
		...args: [pos: Vector2, game: Game]
	) {
		super(...args) //parent constructor
		this.name = name
		this.process = process

		this.defenceController = new DefenceClass()
		this.navigationController = new NavigationClass()
		this.propulsionController = new PropulsionClass()
		this.sensorsController = new SensorsClass()

		//Initialize each subsystem to give them access to each other.
		this.defenceController.initializeConnection(undefined, this.navigationController, this.propulsionController, this.sensorsController)
		this.navigationController.initializeConnection(this.defenceController, undefined, this.propulsionController, this.sensorsController)
		this.propulsionController.initializeConnection(this.defenceController, this.navigationController, undefined, this.sensorsController)
		this.sensorsController.initializeConnection(this.defenceController, this.navigationController, this.propulsionController, undefined)

		this.turretControls = new TurretControls(this, this.pos, this.game)
		this.passiveSensors = new PassiveSensors(this, this.game)
		this.activeSensors = new ActiveSensors(this, this.game)
		this.thrusterController = new ThrusterController(this, this.game)

		this.image = this.game.images['ship']
		this.radius = (this.size.x + this.size.y) / 4 // we say the hurt box is avg of width and height
		if (!this.process.game.galaxy) throw Error('Galaxy not found')
		this.solarSystem = this.process.solarSystem
	}
	update() {
		if (this.destructed) return
		this.energyTimeCount++
		if (this.energyTimeCount > 4) {
			this.energyUsed += 0.02
			this.energyTimeCount = 0
		}

		if (this.primary && !this.thrusterController.manualControlDisabled) this.manualControls() //use the data from keyboard control for testing
		const thusterAccels = this.thrusterController.getAccel()
		this.aAccel = thusterAccels.angular
		this.accel = thusterAccels.linear

		try {
			this.defenceController.defenceUpdate(this.turretControls.aimTurret.bind(this.turretControls), this.turretControls.getTubeCooldown.bind(this.turretControls), this.turretControls.fireTorpedo.bind(this.turretControls))
			this.sensorsController.sensorsUpdate(this.activeSensors.scan.bind(this.activeSensors), this.passiveSensors.scan.bind(this.passiveSensors))
			this.navigationController.navigationUpdate(this.getShipStatus.bind(this), this.tryWarp.bind(this), this.tryLand.bind(this), () => getMapData(this))
			this.propulsionController.propulsionUpdate(this.thrusterController.setThruster.bind(this.thrusterController))
		} catch (e) {
			console.error(`Code malfunction on ship ${this.name}: ${e}. \n Self destructing.`)
			this.selfDestruct()
		}
		this.boundaries()
		this.activeSensors.update()
		this.passiveSensors.update()
		super.update() //parent update;
		this.turretControls.update()
		this.thrusterController.update()
	}
	getShipStatus(key: keyof ShipStatus) {
		this.energyUsed += 0.1
		return {
			positionX: this.pos.x,
			positionY: this.pos.y,
			radius: this.radius,
			linearVelocityX: this.speed.x,
			linearVelocityY: this.speed.y,
			angularVelocity: this.aSpeed,
			angle: this.angle,
			thrusterPowerMain: this.thrusterController.thrusterPower.main,
			thrusterPowerBow: this.thrusterController.thrusterPower.bow,
			thrusterPowerClockwise: this.thrusterController.thrusterPower.clockwise,
			thrusterPowerCounterClockwise: this.thrusterController.thrusterPower.counterClockwise,
		}[key]
	}
	manualControls() {
		if (!this.game.inputs) throw Error('Game inputs not defined')
		if (this.game.inputs.pressed.left) {
			this.thrusterController.thrusterPower.counterClockwise = 100
			this.thrusterController.thrusterPower.clockwise = 0
		} else if (this.game.inputs.pressed.right) {
			this.thrusterController.thrusterPower.clockwise = 100
			this.thrusterController.thrusterPower.counterClockwise = 0
		} else {
			this.thrusterController.thrusterPower.clockwise = 0
			this.thrusterController.thrusterPower.counterClockwise = 0
		}
		if (this.game.inputs.pressed.up) {
			this.thrusterController.thrusterPower.main = 100
			this.thrusterController.thrusterPower.bow = 0
		} else if (this.game.inputs.pressed.down) {
			this.thrusterController.thrusterPower.bow = 100
			this.thrusterController.thrusterPower.main = 0
		} else {
			this.thrusterController.thrusterPower.bow = 0
			this.thrusterController.thrusterPower.main = 0
		}
	}
	boundaries() {
		if (this.pos.y > this.game.height) {
			//y pos bounds
			this.pos.y = this.game.height
			this.speed.y = 0
			this.accel.y = 0
		} else if (this.pos.y < 0) {
			this.pos.y = 0
			this.speed.y = 0
			this.accel.y = 0
		}
		if (this.pos.x > this.game.width) {
			// x pos bounds
			this.pos.x = this.game.width
			this.speed.x = 0
			this.accel.x = 0
		} else if (this.pos.x < 0) {
			this.pos.x = 0
			this.speed.x = 0
			this.accel.x = 0
		}
		//Max speeds
		if (this.speed.magnitude() > this.maxSpeed) {
			this.speed = this.speed.scaleTo(this.maxSpeed)
		}
		if (this.aSpeed > this.maxASpeed) {
			this.aSpeed = this.aSpeed = this.maxASpeed
		}
		if (this.aSpeed < -this.maxASpeed) {
			this.aSpeed = this.aSpeed = -this.maxASpeed
		}
	}
	// called when ship hits an asteroid
	receiveDamage(amount: number) {
		this.totalDamage += amount
	}

	tryFire() {
		this.turretControls.aimTurret(this.angle)
		for (let i = 0; i < 4; i++) {
			if (!this.turretControls.fireTorpedo(i)) break
		}
	}

	tryWarp(): Error | null {
		this.energyUsed += 50
		this.process.solarSystem.warpGates.forEach((warpGate: WarpGate) => {
			if (this.game.ifCollide(this, warpGate)) {
				warpGate.warp(this)
				this.receiveDamage(this.speed.magnitude())
				return null
			}
		})
		return new Error('No warp gates in range')
	}

	tryLand(): Error | null {
		this.energyUsed += 20
		this.process.solarSystem.planets.forEach((planet: Planet) => {
			if (this.game.ifCollide(this, planet)) {
				const speedMag = this.speed.magnitude()
				if (speedMag > 2) {
					return new Error('Too fast! Your speed was: ' + speedMag)
				} else {
					this.receiveDamage(speedMag * 10)
					if (speedMag > 0.5) console.log(`Ouch! You crash landed and took ${speedMag * 10} damage`)
					this.land(planet)
					return null
				}
			}
		})
		return new Error('No planets in range')
	}

	land(planet: Planet) {
   		this.game.landSuccessful(planet)
	}

	draw() {
		if (this.destructed) return
		this.activeSensors.draw()
		this.passiveSensors.draw()
		super.draw()
		this.turretControls.draw()
		this.thrusterController.draw()
	}

	selfDestruct() {
		const explosion = new Torpedo(Vector2.zero, this.pos, this.game)
		explosion.explode()
		this.process.spawnDeletableObject(explosion)
		this.destructed = true
	}
}
