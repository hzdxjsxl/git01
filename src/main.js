import { WebGLWrapper, PingPongFBO } from './gl/index.js';
import { baseVertexShader, waveSimulationShader, waterRenderShader } from './shaders/index.js';

class WaterRipple {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.webgl = new WebGLWrapper(this.canvas);
        
        this.simulationSize = 512;
        this.damping = 0.98;
        this.waveSpeed = 0.5;
        this.dropRadius = 0.03;
        this.dropStrength = 0.5;
        
        this.dropQueue = [];
        this.time = 0;
        
        this.init();
    }
    
    init() {
        this.resize();
        this.createPrograms();
        this.createBuffers();
        this.createFBOs();
        this.setupEventListeners();
        this.animate();
    }
    
    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
    }
    
    createPrograms() {
        this.simulationProgram = this.webgl.createProgram(
            baseVertexShader,
            waveSimulationShader
        );
        
        this.renderProgram = this.webgl.createProgram(
            baseVertexShader,
            waterRenderShader
        );
    }
    
    createBuffers() {
        const gl = this.webgl.gl;
        
        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);
        
        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);
        
        this.positionBuffer = this.webgl.createBuffer(gl.ARRAY_BUFFER, positions);
        this.texCoordBuffer = this.webgl.createBuffer(gl.ARRAY_BUFFER, texCoords);
    }
    
    createFBOs() {
        this.heightMapFBO = new PingPongFBO(
            this.webgl,
            this.simulationSize,
            this.simulationSize
        );
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.resize();
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;
            
            this.dropQueue.push({ x, y, strength: this.dropStrength * 0.5 });
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;
            
            this.dropQueue.push({ x, y, strength: this.dropStrength * 2 });
        });
        
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;
            
            this.dropQueue.push({ x, y, strength: this.dropStrength * 1.5 });
        });
    }
    
    setupVertexAttributes(program) {
        const gl = this.webgl.gl;
        
        const positionLocation = this.webgl.getAttribLocation(program, 'a_position');
        const texCoordLocation = this.webgl.getAttribLocation(program, 'a_texCoord');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLocation);
        gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
    }
    
    simulateStep() {
        const gl = this.webgl.gl;
        const program = this.simulationProgram;
        
        this.webgl.useProgram(program);
        this.setupVertexAttributes(program);
        
        this.webgl.bindFramebuffer(
            this.heightMapFBO.getCurrentFramebuffer(),
            this.simulationSize,
            this.simulationSize
        );
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.heightMapFBO.getCurrentTexture());
        this.webgl.setUniform1i(program, 'u_currentHeight', 0);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.heightMapFBO.getPreviousTexture());
        this.webgl.setUniform1i(program, 'u_previousHeight', 1);
        
        this.webgl.setUniform2f(program, 'u_resolution', this.simulationSize, this.simulationSize);
        this.webgl.setUniform1f(program, 'u_damping', this.damping);
        this.webgl.setUniform1f(program, 'u_waveSpeed', this.waveSpeed);
        
        const drop = this.dropQueue.shift();
        if (drop) {
            this.webgl.setUniform2f(program, 'u_dropPosition', drop.x, drop.y);
            this.webgl.setUniform1f(program, 'u_dropRadius', this.dropRadius);
            this.webgl.setUniform1f(program, 'u_dropStrength', drop.strength);
            this.webgl.setUniform1f(program, 'u_hasDrop', 1.0);
        } else {
            this.webgl.setUniform1f(program, 'u_hasDrop', 0.0);
        }
        
        this.webgl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        this.heightMapFBO.swap();
    }
    
    render() {
        const gl = this.webgl.gl;
        const program = this.renderProgram;
        
        this.webgl.useProgram(program);
        this.setupVertexAttributes(program);
        
        this.webgl.bindFramebuffer(null);
        
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.heightMapFBO.getCurrentTexture());
        this.webgl.setUniform1i(program, 'u_heightMap', 0);
        
        this.webgl.setUniform2f(program, 'u_resolution', this.simulationSize, this.simulationSize);
        this.webgl.setUniform1f(program, 'u_time', this.time);
        
        this.webgl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    
    animate() {
        this.time += 0.016;
        
        for (let i = 0; i < 2; i++) {
            this.simulateStep();
        }
        
        this.render();
        
        requestAnimationFrame(() => this.animate());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WaterRipple();
});
