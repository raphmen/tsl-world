import * as THREE from 'three/webgpu'
import { Fn, instancedArray, instanceIndex, hash, vec2, vec3, uniform, cameraPosition, positionLocal, uv, mix, mx_noise_float } from 'three/tsl'

import Experience from '../Experience'

export default class Grass
{
    constructor(terrain)
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.debug = this.experience.debug
        this.terrain = terrain

        if(this.debug.active)
        {
            this.debugFolder = this.debug.gui.addFolder('grass')
            this.debugFolder.close()
        }

        this.setGeometry()
        this.setInstances()
        this.setMaterial()
        this.setMesh()
        this.setDebug()
    }

    setDebug()
    {
        if(this.debug.active)
        {
            const bladesFolder = this.debugFolder.addFolder("blades")
            bladesFolder.add(this.uniforms.width, 'value').min(0.001).max(0.5).step(0.001).name('width')
            bladesFolder.add(this.uniforms.height, 'value').min(0.01).max(2).step(0.01).name('height')
            bladesFolder.add(this.uniforms.taper, 'value').min(0.1).max(4).step(0.01).name('taper')

            const debugObject = {
                colorBottom: `#${this.uniforms.colorBottom.value.getHexString()}`,
                colorTop: `#${this.uniforms.colorTop.value.getHexString()}`,
                colorTint: `#${this.uniforms.colorTint.value.getHexString()}`
            }

            bladesFolder.addColor(debugObject, 'colorBottom').onChange(() => this.uniforms.colorBottom.value.set(debugObject.colorBottom))
            bladesFolder.addColor(debugObject, 'colorTop').onChange(() => this.uniforms.colorTop.value.set(debugObject.colorTop))

            const heightFolder = this.debugFolder.addFolder("height noise")
            heightFolder.add(this.uniforms.heightNoiseFrequency, 'value').min(0).max(10).step(0.01).name('heightNoiseFrequency')
            heightFolder.add(this.uniforms.heightNoiseAmplitude, 'value').min(0).max(2).step(0.01).name('heightNoiseAmplitude')

            const colorNoiseFolder = this.debugFolder.addFolder("color noise")
            colorNoiseFolder.add(this.uniforms.colorNoiseFrequency, 'value').min(0).max(10).step(0.01).name('colorNoiseFrequency')
            colorNoiseFolder.add(this.uniforms.colorNoiseAmplitude, 'value').min(0).max(2).step(0.01).name('colorNoiseAmplitude')
            colorNoiseFolder.add(this.uniforms.tintStrength, 'value').min(0).max(5).step(0.01).name('tintStrength')
            colorNoiseFolder.addColor(debugObject, 'colorTint').onChange(() => this.uniforms.colorTint.value.set(debugObject.colorTint))
        }
    }

    setGeometry()
    {
        this.geometry = new THREE.PlaneGeometry(1, 1, 1, 4)
        this.geometry.translate(0, 0.5, 0)
    }


    setInstances()
    {
        this.gridSize = 150
        this.count = this.gridSize * this.gridSize
        const spacing = this.terrain.size / this.gridSize

        this.positions = instancedArray(this.count, 'vec3')

        this.computeUpdate = Fn(() =>
        {
            const index = instanceIndex.toFloat()
            const column = index.mod(this.gridSize)
            const row = index.div(this.gridSize).floor()
            const jitter = vec2(
                hash(instanceIndex),
                hash(instanceIndex.add(this.count))
            ).sub(0.5)
            const xz = vec2(column, row).sub((this.gridSize - 1) / 2).add(jitter).mul(spacing)
            const elevation = this.terrain.elevationNode(xz)

            this.positions.element(instanceIndex).assign(vec3(xz.x, elevation, xz.y))
        })().compute(this.count)
    }

    setMaterial()
    {
        this.uniforms = {
            width: uniform(0.08),
            height: uniform(0.5),
            taper: uniform(0.8),
            colorBottom: uniform(new THREE.Color('#1f4d1a')),
            colorTop: uniform(new THREE.Color('#8fd14f')),

            heightNoiseFrequency: uniform(1.5),
            heightNoiseAmplitude: uniform(0.5),

            colorTint: uniform(new THREE.Color('#ec6d18')),
            colorNoiseFrequency: uniform(0.26),
            colorNoiseAmplitude: uniform(0.5),
            tintStrength: uniform(1.73)
        }

        this.material = new THREE.MeshBasicNodeMaterial()
        this.material.side = THREE.DoubleSide

        const bladePosition = this.positions.element(instanceIndex)

        const toCamera = cameraPosition.xz.sub(bladePosition.xz).normalize()
        const right = vec3(toCamera.y.negate(), 0, toCamera.x)

        const shape = positionLocal.y.oneMinus().pow(this.uniforms.taper)

        const localX = positionLocal.x.mul(shape).mul(this.uniforms.width)

        /** Height variation */
        const heightNoise = mx_noise_float(bladePosition.xz.mul(this.uniforms.heightNoiseFrequency).add(100))
        const heightFactor = heightNoise.mul(this.uniforms.heightNoiseAmplitude).add(1).max(0.05) // never flat or upside down

        const localY = positionLocal.y.mul(this.uniforms.height).mul(heightFactor)

        this.material.positionNode = bladePosition
            .add(right.mul(localX))
            .add(vec3(0, localY, 0))

        const color = mix(this.uniforms.colorBottom, this.uniforms.colorTop, uv().y)

        /** Color noise */
        const colorNoise = mx_noise_float(bladePosition.xz.mul(this.uniforms.colorNoiseFrequency).add(200))
        const colorFactor = colorNoise.mul(0.5).add(0.5).mul(this.uniforms.colorNoiseAmplitude).clamp(0, 1)

        const tintedColor = color.mul(this.uniforms.colorTint)
        const finalColor = mix(color, tintedColor, colorFactor.mul(this.uniforms.tintStrength))
        
        this.material.colorNode = finalColor
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.count = this.count
        this.mesh.frustumCulled = false
        this.scene.add(this.mesh)
    }

    update()
    {
        const renderer = this.experience.renderer

        if(!renderer.ready) return

        renderer.instance.compute(this.computeUpdate)
    }
}
