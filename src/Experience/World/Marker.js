import * as THREE from 'three/webgpu'
import gsap from 'gsap'
import { uniform, positionLocal, vec3, uv, smoothstep } from 'three/tsl'

import Experience from '../Experience'

export default class Marker
{
    constructor(terrain)
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.debug = this.experience.debug
        this.canvas = this.experience.canvas
        this.terrain = terrain

        this.isShown = false

        if(this.debug.active)
        {
            this.debugFolder = this.debug.gui.addFolder('marker')
            this.debugFolder.close()
        }

        this.setUniforms()
        this.setGeometry()
        this.setMaterial()
        this.setMesh()
        this.setDebug()
    }

    setUniforms()
    {
        this.uniforms = {
            position: uniform(new THREE.Vector2(0, 0)),
            size: uniform(0.5),
            lift: uniform(0.5),
            thickness: uniform(0.32),
            softness: uniform(0.05),
            color: uniform(new THREE.Color('#ffffff')),
            reveal: uniform(0)
        }
    }

    setGeometry()
    {
        this.geometry = new THREE.PlaneGeometry(1, 1, 32, 32)
        this.geometry.rotateX(-Math.PI * 0.5)
    }

    setMaterial()
    {
        this.material = new THREE.MeshBasicNodeMaterial()
        this.material.transparent = true
        this.material.depthWrite = false
        this.material.side = THREE.DoubleSide

        const xz = positionLocal.xz.mul(this.uniforms.size.mul(this.uniforms.reveal)).add(this.uniforms.position)
        const elevation = this.terrain.elevationNode(xz).add(this.uniforms.lift)

        this.material.positionNode = vec3(xz.x, elevation, xz.y)

        const distance = uv().sub(0.5).length().mul(2)

        const outer = smoothstep(this.uniforms.softness.oneMinus(), 1, distance).oneMinus()
        const innerEdge = this.uniforms.thickness.oneMinus()
        const inner = smoothstep(innerEdge.sub(this.uniforms.softness), innerEdge, distance)

        this.material.colorNode = this.uniforms.color
        this.material.opacityNode = outer.mul(inner).mul(this.uniforms.reveal)
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.frustumCulled = false
        this.mesh.visible = false
        this.scene.add(this.mesh)
    }

    setPosition(point)
    {
        if(!point)
        {
            this.hide()
            return
        }

        this.show()
        this.uniforms.position.value.set(point.x, point.z)
    }

    show()
    {
        if(this.isShown) return
        this.isShown = true

        this.canvas.style.cursor = 'none'
        this.mesh.visible = true

        gsap.to(this.uniforms.reveal, { value: 1, duration: 0.4, ease: 'back.out(4)', overwrite: true })
    }

    hide()
    {
        if(!this.isShown) return
        this.isShown = false

        this.canvas.style.cursor = ''

        gsap.to(this.uniforms.reveal, {
            value: 0,
            duration: 0.25,
            ease: 'power3.in',
            overwrite: true,
            onComplete: () => { this.mesh.visible = false }
        })
    }

    click()
    {
        if(!this.isShown) return

        gsap.killTweensOf(this.uniforms.reveal)
        gsap.timeline()
            .to(this.uniforms.reveal, { value: 0.7, duration: 0.1, ease: 'power2.out' })
            .to(this.uniforms.reveal, { value: 1, duration: 0.7, ease: 'elastic.out(1, 0.35)' })
    }

    setDebug()
    {
        if(!this.debug.active) return

        this.debugFolder.add(this.uniforms.size, 'value').min(0.05).max(3).step(0.01).name('size')
        this.debugFolder.add(this.uniforms.lift, 'value').min(0).max(1).step(0.001).name('lift')
        this.debugFolder.add(this.uniforms.thickness, 'value').min(0).max(1).step(0.001).name('thickness')
        this.debugFolder.add(this.uniforms.softness, 'value').min(0).max(0.5).step(0.001).name('softness')

        const debugObject = {
            color: `#${this.uniforms.color.value.getHexString()}`
        }

        this.debugFolder.addColor(debugObject, 'color').onChange(() => this.uniforms.color.value.set(debugObject.color))
    }
}
