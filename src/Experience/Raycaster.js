import * as THREE from 'three/webgpu'

import Experience from './Experience'
import EventEmitter from './Utils/EventEmitter'

export default class Raycaster extends EventEmitter
{
    constructor(terrain)
    {
        super()

        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.camera = this.experience.camera
        this.canvas = this.experience.canvas
        this.terrain = terrain

        this.instance = new THREE.Raycaster()
        this.pointer = new THREE.Vector2()
        this.pointerDown = new THREE.Vector2()

        this.setEvents()
    }

    setEvents()
    {
        this.canvas.addEventListener('pointerdown', (event) =>
        {
            this.pointerDown.set(event.clientX, event.clientY)
        })

        this.canvas.addEventListener('pointerup', (event) =>
        {
            const distance = this.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY))
            if(distance > 5) return

            this.updatePointer(event)
            const point = this.cast()
            if(!point) return

            console.log('terrain click', point.x.toFixed(2), point.y.toFixed(2), point.z.toFixed(2))
            this.trigger('click', [point])
        })

        this.canvas.addEventListener('pointermove', (event) =>
        {
            this.updatePointer(event)
            this.trigger('move', [this.cast()])
        })

        this.canvas.addEventListener('pointerleave', () =>
        {
            this.trigger('move', [null])
        })
    }

    // pixels (0 → width, 0 → height, y going down) to NDC (-1 → 1, y going up)
    updatePointer(event)
    {
        this.pointer.x = (event.clientX / this.sizes.width) * 2 - 1
        this.pointer.y = - (event.clientY / this.sizes.height) * 2 + 1
    }

    cast()
    {
        this.instance.setFromCamera(this.pointer, this.camera.instance)

        const intersects = this.instance.intersectObject(this.terrain.mesh)

        return intersects.length ? intersects[0].point : null
    }
}
