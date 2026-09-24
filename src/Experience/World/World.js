import Experience from '../Experience'
import Environment from './Environment'
import Terrain from './Terrain'
import Grass from './Grass'
import Sphere from './Sphere'
import Snake from './Snake'

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
