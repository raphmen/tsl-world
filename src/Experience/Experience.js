import * as THREE from 'three/webgpu'

import Sizes from "./Utils/Sizes.js"
import Time from "./Utils/Time.js"
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import World from './World/World.js'
import Debug from './Utils/Debug.js'
import Ressources from './Utils/Ressources.js'

import sources from './sources.js'

let instance = null

export default class Experience 
{
    constructor(canvas)
    {
        if(instance)
        {
            return instance
        }

        instance = this

        // Global acces
        window.experience = this

        // Options
        this.canvas = canvas

        // Set up
        this.debug = new Debug()
        this.sizes = new Sizes()
        this.time = new Time()
        this.scene = new THREE.Scene()
        this.ressources = new Ressources(sources)
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.world = new World()

        // Sizes resize event
        this.sizes.on('resize', () => {
            this.resize()
        })

        // Time tick event
        this.time.on('tick', () => {
            this.update()
        })
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
    }

    update()
    {
        this.camera.update()
        this.world.update()
        this.renderer.update()
    }

    destroy()
    {
        // Stop listenning to the events
        this.sizes.off('resize')
        this.time.off('tick')

        // Traverse the whole scene
        // Meshes (geo, mat, values...)
        this.scene.traverse((child) => 
        {
            if(child instanceof THREE.Mesh)
            {
                child.geometry.dispose()

                for(const key in child)
                {
                    const value = child.material[key]

                    if(value && typeof value.dispose === 'function')
                    {
                        value.dispose()
                    }
                }
            }
        })

        // OrbitControls
        this.camera.controls.dispose()
        
        // Renderer
        this.renderer.instance.dispose()

        // Post-processing
        // if using post-processing, need to dispose EffectComposer, its WebGLRenderTarget and used passes

        // Lil-gui
        if (this.debug.active) 
        {
            this.debug.gui.dispose()    
        }
    }
}