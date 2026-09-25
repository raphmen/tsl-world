import { Fn, uniform, vec2, time, cos, sin, mx_noise_float } from 'three/tsl'
import Experience from '../Experience'

export default class Wind
{
    constructor()
    {
        this.experience = new Experience()
        this.debug = this.experience.debug

        if(this.debug.active)
        {
            this.debugFolder = this.debug.gui.addFolder('wind')
            this.debugFolder.close()
        }

        this.uniforms = {
            angle: uniform(0.5),
            speed: uniform(1.5),
            frequency: uniform(0.4),
            strength: uniform(0.4)
        }

        this.offsetNode = Fn(([xz]) =>
        {
            const direction = vec2(cos(this.uniforms.angle), sin(this.uniforms.angle))

            const scroll = direction.mul(time.mul(this.uniforms.speed))
            const noise = mx_noise_float(xz.sub(scroll).mul(this.uniforms.frequency).add(300)) // offset = different noise from terrain / grass

            return direction.mul(noise).mul(this.uniforms.strength)
        })

        this.setDebug()
    }

    setDebug()
    {
        if(this.debug.active)
        {
            this.debugFolder.add(this.uniforms.angle, 'value').min(-Math.PI).max(Math.PI).step(0.01).name('angle')
            this.debugFolder.add(this.uniforms.speed, 'value').min(0).max(10).step(0.01).name('speed')
            this.debugFolder.add(this.uniforms.frequency, 'value').min(0).max(3).step(0.01).name('frequency')
            this.debugFolder.add(this.uniforms.strength, 'value').min(0).max(1).step(0.01).name('strength')
        }
    }
}
