import Experience from '../Experience'
import Environment from './Environment'
import Terrain from './Terrain'
import Grass from './Grass'
import Sphere from './Sphere'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience .scene
        this.ressources = this.experience.ressources

        this.environment = new Environment()
        this.terrain = new Terrain()
        this.grass = new Grass(this.terrain)
    }

    update()
    {
        this.grass.update()
    }
}
