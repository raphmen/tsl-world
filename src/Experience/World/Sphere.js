import * as THREE from 'three/webgpu'
import { color, mix, normalView, time, sin } from 'three/tsl'

import Experience from '../Experience'

export default class Sphere
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene

        this.setGeometry()
        this.setMaterial()
        this.setMesh()
    }

    setGeometry()
    {
        this.geometry = new THREE.BoxGeometry(1, 1)
    }

    setMaterial()
    {
        this.material = new THREE.MeshBasicNodeMaterial()

        const fresnel = normalView.z.oneMinus().pow(2)
        const baseColor = mix(color('#1e3a8a'), color('#f472b6'), sin(time).mul(0.5).add(0.5))
        this.material.colorNode = mix(baseColor, color('#ffffff'), fresnel)
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.scene.add(this.mesh)
    }
}
