import Experience from '../Experience'
import Sphere from './Sphere'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience .scene
        this.ressources = this.experience.ressources

        // Doesn't need any ressources
        this.sphere = new Sphere()

        // Wait for ressources
        // this.ressources.on('loaded', () => 
        // {
        //     // Setup
        // })

    }

    update()
    {
        if(this.fox){
            this.fox.update()
        }
    }
}
