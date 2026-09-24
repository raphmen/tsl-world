import * as THREE from 'three/webgpu'
import { Fn, uniform, uniformArray, positionLocal, positionGeometry, normalGeometry, normalLocal, vec3, mix, cross, normalize } from 'three/tsl'

import Experience from '../Experience'

export default class Snake
{
    constructor(terrain)
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.debug = this.experience.debug
        this.terrain = terrain

        if(this.debug.active)
        {
            this.debugFolder = this.debug.gui.addFolder('snake')
            this.debugFolder.close()
        }

        this.setUniforms()
        this.setModel()
        this.setCurve()
        this.setMaterial()
        this.setMesh()
        this.setDebug()
    }

    setUniforms()
    {
        this.uniforms = {
            scale: uniform(0.26),
            lift: uniform(0) // how much to raise the snake so its belly touches the ground, set in updateCurve
        }
    }

    // take the blender model (a group with one mesh per material) and measure it
    setModel()
    {
        this.model = this.experience.ressources.items.snakeModel.scene
        const box = new THREE.Box3().setFromObject(this.model) // box around all the pieces : min and max of x, y, z

        this.modelMinY = box.min.y // tail end
        this.modelLength = box.max.y - this.modelMinY // tail → head
        this.modelBelly = -box.min.z // distance from the middle of the model to its lowest point (belly side)
    }

    setCurve()
    {
        this.controlCount = 7 // handles
        this.sampleCount = 100 // points along curve
        this.length = 4.65 // shape of the S only : length vs side swing, the real size comes from the model
        this.amplitude = 0.6

        this.controlPoints = Array.from({ length: this.controlCount }, () => new THREE.Vector3())
        this.curve = new THREE.CatmullRomCurve3(this.controlPoints)

        // samples : N positions along the curve
        this.samples = Array.from({ length: this.sampleCount }, () => new THREE.Vector3())
        this.samplesUniform = uniformArray(this.samples, 'vec3') // array of 100 vec3

        this.updateCurve()
    }

    // place points in a S shape, then overwrite control points & samples arrays
    updateCurve()
    {
        for(let i = 0; i < this.controlCount; i++)
        {
            const t = i / (this.controlCount - 1) // get each point
            const x = Math.sin(t * Math.PI * 2) * this.amplitude // sin waves every 2π, so multiply by 2π to get one sin wave between 0-1
            const z = (t - 0.5) * this.length // t - 0.5 to center, and * length to strech to -1 - 1
            this.controlPoints[i].set(x, 0, z) // set the positions and the CatmullRomCurve3 updates instantly
        }
        this.curve.updateArcLengths() // the curve caches its length, so tell it the points moved

        const snakeLength = this.modelLength * this.uniforms.scale.value // snake length in the scene (model length × scale)
        const resize = snakeLength / this.curve.getLength() // calculate curve ratio (to fit snake length)

        for(const point of this.controlPoints)
            point.multiplyScalar(resize) // apply ratio to every point = resize the curve
        this.curve.updateArcLengths() // points moved, so re-measure the curve length

        // walks along the curve and create 100 points (vec3) at equal distances from each other
        const points = this.curve.getSpacedPoints(this.sampleCount - 1) // 99 gaps means 100 points.

        for(let i = 0; i < this.sampleCount; i++)
            this.samples[i].copy(points[i]) // moves positions to the array

        this.uniforms.lift.value = this.modelBelly * this.uniforms.scale.value // belly depth at the scaled size
    }

    setMaterial()
    {
        // replace a point Y with the terrain height
        const withElevation = (point) => vec3(point.x, this.terrain.elevationNode(point.xz), point.z)

        // runs once per model vertex, built once and shared by every piece of the model
        this.positionNode = Fn(() =>
        {
            /** Vertex progress on model geometry */
            // take the y pos of the vertex in the model and turn it into a progress value between 0-1 (tail 0, head 1)
            const progress = positionGeometry.y.sub(this.modelMinY).div(this.modelLength)

            /** Vertex progress between 2 curve samples */
            const segment = progress.mul(this.sampleCount - 1) // turn progress 0 → 1 into a sample number 0 → 99
            const index = segment.floor().min(this.sampleCount - 2) // sample just before the vertex, capped at 98 with .min so index + 1 stays inside the array
            const segmentProgress = segment.sub(index) // how far the vertex is between sample index and index + 1 (0 → 1)
            
            /** Before and after samples positions (on terrain) */
            // the two samples around the vertex, glued to the terrain (toInt because array index must be a whole number)
            const start = withElevation(this.samplesUniform.element(index.toInt()))
            const end = withElevation(this.samplesUniform.element(index.toInt().add(1)))

            /** Center of the ring */
            const centerXZ = mix(start.xz, end.xz, segmentProgress) // vec2 : x and z pos of the ring center, the one of the vertex between start and end at segmentProgress
            const center = vec3(centerXZ.x, this.terrain.elevationNode(centerXZ).add(this.uniforms.lift).add(0.01), centerXZ.y) // and create the ring center pos with x & z and the y on the terrain (height + lift + little space)

            /** Orientation of the snake in the segment */
            const tangent = normalize(end.sub(start)) // forward : direction from start to end, normalized so its length is 1 (le vecteur longe la pente, et se penche)
            const side = normalize(cross(tangent, vec3(0, 1, 0))) // left/right : perpendicular to forward and to world up, so always horizontal
            const up = cross(side, tangent) // snake's own up : perpendicular to forward and side (se penche en arrière avec la pente)

            /** Rotate from cylinder to snake */
            // swap the cylinder axes for the snake ones by multiplying the vector number to each matching snake arrow, then adding them up (adding 3 vectors creates a new one : normal cylinder vector → snake vector)
            const toCurveFrame = (vector) =>
                side.mul(vector.x)          // cylinder x (right)   →  side     (snake's right)
                .add(up.mul(vector.z))      // cylinder z (front)   →  up       (snake's up)
                .add(tangent.mul(vector.y)) // cylinder y (height)  →  tangent  (snake's forward)

            /** Turn the normals the same way so light hits the snake correctly */
            normalLocal.assign(toCurveFrame(normalGeometry)) // .assign replaces the normal the lighting uses with the rotated one

            // vector from the center to our vertex, in the upright model's axes (y = 0 because center already handles the position along the snake, scaled to the curve size)
            const ring = vec3(positionGeometry.x, 0, positionGeometry.z).mul(this.uniforms.scale)
            
            // then toCurveFrame(ring) rotates it to match the snake's direction (snake center to surface)
            // and add the vector to the center pos to get our vertex pos
            return center.add(toCurveFrame(ring))
        })()
    }

    // give each piece of the model a node material with its blender color and our shared bending
    setMesh()
    {
        this.model.traverse((child) =>
        {
            if(!child.isMesh) return

            const blenderMaterial = child.material
            child.material = new THREE.MeshStandardNodeMaterial({
                color: blenderMaterial.color,
                roughness: blenderMaterial.roughness,
                metalness: blenderMaterial.metalness,
                side: blenderMaterial.side
            })
            child.material.positionNode = this.positionNode

            child.frustumCulled = false
            child.castShadow = true
        })

        this.scene.add(this.model)
    }

    setDebug()
    {
        if(!this.debug.active) return

        this.debugFolder.add(this.uniforms.scale, 'value').min(0.01).max(1).step(0.001).name('scale').onChange(() => this.updateCurve())
        this.debugFolder.add(this, 'length').min(0.1).max(10).step(0.01).onChange(() => this.updateCurve())
        this.debugFolder.add(this, 'amplitude').min(0).max(3).step(0.01).onChange(() => this.updateCurve())
    }
}
