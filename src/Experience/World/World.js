import Experience from '../Experience'
import Environment from './Environment'
import Terrain from './Terrain'
import Grass from './Grass'
import Sphere from './Sphere'
import Snake from './Snake'
import Marker from './Marker'
import Raycaster from '../Raycaster'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience .scene
        this.ressources = this.experience.ressources
        
        this.movingObjects = []

        this.environment = new Environment()
        this.terrain = new Terrain()
        this.grass = new Grass(this.terrain)
        this.marker = new Marker(this.terrain)
        this.raycaster = new Raycaster(this.terrain)

        this.raycaster.on('move', (point) =>
        {
            this.marker.setPosition(point)
        })

        this.raycaster.on('click', () =>
        {
            this.marker.click()
        })

        this.ressources.on('loaded', () => 
        {
            this.snake = new Snake(this.terrain)
        })
    }

    update()
    {
        if (this.grass) {
            this.grass.update()       
        }
    }
}
