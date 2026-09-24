import * as THREE from 'three/webgpu'

import Experience from '../Experience'

export default class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.debug = this.experience.debug

        if(this.debug.active)
        {
            this.debugFolder = this.debug.gui.addFolder('environment')
            this.debugFolder.close()
        }

        this.setLights()
        this.setDebug()
    }

    setLights()
    {
        // Ambient
        this.ambient = new THREE.AmbientLight(0xFFFFFF, 1)
        this.scene.add(this.ambient)

        // Directional
        this.directional = new THREE.DirectionalLight(0xFFFFFF, 3)
        this.directional.position.set(5, 10, 5)
        this.directional.castShadow = true
        this.scene.add(this.directional)
    }

    setDebug()
    {
        if(this.debug.active)
        {
            // Ambient
            const ambientFolder = this.debugFolder.addFolder('ambient')
            ambientFolder.add(this.ambient, 'intensity').min(0).max(10).step(0.001)
            ambientFolder.addColor(this.ambient, 'color')

            // Directional
            const directionalFolder = this.debugFolder.addFolder('directional')
            directionalFolder.add(this.directional, 'intensity').min(0).max(10).step(0.001)
            directionalFolder.addColor(this.directional, 'color')
            directionalFolder.add(this.directional.position, 'x').min(-20).max(20).step(0.01).name('positionX')
            directionalFolder.add(this.directional.position, 'y').min(-20).max(20).step(0.01).name('positionY')
            directionalFolder.add(this.directional.position, 'z').min(-20).max(20).step(0.01).name('positionZ')
        }
    }
}
