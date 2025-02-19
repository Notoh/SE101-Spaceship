import Vector2 from '../helpers/Vector2.js'
import Asteroid from '../spaceObjects/asteroid.js'
import WarpGate from '../spaceObjects/warpGate.js'
import Planet from '../spaceObjects/planet.js'
import AsteroidLauncher from '../spaceObjects/asteroidLauncher.js'
import Game from '../game.js'
import Star from '../spaceObjects/star.js'

const SolarSystemNames = [
	'Tutorial',
	'Goose',
	'Waterloo',
	'StackOverflow',
	'Hargun',
	'Olivia',
	'Derek',
	'Ali',
	'ECE105',
	'Torvalds',
	'Zac',
	'Josiah',
	'Elon',
	'Gates',
	'Turing'
] as const

export type SolarSystemName = typeof SolarSystemNames[number]
export default class SolarSystem {
	shipStartPosition = new Vector2(300, 300)
	warpGates: WarpGate[]
	planets: Planet[]
	asteroids: Asteroid[]
	star?: Star
	asteroidLaunchers: AsteroidLauncher[]
	game: Game
	name: SolarSystemName
	galaxyName: string
	planetNames: string[]
	warpGateNames: string[]
	constructor(solarSystemName: SolarSystemName, galaxyName: string, game: Game, objects: {
		asteroids?: Asteroid[],
		warpGates?: WarpGate[],
		planets?: Planet[],
		asteroidLaunchers?: AsteroidLauncher[],
		star?: Star
	}) {
		this.game = game
		this.galaxyName = galaxyName
		this.name = solarSystemName
		this.asteroids = objects.asteroids ?? []
		this.warpGates = objects.warpGates ?? []
		this.planets = objects.planets ?? []
		this.asteroidLaunchers = objects.asteroidLaunchers ?? []
		this.star = objects.star
		this.planetNames = this.planets.map((planet) => planet.name)
		this.warpGateNames = this.warpGates.map((warpGate) => warpGate.destinationSolarSystem)
	}
	activate() {}
}
