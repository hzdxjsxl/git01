export class PingPongFBO {
    constructor(webgl, width, height) {
        this.webgl = webgl;
        this.width = width;
        this.height = height;
        this.currentIndex = 0;
        
        this.textures = [];
        this.framebuffers = [];
        
        this.init();
    }
    
    init() {
        for (let i = 0; i < 2; i++) {
            const texture = this.webgl.createTexture(this.width, this.height);
            const framebuffer = this.webgl.createFramebuffer(texture);
            
            this.textures.push(texture);
            this.framebuffers.push(framebuffer);
        }
    }
    
    getCurrentTexture() {
        return this.textures[this.currentIndex];
    }
    
    getPreviousTexture() {
        return this.textures[this.currentIndex === 0 ? 1 : 0];
    }
    
    getCurrentFramebuffer() {
        return this.framebuffers[this.currentIndex];
    }
    
    swap() {
        this.currentIndex = this.currentIndex === 0 ? 1 : 0;
    }
    
    resize(width, height) {
        this.width = width;
        this.height = height;
        
        for (let i = 0; i < 2; i++) {
            const gl = this.webgl.gl;
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
    }
}
